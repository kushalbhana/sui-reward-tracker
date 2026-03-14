import "dotenv/config";
import { StakingRequestEvent, UnstakingRequestEvent, ValidatorEpochInfoEvent, connectToDatabase } from "@repo/db";
import { SuiRpcWrapper } from "./rpc.js";
import cron from "node-cron";

const PAGE_SIZE = Number(process.env.PAGE_SIZE) || 50;

// The RPC URLs provided as a comma-separated list
const RPC_URLS = process.env.RPC_URLS
  ? process.env.RPC_URLS.split(",").map(url => url.trim())
  : ["https://fullnode.mainnet.sui.io:443"];

const TARGET_EVENTS = [
  "0x3::validator::StakingRequestEvent",
  "0x3::validator::UnstakingRequestEvent",
  "0x3::validator_set::ValidatorEpochInfoEventV2"
];

/**
 * Transforms parsedJson from the raw RPC response (snake_case) into the
 * camelCase shape expected by the Mongoose schemas.
 */
function transformParsedJson(eventType: string, raw: any): any {
  if (eventType === "0x3::validator::StakingRequestEvent") {
    return {
      amount: raw.amount,
      epoch: raw.epoch,
      poolId: raw.pool_id,
      stakerAddress: raw.staker_address,
      validatorAddress: raw.validator_address,
    };
  }

  if (eventType === "0x3::validator::UnstakingRequestEvent") {
    return {
      poolId: raw.pool_id,
      principalAmount: raw.principal_amount,
      rewardAmount: raw.reward_amount,
      stakeActivationEpoch: raw.stake_activation_epoch,
      stakerAddress: raw.staker_address,
      unstakingEpoch: raw.unstaking_epoch,
      validatorAddress: raw.validator_address,
    };
  }

  // ValidatorEpochInfoEventV2 — RPC already uses snake_case matching the schema
  return raw;
}

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
    } else if (eventType === "0x3::validator_set::ValidatorEpochInfoEventV2") {
      Model = ValidatorEpochInfoEvent;
    } else {
      console.warn(`[Indexer] Unknown event type: ${eventType}. Skipping.`);
      return;
    }

    // Load the document with the highest sortedId to:
    //   (a) seed the in-memory ID counter
    //   (b) use its cursorId to resume from where we left off
    let latestEvent: any;
    try {
      latestEvent = await Model.findOne().sort({ sortedId: -1 }).select("cursorId sortedId");
    } catch (dbErr: any) {
      console.error(`[Indexer] FATAL: Database read failed while loading cursor for ${eventType}. Crashing to prevent data loss.`);
      console.error(dbErr);
      process.exit(1);
    }

    // In-memory counter — always larger than anything already in the DB
    let nextSortedId: number = (latestEvent?.sortedId ?? 0) + 1;
    console.log(`[Indexer] Starting sortedId counter at: ${nextSortedId}`);

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

      // Fetch events via RPC (retries/failover handled inside SuiRpcWrapper)
      const page = await this.rpc.queryEvents(eventType, cursor, PAGE_SIZE);

      if (page.data && page.data.length > 0) {
        // Assign a sequential sortedId to each event in this page BEFORE writing.
        // $setOnInsert ensures the id is written only on first insert and never
        // overwritten on subsequent upserts — preventing gaps or reassignment.
        // The unique compound index on cursorId ensures no duplicate documents.
        const bulkOps = page.data.map((event) => {
          const assignedId = nextSortedId++;
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
                  parsedJson: transformParsedJson(eventType, event.parsedJson),
                  bcs: event.bcs,
                  timestampMs: event.timestampMs
                },
                // Only set sortedId once when the document is first created.
                // On subsequent upserts (already-existing docs), this is a no-op.
                $setOnInsert: {
                  sortedId: assignedId
                }
              },
              upsert: true
            }
          };
        });

        // Execute bulk write — if this fails, crash immediately to prevent data loss
        try {
          const result = await Model.bulkWrite(bulkOps);
          totalProcessed += page.data.length;
          console.log(`[Indexer] Batch inserted/updated: ${result.upsertedCount + result.modifiedCount} documents (Total Processed: ${totalProcessed})`);
        } catch (dbErr: any) {
          console.error(`[Indexer] FATAL: Database write failed for ${eventType}. Crashing to prevent data loss.`);
          console.error(dbErr);
          process.exit(1);
        }
      } else {
        console.log(`[Indexer] No new events found on this page.`);
      }

      hasNextPage = page.hasNextPage;
      cursor = page.nextCursor;
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
    } catch (err: any) {
      console.error(`[Indexer] FATAL: Failed to connect to database. Crashing to prevent data loss.`);
      console.error(err);
      process.exit(1);
    }

    for (const eventType of TARGET_EVENTS) {
      await this.indexEventType(eventType);
    }

    console.log(`[Indexer] Run completed successfully.`);
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
