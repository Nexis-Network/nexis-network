/**
 * OpenAI Batch API Processor
 * 
 * Domain: ai-sdk
 * Responsibility: Manages batch processing of OpenAI API requests for cost optimization
 * Depends on: openai config, flex-router
 * Notes: Batch API offers 50% cost reduction vs real-time processing.
 *        Results available within 24 hours. Best for bulk/async operations.
 *        Reference: https://platform.openai.com/docs/guides/batch
 */

import { buildOpenAIHeaders, openaiConfig } from "@/server/services/ai-sdk/openai";
import type { ServiceTier } from "@/server/services/ai-sdk/flex-router";

// Batch API endpoints
const BATCH_API_BASE = (() => {
  const rawBase = openaiConfig.baseURL?.trim() ?? "https://api.openai.com/v1";
  const withoutTrailingSlash = rawBase.replace(/\/+$/, "");
  return withoutTrailingSlash;
})();

const FILES_ENDPOINT = `${BATCH_API_BASE}/files`;
const BATCHES_ENDPOINT = `${BATCH_API_BASE}/batches`;

/**
 * Batch job status from OpenAI API
 */
export type BatchStatus = 
  | "validating"
  | "failed" 
  | "in_progress"
  | "finalizing"
  | "completed"
  | "expired"
  | "cancelling"
  | "cancelled";

/**
 * A single request in a batch
 */
export type BatchRequestItem = {
  /** Unique identifier for tracking this request (required) */
  custom_id: string;
  /** HTTP method - always POST for chat completions */
  method: "POST";
  /** API endpoint path */
  url: "/v1/chat/completions" | "/v1/responses";
  /** Request body */
  body: {
    model: string;
    messages: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }>;
    /** Optional: service tier for cost optimization */
    service_tier?: ServiceTier;
    /** Optional: temperature setting */
    temperature?: number;
    /** Optional: max tokens */
    max_tokens?: number;
    /** Optional: response format */
    response_format?: { type: "text" | "json_object" };
    [key: string]: UntypedJson;
  };
};

/**
 * A result item from a completed batch
 */
export type BatchResultItem = {
  /** Matches the custom_id from the request */
  id: string;
  /** Original custom_id */
  custom_id: string;
  /** Response data */
  response?: {
    status_code: number;
    request_id: string;
    body: {
      id: string;
      object: string;
      created: number;
      model: string;
      choices: Array<{
        index: number;
        message: {
          role: string;
          content: string;
        };
        finish_reason: string;
      }>;
      usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
    };
  };
  /** Error if request failed */
  error?: {
    code: string;
    message: string;
  };
};

/**
 * Batch job metadata
 */
export type BatchJob = {
  id: string;
  object: "batch";
  endpoint: string;
  errors: {
    object: string;
    data: Array<{
      code: string;
      message: string;
      param?: string;
      line?: number;
    }>;
  } | null;
  input_file_id: string;
  completion_window: string;
  status: BatchStatus;
  output_file_id?: string;
  error_file_id?: string;
  created_at: number;
  in_progress_at?: number;
  expires_at?: number;
  finalizing_at?: number;
  completed_at?: number;
  failed_at?: number;
  expired_at?: number;
  cancelling_at?: number;
  cancelled_at?: number;
  request_counts: {
    total: number;
    completed: number;
    failed: number;
  };
  metadata?: Record<string, string>;
};

/**
 * File upload response
 */
type FileUploadResponse = {
  id: string;
  object: "file";
  bytes: number;
  created_at: number;
  filename: string;
  purpose: string;
};

/**
 * Batch creation options
 */
export type CreateBatchOptions = {
  /** Completion window - "24h" for standard batch */
  completionWindow?: "24h";
  /** Optional metadata for tracking */
  metadata?: Record<string, string>;
};

/**
 * Converts an array of batch request items to JSONL format
 */
export function createBatchJsonl(requests: BatchRequestItem[]): string {
  return requests.map(req => JSON.stringify(req)).join("\n");
}

/**
 * Creates a batch request item for chat completions
 */
export function createChatCompletionRequest(
  customId: string,
  messages: BatchRequestItem["body"]["messages"],
  options: {
    model?: string;
    serviceTier?: ServiceTier;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  } = {}
): BatchRequestItem {
  const {
    model = "gpt-5-mini",
    serviceTier = "flex", // Default to flex for batch to maximize savings
    temperature = 0.7,
    maxTokens,
    systemPrompt,
  } = options;

  const allMessages = systemPrompt 
    ? [{ role: "system" as const, content: systemPrompt }, ...messages]
    : messages;

  return {
    custom_id: customId,
    method: "POST",
    url: "/v1/chat/completions",
    body: {
      model,
      messages: allMessages,
      ...(serviceTier && { service_tier: serviceTier }),
      temperature,
      ...(maxTokens && { max_tokens: maxTokens }),
    },
  };
}

/**
 * Uploads a JSONL file to OpenAI for batch processing
 */
export async function uploadBatchFile(
  jsonlContent: string,
  filename: string = `batch_${Date.now()}.jsonl`
): Promise<FileUploadResponse> {
  const formData = new FormData();
  const blob = new Blob([jsonlContent], { type: "application/jsonl" });
  formData.append("file", blob, filename);
  formData.append("purpose", "batch");

  const response = await fetch(FILES_ENDPOINT, {
    method: "POST",
    headers: buildOpenAIHeaders(),
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to upload batch file: ${response.status} ${text}`);
  }

  return (await response.json()) as FileUploadResponse;
}

/**
 * Creates a batch job from an uploaded file
 */
export async function createBatch(
  inputFileId: string,
  options: CreateBatchOptions = {}
): Promise<BatchJob> {
  const { completionWindow = "24h", metadata } = options;

  const response = await fetch(BATCHES_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildOpenAIHeaders(),
    },
    body: JSON.stringify({
      input_file_id: inputFileId,
      endpoint: "/v1/chat/completions",
      completion_window: completionWindow,
      ...(metadata && { metadata }),
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to create batch: ${response.status} ${text}`);
  }

  return (await response.json()) as BatchJob;
}

/**
 * Gets the status of a batch job
 */
export async function getBatchStatus(batchId: string): Promise<BatchJob> {
  const response = await fetch(`${BATCHES_ENDPOINT}/${batchId}`, {
    method: "GET",
    headers: buildOpenAIHeaders(),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to get batch status: ${response.status} ${text}`);
  }

  return (await response.json()) as BatchJob;
}

/**
 * Retrieves the results of a completed batch job
 */
export async function getBatchResults(outputFileId: string): Promise<BatchResultItem[]> {
  const response = await fetch(`${FILES_ENDPOINT}/${outputFileId}/content`, {
    method: "GET",
    headers: buildOpenAIHeaders(),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to get batch results: ${response.status} ${text}`);
  }

  const text = await response.text();
  const lines = text.split("\n").filter(line => line.trim().length > 0);
  
  return lines.map(line => JSON.parse(line) as BatchResultItem);
}

/**
 * Cancels a batch job that is in progress
 */
export async function cancelBatch(batchId: string): Promise<BatchJob> {
  const response = await fetch(`${BATCHES_ENDPOINT}/${batchId}/cancel`, {
    method: "POST",
    headers: buildOpenAIHeaders(),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to cancel batch: ${response.status} ${text}`);
  }

  return (await response.json()) as BatchJob;
}

/**
 * Lists batch jobs with optional filtering
 */
export async function listBatches(options: {
  limit?: number;
  after?: string;
} = {}): Promise<{ data: BatchJob[]; has_more: boolean }> {
  const params = new URLSearchParams();
  if (options.limit) params.set("limit", String(options.limit));
  if (options.after) params.set("after", options.after);

  const url = `${BATCHES_ENDPOINT}${params.toString() ? `?${params}` : ""}`;
  const response = await fetch(url, {
    method: "GET",
    headers: buildOpenAIHeaders(),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to list batches: ${response.status} ${text}`);
  }

  return (await response.json()) as { data: BatchJob[]; has_more: boolean };
}

/**
 * High-level function to submit a batch and return the batch ID
 * Use this for fire-and-forget batch submissions
 */
export async function submitBatch(
  requests: BatchRequestItem[],
  options: CreateBatchOptions & { filename?: string } = {}
): Promise<{ batchId: string; inputFileId: string; requestCount: number }> {
  const { filename, ...batchOptions } = options;
  
  // Create JSONL content
  const jsonl = createBatchJsonl(requests);
  
  // Upload file
  const file = await uploadBatchFile(jsonl, filename);
  
  // Create batch
  const batch = await createBatch(file.id, batchOptions);
  
  return {
    batchId: batch.id,
    inputFileId: file.id,
    requestCount: requests.length,
  };
}

/**
 * Polls a batch job until completion or timeout
 * Returns results when completed
 */
export async function waitForBatch(
  batchId: string,
  options: {
    /** Maximum time to wait in ms (default: 24 hours) */
    maxWaitMs?: number;
    /** Polling interval in ms (default: 30 seconds) */
    pollIntervalMs?: number;
    /** Callback for status updates */
    onStatusUpdate?: (status: BatchJob) => void;
  } = {}
): Promise<{ status: BatchJob; results?: BatchResultItem[] }> {
  const { 
    maxWaitMs = 24 * 60 * 60 * 1000, 
    pollIntervalMs = 30_000,
    onStatusUpdate,
  } = options;

  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    const status = await getBatchStatus(batchId);
    onStatusUpdate?.(status);
    
    switch (status.status) {
      case "completed":
        if (status.output_file_id) {
          const results = await getBatchResults(status.output_file_id);
          return { status, results };
        }
        return { status };
        
      case "failed":
      case "expired":
      case "cancelled":
        return { status };
        
      case "validating":
      case "in_progress":
      case "finalizing":
        // Continue polling
        await sleep(pollIntervalMs);
        break;
        
      case "cancelling":
        // Wait for cancellation to complete
        await sleep(pollIntervalMs);
        break;
    }
  }
  
  throw new Error(`Batch ${batchId} did not complete within ${maxWaitMs}ms`);
}

/**
 * Helper function for async delay
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Checks if a batch job is in a terminal state
 */
export function isBatchTerminal(status: BatchStatus): boolean {
  return ["completed", "failed", "expired", "cancelled"].includes(status);
}

/**
 * Checks if a batch job succeeded
 */
export function isBatchSuccessful(status: BatchStatus): boolean {
  return status === "completed";
}

/**
 * Extracts the text content from a batch result
 */
export function extractBatchResultContent(result: BatchResultItem): string | null {
  if (result.error) {
    return null;
  }
  
  const choice = result.response?.body?.choices?.[0];
  if (!choice) {
    return null;
  }
  
  return choice.message?.content ?? null;
}

/**
 * Calculates cost savings from using batch processing
 */
export function calculateBatchSavings(
  totalTokens: number,
  model: string = "gpt-5-mini"
): {
  standardCost: number;
  batchCost: number;
  savings: number;
  savingsPercentage: number;
} {
  // Approximate blended pricing per 1M tokens (input/output midpoint)
  // for quick batch-vs-standard estimation.
  const PRICING: Record<string, number> = {
    "gpt-5-nano": 0.375,
    "gpt-5-mini": 0.75,
    "gpt-5": 6.25,
    // AI Gateway catalog verified on 2026-03-05: input 2.50 / output 15.00
    "gpt-5.4": 8.75,
    "openai/gpt-5.4": 8.75,
    "gpt-4o-mini": 0.375,
    "gpt-4o": 6.25,
  };

  const pricePerMillion = PRICING[model] ?? PRICING["gpt-5-mini"];
  const standardCost = (totalTokens / 1_000_000) * pricePerMillion;
  const batchCost = standardCost * 0.5; // 50% discount

  return {
    standardCost,
    batchCost,
    savings: standardCost - batchCost,
    savingsPercentage: 50,
  };
}

/**
 * Type to track batch job in database/queue
 */
export type BatchJobRecord = {
  id: string;
  batchId: string;
  inputFileId: string;
  status: BatchStatus;
  requestCount: number;
  completedCount: number;
  failedCount: number;
  metadata?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  outputFileId?: string;
  errorFileId?: string;
};

