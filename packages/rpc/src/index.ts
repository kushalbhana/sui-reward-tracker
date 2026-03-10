// Fetch options can be passed natively
export interface RpcClientOptions extends RequestInit {
  timeout?: number;
}

export interface RpcPayload {
  jsonrpc: string;
  id: number | string;
  method: string;
  params: any[];
}

export interface RpcResponse<T = any> {
  jsonrpc: string;
  id: number | string;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * Executes a single RPC call given a URL and a payload.
 * Useful for one-off calls rather than instantiating a client instance.
 */
export async function rpcCall<T = any>(
  url: string,
  payload: Partial<RpcPayload>,
  options: RpcClientOptions = {}
): Promise<T> {
  const { timeout = 30000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Normalize JSON-RPC payload format
  const formattedPayload = {
    jsonrpc: "2.0",
    id: payload.id ?? Date.now(),
    method: payload.method,
    params: payload.params || [],
    ...payload,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(fetchOptions.headers || {}),
      },
      body: JSON.stringify(formattedPayload),
      signal: controller.signal,
      ...fetchOptions,
    });

    if (!response.ok) {
      throw new Error(`RPC call failed with HTTP status ${response.status}: ${response.statusText}`);
    }

    const data: RpcResponse<T> = await response.json();

    if (data.error) {
      throw new Error(`RPC Error [${data.error.code}]: ${data.error.message} \n ${JSON.stringify(data.error.data || {})}`);
    }

    if (data.result === undefined) {
      throw new Error("RPC call returned neither result nor error");
    }

    return data.result;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Reusable RPC Client class bound to a specific URL.
 */
export class RpcClient {
  constructor(public url: string, public defaultOptions: RpcClientOptions = {}) {}

  /**
   * Performs an RPC call to the configured URL
   * @param method The RPC method to invoke
   * @param params The array of parameters or argument object
   * @param overrideOptions Overrides for fetch behavior specifically for this call
   */
  async call<T = any>(
    method: string,
    params: any[] = [],
    overrideOptions: RpcClientOptions = {}
  ): Promise<T> {
    return rpcCall<T>(
      this.url,
      { method, params },
      { ...this.defaultOptions, ...overrideOptions }
    );
  }
}
