
import "server-only";


import { logger } from '@/lib/logger';
export interface VectorSearchResult {
  id: string;
  score: number;
  metadata?: Record<string, UntypedJson>;
}

export class VectorizeStore {
  private accountId: string;
  private apiToken: string;
  private apiKey: string;
  private email: string;
  private indexName: string;

  constructor(indexName: string = "nex-agent-memory") {
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN || "";
    this.apiKey = process.env.CLOUDFLARE_API_KEY || "";
    this.email = process.env.CLOUDFLARE_EMAIL || "";
    this.indexName = indexName;
  }

  private getBaseUrl() {
    return `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/vectorize/indexes/${this.indexName}`;
  }

  private getAuthHeaders(): Record<string, string> {
    if (this.apiToken) {
      return { Authorization: `Bearer ${this.apiToken}` };
    }
    if (this.apiKey && this.email) {
      return {
        "X-Auth-Email": this.email,
        "X-Auth-Key": this.apiKey,
      };
    }
    return {};
  }

  private hasCredentials(): boolean {
    return Boolean(this.accountId && (this.apiToken || (this.apiKey && this.email)));
  }

  /**
   * Search for similar vectors
   * @param vector - The embedding vector (number[])
   * @param topK - Number of results to return
   */
  async query(
    vector: number[],
    options?: { topK?: number; filter?: Record<string, UntypedJson> }
  ): Promise<VectorSearchResult[]> {
    if (!this.hasCredentials()) {
      logger.warn("Vectorize: Missing credentials, returning empty results.");
      return [];
    }

    const topK = options?.topK ?? 5;

    try {
      const response = await fetch(`${this.getBaseUrl()}/query`, {
        method: "POST",
        headers: {
          ...this.getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vector,
          topK,
          returnMetadata: "all",
          ...(options?.filter ? { filter: options.filter } : {}),
        }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        const err = await response.text();
        logger.error("Vectorize Query Error:", err);
        return [];
      }

      const data = await response.json();
      const matches = (data as { result?: { matches?: VectorSearchResult[] } }).result?.matches;
      return Array.isArray(matches) ? matches : [];
    } catch (error) {
      logger.error("Vectorize Query Exception:", error);
      return [];
    }
  }

  /**
   * Insert vectors into the store
   * @param vectors - Array of { id, values, metadata }
   */
  async insert(vectors: { id: string; values: number[]; metadata?: Record<string, UntypedJson> }[]) {
    if (!this.hasCredentials()) return;

    try {
      const response = await fetch(`${this.getBaseUrl()}/insert`, {
        method: "POST",
        headers: {
          ...this.getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ vectors }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        logger.error("Vectorize Insert Error:", await response.text());
      }
    } catch (error) {
      logger.error("Vectorize Insert Exception:", error);
    }
  }
}

const resolvedIndexName = process.env.CLOUDFLARE_VECTORIZE_INDEX?.trim() || "nex-agent-memory";

export const vectorStore = new VectorizeStore(resolvedIndexName);
