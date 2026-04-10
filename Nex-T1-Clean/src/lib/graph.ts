import { Redis } from 'ioredis';


import { logger } from '@/lib/logger';
let clientInstance: Redis | null = null;
let initializationError: Error | null = null;

/**
 * Validates that the FalkorDB URL has the correct format.
 * Must be: redis://[user:password@]host:port
 */
function validateFalkorDbUrl(url: string): { valid: boolean; error?: string } {
  if (!url) {
    return { valid: false, error: 'FALKORDB_URL is not defined' };
  }

  // Check if URL has redis:// scheme
  if (!url.startsWith('redis://') && !url.startsWith('rediss://')) {
    return { 
      valid: false, 
      error: `FALKORDB_URL must start with redis:// or rediss://. Got: ${url.substring(0, 30)}...` 
    };
  }

  return { valid: true };
}

function getClient(): Redis | null {
  if (clientInstance) return clientInstance;
  if (initializationError) return null;

  const falkorDbUrl = process.env.FALKORDB_URL;
  
  // Validate URL format
  const validation = validateFalkorDbUrl(falkorDbUrl ?? '');
  if (!validation.valid) {
    logger.warn('[FalkorDB]', validation.error);
    initializationError = new Error(validation.error);
    return null;
  }

  try {
    // Validate connection string
    import('@/lib/utils/redis-config').then(({ validateRedisUrl }) => {
        validateRedisUrl(falkorDbUrl!, process.env.NODE_ENV === 'production');
    }).catch(() => {});

    // Create a singleton Redis client for FalkorDB
    clientInstance = new Redis(falkorDbUrl!, {
      password: process.env.FALKORDB_PASSWORD || process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) {
          logger.error('[FalkorDB] Max retries reached, giving up');
          return null;
        }
        return Math.min(times * 100, 2000);
      },
      reconnectOnError(err) {
        const targetErrors = ['READONLY', 'NOAUTH'];
        if (targetErrors.some(e => err.message.includes(e))) {
          logger.warn('[FalkorDB] Reconnecting due to:', err.message);
          return true;
        }
        return false;
      },
    });

    // Handle connection errors gracefully - prevent unhandled rejections
    clientInstance.on('error', (err) => {
      logger.error('[FalkorDB] Client Error:', err.message);
    });

    clientInstance.on('connect', () => {
      logger.debug('[FalkorDB] Connected to database');
    });

    return clientInstance;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('[FalkorDB] Failed to create client:', err.message);
    initializationError = err;
    return null;
  }
}

/**
 * FalkorDB client proxy. Returns null operations if client unavailable.
 */
export const falkorClient = new Proxy({} as Redis, {
  get(_target, prop) {
    const client = getClient();
    if (!client) {
      // Return a no-op function for unavailable client
      if (typeof prop === 'string') {
        return () => Promise.resolve(null);
      }
      return undefined;
    }
    const value = (client as UntypedJson as Record<string, UntypedJson>)[prop as string];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

/**
 * Check if FalkorDB is available and connected
 */
export function isFalkorDbAvailable(): boolean {
  return getClient() !== null;
}

/**
 * Helper for Cypher queries via the GRAPH.QUERY command.
 * Returns empty array if FalkorDB is unavailable.
 */
export async function cypherQuery<T = UntypedJson>(
  graphName: string,
  query: string,
  _params: Record<string, UntypedJson> = {}
): Promise<T[]> {
  const client = getClient();
  
  if (!client) {
    logger.warn('[FalkorDB] Query skipped - client unavailable');
    return [];
  }

  try {
    const response = await client.call('GRAPH.QUERY', graphName, query, '--compact');
    return response as T[];
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('[FalkorDB] Query Error:', err.message);
    return [];
  }
}

