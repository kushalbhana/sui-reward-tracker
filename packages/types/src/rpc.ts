// -----------------------------------------------
// RPC types
// -----------------------------------------------

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

// -----------------------------------------------
// SUI-specific event response types
// -----------------------------------------------

export interface SuiEventPage {
  data: Array<{
    id: { txDigest: string; eventSeq: string };
    packageId: string;
    transactionModule: string;
    sender: string;
    type: string;
    parsedJson: any;
    bcs: string;
    timestampMs: string;
  }>;
  nextCursor: { txDigest: string; eventSeq: string } | null;
  hasNextPage: boolean;
}
