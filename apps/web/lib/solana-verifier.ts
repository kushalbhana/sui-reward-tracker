/**
 * Server-side Solana payment verifier.
 *
 * Fetches the confirmed transaction from Solana RPC and validates:
 *  - The transaction succeeded on-chain
 *  - The expected recipient received at least `minimumLamports`
 *  - The SPL Memo instruction contains the expected nonce (ties the tx to this
 *    specific payment request and prevents memo-stripping attacks)
 *
 * SERVER ONLY — do not import in browser code.
 */
import { Connection, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

/** Program ID for the SPL Memo program (same on mainnet & devnet) */
const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

export class SolanaPaymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SolanaPaymentError";
  }
}

const NETWORK = process.env.NEXT_PUBLIC_PAYMENT_KIT_NETWORK ?? "mainnet";

const DEFAULT_RPC: Record<string, string> = {
  mainnet: "https://api.mainnet-beta.solana.com",
  testnet: "https://api.devnet.solana.com",
};

function getConnection(): Connection {
  const url = process.env.SOLANA_RPC_URL ?? DEFAULT_RPC[NETWORK] ?? DEFAULT_RPC["mainnet"]!;
  return new Connection(url, "confirmed");
}

/**
 * Returns the flat list of account PublicKeys for both legacy and versioned
 * (v0) transactions. For v0 we only use static keys — address lookup table
 * extensions are not needed for simple SOL transfers.
 */
function resolveAccountKeys(message: any): PublicKey[] {
  // Legacy message exposes `accountKeys` directly
  if (Array.isArray(message.accountKeys)) return message.accountKeys;
  // Versioned (v0) message exposes `staticAccountKeys`
  if (Array.isArray(message.staticAccountKeys))
    return message.staticAccountKeys;
  return [];
}

/**
 * Fetches `txSignature` from the Solana RPC and verifies the payment.
 *
 * @param txSignature  Base58 Solana transaction signature (tx ID)
 * @param expectedRecipient  Platform wallet that should have received SOL
 * @param minimumLamports  Minimum acceptable transfer in lamports (with slippage)
 * @param expectedNonce  UUID written into the SPL Memo; must match exactly
 *
 * @throws {SolanaPaymentError} on any verification failure
 */
export async function verifySolPayment(
  txSignature: string,
  expectedRecipient: string,
  minimumLamports: number,
  expectedNonce: string
): Promise<void> {
  const connection = getConnection();

  let tx: Awaited<ReturnType<typeof connection.getTransaction>>;
  try {
    tx = await connection.getTransaction(txSignature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
  } catch (err: any) {
    throw new SolanaPaymentError(
      `Failed to fetch transaction ${txSignature}: ${err.message}`
    );
  }

  if (!tx) {
    throw new SolanaPaymentError(`Transaction not found: ${txSignature}`);
  }

  // Ensure the transaction itself did not fail
  if (tx.meta?.err) {
    throw new SolanaPaymentError(
      `Transaction failed on-chain: ${JSON.stringify(tx.meta.err)}`
    );
  }

  if (!tx.meta) {
    throw new SolanaPaymentError("Transaction is missing metadata");
  }

  const message = tx.transaction.message;
  const accountKeys = resolveAccountKeys(message);

  // ── Recipient balance check ─────────────────────────────────────────────
  const recipientPubkey = new PublicKey(expectedRecipient);
  const recipientIndex = accountKeys.findIndex((k) =>
    k.equals(recipientPubkey)
  );

  if (recipientIndex === -1) {
    throw new SolanaPaymentError(
      `Expected recipient ${expectedRecipient} is not present in the transaction`
    );
  }

  const lamportsReceived =
    (tx.meta.postBalances[recipientIndex] ?? 0) - (tx.meta.preBalances[recipientIndex] ?? 0);

  if (lamportsReceived < minimumLamports) {
    throw new SolanaPaymentError(
      `Insufficient payment: minimum ${minimumLamports} lamports required, ` +
        `transaction transferred ${lamportsReceived} lamports to the recipient`
    );
  }

  // ── Memo nonce check ────────────────────────────────────────────────────
  // The frontend writes the nonce as UTF-8 text via the SPL Memo program.
  // This ties the on-chain transaction to this specific payment request so
  // that the same txSignature cannot be replayed for a different nonce.
  const memoPubkey = new PublicKey(MEMO_PROGRAM_ID);
  const memoProgramIndex = accountKeys.findIndex((k) =>
    k.equals(memoPubkey)
  );

  if (memoProgramIndex === -1) {
    throw new SolanaPaymentError(
      "No SPL Memo instruction found — nonce is required for payment verification"
    );
  }

  const instructions: any[] = (message as any).instructions ?? [];
  const memoInstruction = instructions.find(
    (ix) => ix.programIdIndex === memoProgramIndex
  );

  if (!memoInstruction) {
    throw new SolanaPaymentError("SPL Memo instruction not found in transaction");
  }

  // Instruction data is base58-encoded raw bytes; decode to UTF-8 to get the nonce string
  const memoText = Buffer.from(bs58.decode(memoInstruction.data)).toString("utf8");

  if (memoText !== expectedNonce) {
    throw new SolanaPaymentError(
      `Nonce mismatch: expected "${expectedNonce}", found "${memoText}" in memo`
    );
  }
}
