/**
 * Browser-side PaymentKit helper.
 *
 * Creates a SuiGrpcClient extended with paymentKit() and exposes
 * buildPaymentTransaction() for ephemeral subscription payments.
 *
 * BROWSER ONLY — do not import this from server code.
 */
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { paymentKit } from "@mysten/payment-kit";
import type { Transaction } from "@mysten/sui/transactions";

const NETWORK = (process.env.NEXT_PUBLIC_PAYMENT_KIT_NETWORK ?? "mainnet") as
  | "mainnet"
  | "testnet";

const RPC_BASE: Record<"mainnet" | "testnet", string> = {
  mainnet: "https://fullnode.mainnet.sui.io:443",
  testnet: "https://fullnode.testnet.sui.io:443",
};

import type { PaymentKitClient } from "@mysten/payment-kit";

/** Lazily-created singleton client */
let _client:
  | (InstanceType<typeof SuiGrpcClient> & {
      paymentKit: PaymentKitClient;
    })
  | null = null;

export function getClient() {
  if (!_client) {
    _client = new SuiGrpcClient({
      network: NETWORK,
      baseUrl: RPC_BASE[NETWORK],
    }).$extend(paymentKit()) as any;
  }
  return _client!;
}

export interface BuildPaymentTransactionOptions {
  /** UUID nonce — generated once per payment attempt, stored on server for replay prevention */
  nonce: string;
  /** Amount in MIST (1 SUI = 1_000_000_000 MIST) */
  amountMist: bigint;
  /** Platform wallet address (receiver) */
  receiver: string;
  /** Connected wallet address (sender) — must match the signer */
  sender: string;
}

/**
 * Builds an ephemeral PaymentKit transaction ready to be signed by the wallet.
 *
 * Uses ephemeral mode (no registry required). Duplicate prevention is
 * enforced server-side via the unique `paymentNonce` MongoDB index.
 */
export function buildPaymentTransaction(
  opts: BuildPaymentTransactionOptions
): Transaction {
  const client = getClient();
  return client.paymentKit.tx.processEphemeralPayment({
    nonce: opts.nonce,
    coinType: "0x2::sui::SUI",
    amount: opts.amountMist,
    receiver: opts.receiver,
    sender: opts.sender,
  });
}
