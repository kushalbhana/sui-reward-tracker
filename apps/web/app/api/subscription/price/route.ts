import { NextResponse } from "next/server";

const SUBSCRIPTION_PRICE_USD = parseFloat(
  process.env.SUBSCRIPTION_PRICE_USD ?? "25"
);

const NETWORK = process.env.NEXT_PUBLIC_PAYMENT_KIT_NETWORK ?? "mainnet";

// On testnet SUI/SOL have no market value — use nominal amounts for easy testing
const TESTNET_SUI_MIST = BigInt(10_000_000); // 0.01 SUI
const TESTNET_SOL_LAMPORTS = 10_000_000;     // 0.01 SOL

export async function GET() {
  try {
    if (NETWORK === "testnet") {
      return NextResponse.json({
        usdAmount: SUBSCRIPTION_PRICE_USD,
        isTestnet: true,
        sui: {
          priceUsd: null,
          amount: 0.01,
          mistAmount: TESTNET_SUI_MIST.toString(),
        },
        sol: {
          priceUsd: null,
          amount: 0.01,
          lamports: TESTNET_SOL_LAMPORTS,
        },
      });
    }

    // Fetch both SUI and SOL prices in a single CoinGecko request
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=sui,solana&vs_currencies=usd",
      { next: { revalidate: 60 } }
    );

    if (!res.ok) {
      throw new Error(`CoinGecko returned ${res.status}`);
    }

    const data = await res.json();

    const suiPriceUsd: number = data?.sui?.usd;
    const solPriceUsd: number = data?.solana?.usd;

    if (!suiPriceUsd || suiPriceUsd <= 0)
      throw new Error("Invalid SUI price received from CoinGecko");
    if (!solPriceUsd || solPriceUsd <= 0)
      throw new Error("Invalid SOL price received from CoinGecko");

    const suiAmount = SUBSCRIPTION_PRICE_USD / suiPriceUsd;
    const mistAmount = BigInt(Math.ceil(suiAmount * 1_000_000_000));

    const solAmount = SUBSCRIPTION_PRICE_USD / solPriceUsd;
    const lamports = Math.ceil(solAmount * 1_000_000_000);

    return NextResponse.json({
      usdAmount: SUBSCRIPTION_PRICE_USD,
      isTestnet: false,
      sui: {
        priceUsd: suiPriceUsd,
        amount: suiAmount,
        mistAmount: mistAmount.toString(),
      },
      sol: {
        priceUsd: solPriceUsd,
        amount: solAmount,
        lamports,
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch prices:", error);
    return NextResponse.json(
      { error: `Failed to fetch prices: ${error.message}` },
      { status: 503 }
    );
  }
}
