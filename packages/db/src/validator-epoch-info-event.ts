import mongoose from "mongoose";
import { AutoIncrement } from "./plugins";
import type { IValidatorEpochInfoEvent } from "@repo/types";

export type { IValidatorEpochInfoEvent };

const ValidatorEpochInfoEventSchema = new mongoose.Schema(
  {
    bcs: { required: true, type: String },
    cursorId: {
      txDigest: { index: true, required: true, type: String },
      eventSeq: { required: true, type: String },
    },
    packageId: { index: true, required: true, type: String },
    parsedJson: {
      epoch: { index: true, required: true, type: String },
      validator_address: { index: true, required: true, type: String },
      reference_gas_survey_quote: { required: true, type: String },
      stake: { required: true, type: String },
      voting_power: { required: true, type: String },
      commission_rate: { required: true, type: String },
      pool_staking_reward: { required: true, type: String },
      storage_fund_staking_reward: { required: true, type: String },
      pool_token_exchange_rate: {
        sui_amount: { required: true, type: String },
        pool_token_amount: { required: true, type: String },
      },
      tallying_rule_reporters: { type: [String], default: [] },
      tallying_rule_global_score: { type: String, default: "0" },
    },
    sender: { index: true, required: true, type: String },
    timestampMs: { index: true, required: true, type: String },
    transactionModule: { required: true, type: String },
    type: {
      enum: ["0x3::validator_set::ValidatorEpochInfoEventV2"],
      index: true,
      required: true,
      type: String,
    },
  },
  {
    timestamps: true,
    strict: false, // Allow additional fields from the RPC response to be stored
  }
);

ValidatorEpochInfoEventSchema.index({ "cursorId.eventSeq": 1, "cursorId.txDigest": 1 }, { unique: true });
ValidatorEpochInfoEventSchema.index({ "parsedJson.epoch": 1, "parsedJson.validator_address": 1 });

// @ts-ignore
ValidatorEpochInfoEventSchema.plugin(AutoIncrement, { inc_field: "sortedId", id: "validator_epoch_events_seq" });

export const ValidatorEpochInfoEvent = (mongoose.models.ValidatorEpochInfoEvent as mongoose.Model<IValidatorEpochInfoEvent & mongoose.Document>) || mongoose.model<IValidatorEpochInfoEvent & mongoose.Document>("ValidatorEpochInfoEvent", ValidatorEpochInfoEventSchema);
