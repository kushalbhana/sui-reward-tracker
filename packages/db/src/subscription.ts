import mongoose from "mongoose";

export interface ISubscription {
  userId: mongoose.Types.ObjectId;
  plan: "pro";
  status: "active" | "expired" | "pending";
  /**
   * @deprecated Use `txDigest` for SUI PaymentKit payments.
   * Kept for backward compatibility (SOL payments still use txHash).
   */
  txHash?: string;
  /** Canonical transaction digest (SUI PaymentKit payments) */
  txDigest?: string;
  walletAddress: string;
  paidAmount: number;
  paidCurrency: "SUI" | "SOL" | "USDT";
  /**
   * UUID nonce generated client-side before building the PaymentKit
   * transaction. Stored with a unique index to prevent replay attacks.
   * Only set for SUI PaymentKit payments.
   */
  paymentNonce?: string;
  activatedAt: Date;
  expiresAt: Date;
}

const SubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ["pro"],
      default: "pro",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "expired", "pending"],
      default: "active",
      required: true,
    },
    // Legacy field — used for SOL payments and backward compat
    txHash: { type: String, unique: true, sparse: true },
    // New canonical field — used for SUI PaymentKit payments
    txDigest: { type: String, sparse: true },
    // Unique nonce for PaymentKit payments — prevents replay attacks at the DB level
    paymentNonce: { type: String, unique: true, sparse: true },
    walletAddress: { type: String, required: true },
    paidAmount: { type: Number, required: true },
    paidCurrency: {
      type: String,
      enum: ["SUI", "SOL", "USDT"],
      required: true,
    },
    activatedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

// Compound index for quick lookup of active subscriptions
SubscriptionSchema.index({ userId: 1, status: 1, expiresAt: -1 });

export const Subscription =
  (mongoose.models.Subscription as mongoose.Model<ISubscription & mongoose.Document>) ||
  mongoose.model<ISubscription & mongoose.Document>("Subscription", SubscriptionSchema);
