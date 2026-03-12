import mongoose from "mongoose";
import { AutoIncrement } from "./plugins";

export interface IUnstakingRequestEvent extends mongoose.Document {
  bcs: string;
  cursorId: {
    txDigest: string;
    eventSeq: string;
  };
  sortedId?: number; // Auto-incremented
  packageId: string;
  parsedJson: {
    poolId: string;
    principalAmount: string;
    rewardAmount: string;
    stakeActivationEpoch: string;
    stakerAddress: string;
    unstakingEpoch: number;
    validatorAddress: string;
  };
  sender: string;
  timestampMs: string;
  transactionModule: string;
  type: string;
}

const UnstakingRequestEventSchema = new mongoose.Schema(
  {
    bcs: { required: true, type: String },
    cursorId: {
      txDigest: { index: true, required: true, type: String },
      eventSeq: { required: true, type: String },
    },
    packageId: { index: true, required: true, type: String },
    parsedJson: {
      poolId: { index: true, required: true, type: String },
      principalAmount: { required: true, type: String },
      rewardAmount: { required: true, type: String },
      stakeActivationEpoch: { index: true, required: true, type: String },
      stakerAddress: { index: true, required: true, type: String },
      unstakingEpoch: { index: true, required: true, type: Number },
      validatorAddress: { index: true, required: true, type: String },
    },
    sender: { index: true, required: true, type: String },
    timestampMs: { index: true, required: true, type: String },
    transactionModule: { required: true, type: String },
    type: {
      enum: ["0x3::validator::UnstakingRequestEvent"],
      index: true,
      required: true,
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

UnstakingRequestEventSchema.index({ "cursorId.eventSeq": 1, "cursorId.txDigest": 1 }, { unique: true });

// @ts-ignore
UnstakingRequestEventSchema.plugin(AutoIncrement, { inc_field: "sortedId", id: "unstaking_events_seq" });

export const UnstakingRequestEvent = (mongoose.models.UnstakingRequestEvent as mongoose.Model<IUnstakingRequestEvent>) || mongoose.model<IUnstakingRequestEvent>("UnstakingRequestEvent", UnstakingRequestEventSchema);
