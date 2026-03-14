import mongoose from "mongoose";
import type { IUnstakingRequestEvent } from "@repo/types";

export type { IUnstakingRequestEvent };

const UnstakingRequestEventSchema = new mongoose.Schema(
  {
    sortedId: { type: Number, index: true },
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



export const UnstakingRequestEvent = (mongoose.models.UnstakingRequestEvent as mongoose.Model<IUnstakingRequestEvent & mongoose.Document>) || mongoose.model<IUnstakingRequestEvent & mongoose.Document>("UnstakingRequestEvent", UnstakingRequestEventSchema);
