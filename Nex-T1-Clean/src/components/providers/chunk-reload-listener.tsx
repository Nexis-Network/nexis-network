"use client";

import { useEffect } from "react";

const RELOAD_FLAG = "nex__chunk_reload_once_v1";

function shouldReloadOnce(): boolean {
  try {
    if (typeof window === "undefined") return false;
    if (window.sessionStorage.getItem(RELOAD_FLAG) === "1") {
      return false;
    }
    window.sessionStorage.setItem(RELOAD_FLAG, "1");
    return true;
  } catch {
    // If sessionStorage is unavailable, be conservative and allow a single reload.
    return true;
  }
}

function forceReloadWithBust() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("__chunk_reload__", String(Date.now()));
    window.location.replace(url.toString());
  } catch {
    window.location.reload();
  }
}

function isChunkLoadLikeError(error: UntypedJson): boolean {
  const name = (error as { name?: string } | null)?.name;
  const message = String(
    (error as { message?: string } | null)?.message ?? (error as UntypedJson as string) ?? "",
  );
  return (
    name === "ChunkLoadError" ||
    /ChunkLoadError|Loading chunk|CSS chunk/i.test(message)
  );
}

export function ChunkReloadListener() {
  useEffect(() => {
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event?.reason;
      if (isChunkLoadLikeError(reason) && shouldReloadOnce()) {
        forceReloadWithBust();
      }
    };

    const onError = (event: ErrorEvent) => {
      const candidate = event?.error ?? event?.message;
      if (isChunkLoadLikeError(candidate) && shouldReloadOnce()) {
        forceReloadWithBust();
      }
    };

    window.addEventListener("unhandledrejection", onUnhandledRejection);
    window.addEventListener("error", onError);

    return () => {
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      window.removeEventListener("error", onError);
    };
  }, []);

  return null;
}


