import mongoose from "mongoose";
import { AutoIncrement } from "./plugins";
import type { IStakingRequestEvent } from "@repo/types";

export type { IStakingRequestEvent };

const StakingRequestEventSchema = new mongoose.Schema(
  {
    bcs: { required: true, type: String },
    cursorId: {
      eventSeq: { type: String, required: true },
      txDigest: { index: true, type: String, required: true },
    },
    packageId: { index: true, required: true, type: String },
    parsedJson: {
      amount: { required: true, type: String },
      epoch: { index: true, required: true, type: Number },
      poolId: { index: true, required: true, type: String },
      stakerAddress: { index: true, required: true, type: String },
      validatorAddress: { index: true, required: true, type: String },
    },
    sender: { index: true, required: true, type: String },
    timestampMs: { index: true, required: true, type: String },
    transactionModule: { required: true, type: String },
    type: {
      enum: ["0x3::validator::StakingRequestEvent"],
      index: true,
      required: true,
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

StakingRequestEventSchema.index({ "cursorId.eventSeq": 1, "cursorId.txDigest": 1 }, { unique: true });

// @ts-ignore
StakingRequestEventSchema.plugin(AutoIncrement, { inc_field: "sortedId", id: "sui_events_seq" });

export const StakingRequestEvent = (mongoose.models.StakingRequestEvent as mongoose.Model<IStakingRequestEvent & mongoose.Document>) || mongoose.model<IStakingRequestEvent & mongoose.Document>("StakingRequestEvent", StakingRequestEventSchema);
