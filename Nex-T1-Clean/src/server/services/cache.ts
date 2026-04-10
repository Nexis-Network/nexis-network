import "server-only";

import { logger } from '@/lib/logger';
/**
 * Abstract interface for a Caching Service
 * This allows us to swap between KV (Edge), Redis (Server), or Memory (Dev).
 */
export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  put<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
}

/**
 * Implementation for Cloudflare Workers KV via REST API.
 * When running on Cloudflare Workers, prefer a direct KV binding; for Node runtimes
 * this implementation uses Cloudflare's HTTP API.
 */

export class KVCacheService implements CacheService {
  private namespaceId: string;
  private accountId: string;
  private apiToken: string;
  private apiKey: string;
  private email: string;

  constructor(accountId?: string, namespaceId?: string, apiToken?: string, apiKey?: string, email?: string) {
    this.accountId = accountId || process.env.CLOUDFLARE_ACCOUNT_ID || "";
    this.namespaceId = namespaceId || process.env.CLOUDFLARE_KV_NAMESPACE_ID || "";
    this.apiToken = apiToken || process.env.CLOUDFLARE_API_TOKEN || "";
    this.apiKey = apiKey || process.env.CLOUDFLARE_API_KEY || "";
    this.email = email || process.env.CLOUDFLARE_EMAIL || "";
  }

  private getUrl(key: string) {
    const encodedKey = encodeURIComponent(key);
    return `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/storage/kv/namespaces/${this.namespaceId}/values/${encodedKey}`;
  }

  private getAuthHeaders(): Record<string, string> {
    if (this.apiToken) {
      return { 'Authorization': `Bearer ${this.apiToken}` };
    }
    if (this.apiKey && this.email) {
      return {
        'X-Auth-Email': this.email,
        'X-Auth-Key': this.apiKey
      };
    }
    return {};
  }

  private hasCredentials(): boolean {
    return Boolean(this.accountId && this.namespaceId && (this.apiToken || (this.apiKey && this.email)));
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.hasCredentials()) {
      return null;
    }

    try {
      const response = await fetch(this.getUrl(key), {
        headers: {
            ...this.getAuthHeaders(),
            'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(8_000),
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        logger.error(`KV Get Error: ${response.statusText}`);
        return null;
      }

      const data = await response.text();
      if (!data) return null;
      try {
        return JSON.parse(data) as T;
      } catch {
        return data as UntypedJson as T;
      }
    } catch (error) {
      logger.error("KV Cache Get Exception:", error);
      return null;
    }
  }

  async put<T>(key: string, value: T, ttlSeconds: number = 60): Promise<void> {
    if (!this.hasCredentials()) return;

    try {
      const endpoint = `${this.getUrl(key)}?expiration_ttl=${ttlSeconds}`;
      
      await fetch(endpoint, {
        method: "PUT",
        headers: {
            ...this.getAuthHeaders(),
            'Content-Type': 'text/plain' // Storing stringified JSON
        },
        body: JSON.stringify(value),
        signal: AbortSignal.timeout(8_000),
      });
    } catch (error) {
       logger.error("KV Cache Put Exception:", error);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.hasCredentials()) return;
    try {
       await fetch(this.getUrl(key), {
        method: "DELETE",
        headers: this.getAuthHeaders(),
        signal: AbortSignal.timeout(8_000),
      });
    } catch (error) {
        logger.error("KV Cache Delete Exception:", error);
    }
  }
}

// Singleton instance
export const kvCache = new KVCacheService();
