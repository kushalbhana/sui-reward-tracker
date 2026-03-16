/**
 * Server-side PaymentKit receipt verifier.
 *
 * Uses the @mysten/sui JSON-RPC client (Next.js / Node.js compatible, no gRPC).
 * Fetches the transaction block by digest, finds the PaymentReceipt event
 * emitted by PaymentKit, and cryptographically validates all fields.
 *
 * SERVER ONLY — do not import this in browser code.
 */
import { SuiJsonRpcClient as SuiClient, getJsonRpcFullnodeUrl as getFullnodeUrl } from "@mysten/sui/jsonRpc";
import bs58 from "bs58";

function getSuiDigest(txDigestOrHash: string): string {
  if (!txDigestOrHash.startsWith('0x') && txDigestOrHash.length >= 43) {
    return txDigestOrHash; // Already base58
  }
  const cleanHex = txDigestOrHash.replace('0x', '');
  return bs58.encode(Buffer.from(cleanHex, 'hex'));
}

/** Raw shape of the PaymentReceipt event from the smart contract */
interface RawPaymentReceipt {
  payment_type: "Registry" | "Ephemeral";
  nonce: string;
  /** Amount as decimal string (e.g. "25000000000") — field is `payment_amount` in the Move struct */
  payment_amount: string;
  receiver: string;
  /** Normalised coin type, e.g. "0x2::sui::SUI" */
  coin_type: string;
  timestamp_ms: string;
}

export class PaymentVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentVerificationError";
  }
}

const NETWORK = (process.env.NEXT_PUBLIC_PAYMENT_KIT_NETWORK ?? "mainnet") as
  | "mainnet"
  | "testnet";

// Lazily-created singleton SuiClient
let _suiClient: SuiClient | null = null;

function getSuiClient(): SuiClient {
  if (!_suiClient) {
    const url =
      process.env.SUI_RPC_URL ?? getFullnodeUrl(NETWORK);
    _suiClient = new SuiClient({ url, network: NETWORK });
  }
  return _suiClient;
}

/**
 * Fetches `txDigest` from the Sui RPC and verifies the embedded
 * `PaymentReceipt` event against the expected payment parameters.
 *
 * `minimumAmountMist` is a floor check (not exact) to accommodate the small
 * price fluctuation between when the frontend builds the tx and when the
 * server verifies it.
 *
 * @throws {PaymentVerificationError} if the receipt is missing or fields mismatch.
 */
export async function verifyPaymentReceipt(
  txDigest: string,
  expectedNonce: string,
  minimumAmountMist: bigint,
  expectedReceiver: string
): Promise<RawPaymentReceipt> {
  const client = getSuiClient();
  const digest = getSuiDigest(txDigest);

  let txBlock: Awaited<ReturnType<typeof client.getTransactionBlock>>;
  try {
    txBlock = await client.getTransactionBlock({
      digest,
      options: { showEvents: true },
    });
  } catch (err: any) {
    throw new PaymentVerificationError(
      `Failed to fetch transaction ${txDigest}: ${err.message}`
    );
  }

  const events = txBlock.events ?? [];
  const receiptEvent = events.find((e) => e.type.includes("PaymentReceipt"));

  if (!receiptEvent) {
    throw new PaymentVerificationError(
      `No PaymentReceipt event found in transaction ${txDigest}`
    );
  }

  const receipt = receiptEvent.parsedJson as RawPaymentReceipt;

  // --- Validate nonce ---
  if (receipt.nonce !== expectedNonce) {
    throw new PaymentVerificationError(
      `Nonce mismatch: expected "${expectedNonce}", got "${receipt.nonce}"`
    );
  }

  // --- Validate amount (minimum check with 2% slippage tolerance) ---
  const onChainAmount = BigInt(receipt.payment_amount);
  if (onChainAmount < minimumAmountMist) {
    throw new PaymentVerificationError(
      `Insufficient payment: minimum ${minimumAmountMist} MIST required, got ${onChainAmount} MIST`
    );
  }

  // --- Validate coin type ---
  // The RPC may return the address with or without 0x prefix and with leading zeros,
  // e.g. "0000000000000000000000000000000000000000000000000000000000000002::sui::SUI"
  // Normalise by ensuring 0x prefix, stripping leading zeros, then lowercasing.
  const rawCoinType = receipt.coin_type.toLowerCase();
  const withPrefix = rawCoinType.startsWith("0x") ? rawCoinType : `0x${rawCoinType}`;
  const [addr, ...rest] = withPrefix.split("::");
  const normalisedCoinType = `0x${addr?.replace(/^0x0*/, "")}::${rest.join("::")}`;
  if (normalisedCoinType !== "0x2::sui::sui") {
    throw new PaymentVerificationError(
      `Coin type mismatch: expected SUI, got "${receipt.coin_type}"`
    );
  }

  // --- Validate receiver ---
  if (
    receipt.receiver.toLowerCase() !== expectedReceiver.toLowerCase()
  ) {
    throw new PaymentVerificationError(
      `Receiver mismatch: expected "${expectedReceiver}", got "${receipt.receiver}"`
    );
  }

  return receipt;
}
