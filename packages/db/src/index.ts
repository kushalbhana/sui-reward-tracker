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
