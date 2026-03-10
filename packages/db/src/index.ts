import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/sui_rewards";

if (!process.env.MONGODB_URI) {
  console.warn("MONGODB_URI is not defined in the environment variables. Using default local MongoDB.");
}

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((conn: any) => {
      return conn;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// User Schema
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    image: { type: String },
    provider: { type: String, required: true }, // e.g. "google" | "github"
    providerAccountId: { type: String, required: true },
  },
  { timestamps: true }
);

// Prevent re-compilation of models in development
export const User = (mongoose.models.User as mongoose.Model<any>) || mongoose.model("User", UserSchema);

// ----------- Sui Event Indexer Schemas -----------

// Import the auto increment plugin in a way that respects TS and native CommonJS resolution
// @ts-ignore
import Inc from "mongoose-sequence";
const AutoIncrement = Inc(mongoose as any);

export interface IStakingRequestEvent extends mongoose.Document {
  bcs: string;
  cursorId: {
    eventSeq: string;
    txDigest: string;
  };
  sortedId?: number; // Auto-incremented
  packageId: string;
  parsedJson: {
    amount: string;
    epoch: number;
    poolId: string;
    stakerAddress: string;
    validatorAddress: string;
  };
  sender: string;
  timestampMs: string;
  transactionModule: string;
  type: string;
}

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

export const StakingRequestEvent = (mongoose.models.StakingRequestEvent as mongoose.Model<IStakingRequestEvent>) || mongoose.model<IStakingRequestEvent>("StakingRequestEvent", StakingRequestEventSchema);

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
UnstakingRequestEventSchema.plugin(AutoIncrement, { inc_field: "sortedId", id: "sui_events_seq" });

export const UnstakingRequestEvent = (mongoose.models.UnstakingRequestEvent as mongoose.Model<IUnstakingRequestEvent>) || mongoose.model<IUnstakingRequestEvent>("UnstakingRequestEvent", UnstakingRequestEventSchema);
