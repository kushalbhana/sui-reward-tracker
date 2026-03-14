import mongoose from "mongoose";

export interface ISubscription {
  userId: mongoose.Types.ObjectId;
  plan: "pro";
  status: "active" | "expired" | "pending";
  txHash: string;
  walletAddress: string;
  paidAmount: number;
  paidCurrency: "SUI" | "SOL" | "USDT";
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
    txHash: { type: String, required: true, unique: true },
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
