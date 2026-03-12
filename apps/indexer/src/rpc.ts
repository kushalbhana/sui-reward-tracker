import { RpcClient } from "@repo/rpc";
import type { SuiEventPage } from "@repo/types";

export type { SuiEventPage };

export class SuiRpcWrapper {
  private urls: string[];
  private currentUrlIndex = 0;
  private client: RpcClient;

  // Configuration for retry logic
  private maxRetries = 3;
  private baseBackoffMs = 1000;

  constructor(rpcUrls: string[]) {
    if (!rpcUrls || rpcUrls.length === 0) {
      throw new Error("Cannot initialize SuiRpcWrapper without RPC URLs");
    }
    this.urls = rpcUrls;
    this.client = new RpcClient(this.urls[this.currentUrlIndex]!);
  }

  /**
   * Switches to the next RPC URL in the array, if available.
   * Returns true if switch was successful, false if we've exhausted all URLs.
   */
  private failover(): boolean {
    this.currentUrlIndex++;
    if (this.currentUrlIndex >= this.urls.length) {
      console.error("[RPC Wrapper] All RPC URLs exhausted.");
      // Reset to 0 for next fresh run
      this.currentUrlIndex = 0;
      return false;
    }
    
    console.warn(`[RPC Wrapper] Failing over to next RPC URL: ${this.urls[this.currentUrlIndex]}`);
    this.client = new RpcClient(this.urls[this.currentUrlIndex]!);
    return true;
  }

  private async sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Executes an RPC call with exponential backoff and automatic failover.
   */
  private async executeWithRetryAndFailover<T>(
    method: string,
    params: any[]
  ): Promise<T> {
    let attempt = 0;
    while (true) {
      try {
        const result = await this.client.call<T>(method, params);
        return result;
      } catch (error: any) {
        attempt++;
        console.error(`[RPC Wrapper] Call failed on attempt ${attempt} using ${this.urls[this.currentUrlIndex]}. Error: ${error.message}`);

        if (attempt >= this.maxRetries) {
          // Exhausted retries for this URL. Attempt failover.
          const switched = this.failover();
          if (!switched) {
            throw new Error("All RPC URLs failed after exhausting retries.");
          }
          // Reset attempts for the new URL
          attempt = 0; 
        } else {
          // Exponential backoff
          const backoff = this.baseBackoffMs * Math.pow(2, attempt - 1);
          console.log(`[RPC Wrapper] Waiting ${backoff}ms before next retry...`);
          await this.sleep(backoff);
        }
      }
    }
  }

  /**
   * Queries Sui Events.
   */
  public async queryEvents(eventType: string, cursor: any = null, limit: number = 50): Promise<SuiEventPage> {
    return this.executeWithRetryAndFailover<SuiEventPage>("suix_queryEvents", [
      { MoveEventType: eventType },
      cursor,
      limit,
      false // descending order (false = chronological order from oldest to newest if cursor is null/provided)
    ]);
  }
}
