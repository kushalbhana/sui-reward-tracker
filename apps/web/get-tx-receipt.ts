import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const subscriptionSchema = new mongoose.Schema({ status: String, paidCurrency: String, txDigest: String }, { timestamps: true });
const Subscription = (mongoose.models.Subscription || mongoose.model('Subscription', subscriptionSchema)) as mongoose.Model<any>;

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const sub = await Subscription.findOne({ txDigest: { $exists: true, $ne: null } }).sort({ createdAt: -1 });
  if (!sub) {
    console.log("No subscriptions found with txDigest");
    process.exit(0);
  }
  console.log("Found recent txDigest:", sub.txDigest);
  console.log("Status:", sub.status);
  
  const client = new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl("testnet"), network: "testnet" });
  const txBlock = await client.getTransactionBlock({
      digest: sub.txDigest,
      options: { showEvents: true },
  });
  
  const events = txBlock.events ?? [];
  const receiptEvent = events.find((e) => e.type.includes("PaymentReceipt"));
  console.log("Found receipt:", JSON.stringify(receiptEvent?.parsedJson, null, 2));
  process.exit(0);
}

main().catch(console.error);
