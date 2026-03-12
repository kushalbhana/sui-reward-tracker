import mongoose from "mongoose";

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
