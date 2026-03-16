import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { connectToDatabase, User, Subscription } from "@repo/db";
import {
  verifyPaymentReceipt,
  PaymentVerificationError,
} from "../../../../lib/payment-kit-verifier";
import {
  verifySolPayment,
  SolanaPaymentError,
} from "../../../../lib/solana-verifier";

const SUBSCRIPTION_PRICE_USD = parseFloat(
  process.env.SUBSCRIPTION_PRICE_USD ?? "25"
);
const NETWORK = process.env.NEXT_PUBLIC_PAYMENT_KIT_NETWORK ?? "mainnet";
const TESTNET_MIST = BigInt(10_000_000);   // 0.01 SUI
const TESTNET_LAMPORTS = 10_000_000;       // 0.01 SOL
/** 2% slippage tolerance for price movement between tx build and verification */
const SLIPPAGE = 0.02;

const PLATFORM_SUI_WALLET = process.env.NEXT_PUBLIC_SUI_WALLET!;
const PLATFORM_SOL_WALLET = process.env.NEXT_PUBLIC_SOLANA_WALLET!;

async function fetchPrices(): Promise<{ suiPriceUsd: number; solPriceUsd: number }> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=sui,solana&vs_currencies=usd",
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(`CoinGecko returned ${res.status}`);
  const data = await res.json();
  const suiPriceUsd: number = data?.sui?.usd;
  const solPriceUsd: number = data?.solana?.usd;
  if (!suiPriceUsd || suiPriceUsd <= 0) throw new Error("Invalid SUI price");
  if (!solPriceUsd || solPriceUsd <= 0) throw new Error("Invalid SOL price");
  return { suiPriceUsd, solPriceUsd };
}

async function getMinimumMist(): Promise<{ minimumMist: bigint; suiAmount: number }> {
  if (NETWORK === "testnet") return { minimumMist: TESTNET_MIST, suiAmount: 0.01 };
  const { suiPriceUsd } = await fetchPrices();
  const suiAmount = SUBSCRIPTION_PRICE_USD / suiPriceUsd;
  const minimumMist = BigInt(Math.floor(suiAmount * (1 - SLIPPAGE) * 1_000_000_000));
  return { minimumMist, suiAmount };
}

async function getMinimumLamports(): Promise<{ minimumLamports: number; solAmount: number }> {
  if (NETWORK === "testnet") return { minimumLamports: TESTNET_LAMPORTS, solAmount: 0.01 };
  const { solPriceUsd } = await fetchPrices();
  const solAmount = SUBSCRIPTION_PRICE_USD / solPriceUsd;
  const minimumLamports = Math.floor(solAmount * (1 - SLIPPAGE) * 1_000_000_000);
  return { minimumLamports, solAmount };
}

/** Shared helper: find/extend active subscription and return expiresAt */
async function resolveExpiry(userId: any) {
  const now = new Date();
  const active = await Subscription.findOne({
    userId,
    status: "active",
    expiresAt: { $gt: now },
  });
  const base = active && active.expiresAt > now ? active.expiresAt : now;
  const expiresAt = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (active) {
    active.status = "expired";
    await active.save();
  }
  return { now, expiresAt };
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();

    // ── SUI PaymentKit flow ─────────────────────────────────────────────────
    if (body.txDigest) {
      const { txDigest, nonce, walletAddress } = body as {
        txDigest: string;
        nonce: string;
        walletAddress: string;
      };

      if (!txDigest || !nonce || !walletAddress) {
        return NextResponse.json(
          { error: "Missing required fields: txDigest, nonce, walletAddress" },
          { status: 400 }
        );
      }

      await connectToDatabase();

      const existingByNonce = await Subscription.findOne({ paymentNonce: nonce });
      if (existingByNonce) {
        return NextResponse.json({ error: "Payment nonce already used" }, { status: 409 });
      }

      let minimumMist: bigint, suiAmount: number;
      try {
        ({ minimumMist, suiAmount } = await getMinimumMist());
      } catch (err: any) {
        return NextResponse.json(
          { error: `Unable to fetch SUI price: ${err.message}` },
          { status: 503 }
        );
      }

      try {
        await verifyPaymentReceipt(txDigest, nonce, minimumMist, PLATFORM_SUI_WALLET);
      } catch (err) {
        if (err instanceof PaymentVerificationError) {
          return NextResponse.json(
            { error: `Payment verification failed: ${(err as Error).message}` },
            { status: 422 }
          );
        }
        throw err;
      }

      const user = await User.findOne({ email: session.user.email });
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

      const { now, expiresAt } = await resolveExpiry(user._id);

      const subscription = await Subscription.create({
        userId: user._id,
        plan: "pro",
        status: "active",
        txDigest,
        paymentNonce: nonce,
        walletAddress,
        paidAmount: suiAmount,
        paidCurrency: "SUI",
        activatedAt: now,
        expiresAt,
      });

      return NextResponse.json({
        success: true,
        subscription: {
          id: subscription._id,
          plan: subscription.plan,
          status: subscription.status,
          expiresAt: subscription.expiresAt,
        },
      });
    }

    // ── SOL flow ────────────────────────────────────────────────────────────
    if (body.txHash) {
      const { txHash, walletAddress, nonce } = body as {
        txHash: string;
        walletAddress: string;
        nonce: string;
      };

      if (!txHash || !walletAddress || !nonce) {
        return NextResponse.json(
          { error: "Missing required fields: txHash, walletAddress, nonce" },
          { status: 400 }
        );
      }

      await connectToDatabase();

      // Fast duplicate check before hitting the RPC
      const existing = await Subscription.findOne({ txHash });
      if (existing) {
        return NextResponse.json(
          { error: "This transaction has already been used" },
          { status: 409 }
        );
      }

      // Compute the minimum acceptable lamports server-side
      let minimumLamports: number, solAmount: number;
      try {
        ({ minimumLamports, solAmount } = await getMinimumLamports());
      } catch (err: any) {
        return NextResponse.json(
          { error: `Unable to fetch SOL price: ${err.message}` },
          { status: 503 }
        );
      }

      // On-chain verification: recipient, amount, and memo nonce
      try {
        await verifySolPayment(txHash, PLATFORM_SOL_WALLET, minimumLamports, nonce);
      } catch (err) {
        if (err instanceof SolanaPaymentError) {
          return NextResponse.json(
            { error: `Payment verification failed: ${(err as Error).message}` },
            { status: 422 }
          );
        }
        throw err;
      }

      const user = await User.findOne({ email: session.user.email });
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

      const { now, expiresAt } = await resolveExpiry(user._id);

      const subscription = await Subscription.create({
        userId: user._id,
        plan: "pro",
        status: "active",
        txHash,
        walletAddress,
        paidAmount: solAmount,
        paidCurrency: "SOL",
        activatedAt: now,
        expiresAt,
      });

      return NextResponse.json({
        success: true,
        subscription: {
          id: subscription._id,
          plan: subscription.plan,
          status: subscription.status,
          expiresAt: subscription.expiresAt,
        },
      });
    }

    return NextResponse.json(
      { error: "Invalid request: provide txDigest (SUI) or txHash (SOL)" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Subscription activation error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
