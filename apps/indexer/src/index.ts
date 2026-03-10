import { StakingRequestEvent, UnstakingRequestEvent, connectToDatabase } from "@repo/db";
import { SuiRpcWrapper } from "./rpc.js";
import cron from "node-cron";
import dotenv from "dotenv";
import path from "path";

// Load environment variables dynamically
dotenv.config({ path: path.resolve(import.meta.dirname, "../../.env") });

const PAGE_SIZE = Number(process.env.PAGE_SIZE) || 50;

// The RPC URLs provided as a comma-separated list
const RPC_URLS = process.env.RPC_URLS
  ? process.env.RPC_URLS.split(",").map(url => url.trim())
  : ["https://fullnode.mainnet.sui.io:443"];

const TARGET_EVENTS = [
  "0x3::validator::StakingRequestEvent",
  "0x3::validator::UnstakingRequestEvent"
];

class SuiIndexer {
  private rpc: SuiRpcWrapper;

  constructor() {
    this.rpc = new SuiRpcWrapper(RPC_URLS);
  }

  /**
   * Main indexing function logic for a specific event type.
   */
  async indexEventType(eventType: string) {
    console.log(`\n[Indexer] Starting to index events for type: ${eventType}`);

    // Determine which Model to use based on the event type
    let Model: any;
    if (eventType === "0x3::validator::StakingRequestEvent") {
      Model = StakingRequestEvent;
    } else if (eventType === "0x3::validator::UnstakingRequestEvent") {
      Model = UnstakingRequestEvent;
    } else {
      console.warn(`[Indexer] Unknown event type: ${eventType}. Skipping.`);
      return;
    }

    // Determine the latest cursor for this event type from the database
    // Sort in descending order based on the auto-increment DB sortId or transaction digest timestamp to find the latest
    // A more reliable way is tracking the actual txDigest/eventSeq locally.
    // For now, to synchronize seamlessly, we'll start from scratch/null cursor if none is found.
    const latestEvent = await Model.findOne().sort({ sortedId: -1 }).select("cursorId");

    let cursor = null;
    if (latestEvent && latestEvent.cursorId) {
      cursor = latestEvent.cursorId;
      console.log(`[Indexer] Resuming from cursor: ${cursor.txDigest} / ${cursor.eventSeq}`);
    } else {
      console.log(`[Indexer] No previous events found. Starting from genesis for type ${eventType}.`);
    }

    let hasNextPage = true;
    let totalProcessed = 0;

    // Loop through pagination
    while (hasNextPage) {
      console.log(`[Indexer] Fetching page of size ${PAGE_SIZE}... (cursor: ${cursor ? cursor.txDigest : 'null'})`);

      try {
        const page = await this.rpc.queryEvents(eventType, cursor, PAGE_SIZE);

        if (page.data && page.data.length > 0) {
          // Prepare for Mongoose bulk upsert
          const bulkOps = page.data.map((event) => {
            return {
              updateOne: {
                filter: {
                  "cursorId.txDigest": event.id.txDigest,
                  "cursorId.eventSeq": event.id.eventSeq
                },
                update: {
                  $set: {
                    cursorId: {
                      txDigest: event.id.txDigest,
                      eventSeq: event.id.eventSeq
                    },
                    packageId: event.packageId,
                    transactionModule: event.transactionModule,
                    sender: event.sender,
                    type: event.type,
                    parsedJson: event.parsedJson,
                    bcs: event.bcs,
                    timestampMs: event.timestampMs
                  }
                },
                upsert: true
              }
            };
          });

          // Execute bulk write
          const result = await Model.bulkWrite(bulkOps);

          totalProcessed += page.data.length;
          console.log(`[Indexer] Batch inserted/updated: ${result.upsertedCount + result.modifiedCount} documents (Total Processed: ${totalProcessed})`);
        } else {
          console.log(`[Indexer] No new events found on this page.`);
        }

        hasNextPage = page.hasNextPage;
        cursor = page.nextCursor;

      } catch (err: any) {
        console.error(`[Indexer] Critical failure while paginating events. Aborting run for ${eventType}.`);
        console.error(err);
        break; // Drop out of pagination sequence naturally on critical error instead of crashing app
      }
    }

    console.log(`[Indexer] Completed indexing for ${eventType}. Total events processed: ${totalProcessed}`);
  }

  /**
   * Runs the indexer across all target event types sequentially.
   */
  async run() {
    console.log(`\n================================`);
    console.log(`[Indexer] Initializing run at ${new Date().toISOString()}`);
    console.log(`================================`);

    try {
      await connectToDatabase();
      console.log(`[Indexer] Connected to MongoDB database successfully.`);

      for (const eventType of TARGET_EVENTS) {
        await this.indexEventType(eventType);
      }

      console.log(`[Indexer] Run completed successfully.`);

    } catch (err: any) {
      console.error(`[Indexer] Error during run:`, err);
    }
  }
}

// ----------------------------------------------------
// Entrypoint and Scheduler
// ----------------------------------------------------

console.log("[Scheduler] Starting SUI Event Indexer Service...");

const indexer = new SuiIndexer();

// Execute immediately on startup
indexer.run().then(() => {
  // Setup Node-Cron Schedule after the initial run completes
  // Requirements: Schedule next run at 20:32 UTC daily

  const cronExpression = "32 20 * * *"; // Minute 32, Hour 20

  console.log(`[Scheduler] Initial run payload complete. Scheduling daily task matching format (UTC): ${cronExpression}`);

  cron.schedule(cronExpression, async () => {
    console.log(`[Scheduler] Triggering scheduled indexing run...`);
    await indexer.run();
  }, {
    scheduled: true,
    timezone: "UTC"
  });
}).catch(err => {
  console.error("[Scheduler] Fatal error connecting or running initial script:", err);
  process.exit(1);
});
