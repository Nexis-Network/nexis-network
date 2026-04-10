"use client";

import { logger } from '@/lib/logger';

const STORAGE_KEY = "__nex_chunk_reload__";

const markRetry = () => {
  try {
    sessionStorage.setItem(STORAGE_KEY, Date.now().toString());
  } catch {}
};

const clearRetryMarker = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
};

const hasRetried = () => {
  try {
    return sessionStorage.getItem(STORAGE_KEY) != null;
  } catch {
    return false;
  }
};

const isChunkLoadError = (error: UntypedJson) => {
  if (!error || typeof error !== "object") {
    return false;
  }
  const name = "name" in error ? String((error as { name?: UntypedJson }).name ?? "") : "";
  if (name === "ChunkLoadError") {
    return true;
  }
  const message = "message" in error ? String((error as { message?: UntypedJson }).message ?? "") : "";
  return /ChunkLoadError|Loading chunk/i.test(message);
};

export const withChunkRetry = <T>(loader: () => Promise<T>) => {
  return () =>
    loader()
      .then((value) => {
        clearRetryMarker();
        return value;
      })
      .catch((error) => {
        if (typeof window === "undefined" || !isChunkLoadError(error)) {
          throw error;
        }

        if (!hasRetried()) {
          logger.warn(
            "[lazy-loader] ChunkLoadError detected. Reloading the page to fetch a fresh client bundle.",
          );
          markRetry();
          window.location.reload();
          
          // Return a promise that never resolves (to stall the UI while reloading) 
          // BUT reject after 10s just in case reload fails or hangs, so ErrorBoundary can catch it.
          return new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(new Error("Chunk reload timed out"));
            }, 10_000);
          });
        }

        clearRetryMarker();
        throw error;
      });
};
