"use client";

import { useEffect, useRef } from "react";

import { ensureUnicornStudioReady, isWebGLAvailable } from "@/lib/unicornstudio";


import { logger } from '@/lib/logger';

function getErrorLikeMessage(reason: unknown): string {
  if (!reason) {
    return "";
  }

  if (reason instanceof Error) {
    return reason.message;
  }

  if (typeof reason === "string") {
    return reason;
  }

  if (
    typeof reason === "object" &&
    reason !== null &&
    "message" in reason &&
    typeof (reason as { message?: unknown }).message === "string"
  ) {
    return (reason as { message?: string }).message ?? "";
  }

  return "";
}

function getErrorLikeStack(reason: unknown): string {
  if (!reason) {
    return "";
  }

  if (reason instanceof Error && typeof reason.stack === "string") {
    return reason.stack;
  }

  if (
    typeof reason === "object" &&
    reason !== null &&
    "stack" in reason &&
    typeof (reason as { stack?: unknown }).stack === "string"
  ) {
    return (reason as { stack?: string }).stack ?? "";
  }

  return "";
}

function isKnownUnicornSource(value: string): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.toLowerCase();
  return (
    normalized.includes("hiunicornstudio") ||
    normalized.includes("unicornstudio.js")
  );
}

function isKnownUnicornBootstrapFailure(
  reason: unknown,
  source = "",
): boolean {
  const message = getErrorLikeMessage(reason);
  const stack = getErrorLikeStack(reason);

  return (
    message.includes("Cannot read properties of undefined (reading 'gl')") &&
    (isKnownUnicornSource(stack) || isKnownUnicornSource(source))
  );
}

export function UnicornBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderRequestedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!isWebGLAvailable()) {
      return;
    }

    let active = true;
    const onUnhandledRejection = (
      event: PromiseRejectionEvent | (Event & { reason?: unknown }),
    ) => {
      if (!isKnownUnicornBootstrapFailure(event.reason)) {
        return;
      }

      event.preventDefault();

      if (process.env.NODE_ENV !== "production") {
        logger.warn(
          "[UnicornBackground] Suppressed Unicorn Studio WebGL bootstrap failure",
          event.reason,
        );
      }
    };

    const onWindowError = (
      event: ErrorEvent | (Event & { error?: unknown; filename?: string }),
    ) => {
      if (
        !isKnownUnicornBootstrapFailure(
          event.error,
          typeof event.filename === "string" ? event.filename : "",
        )
      ) {
        return;
      }

      event.preventDefault();

      if (process.env.NODE_ENV !== "production") {
        logger.warn(
          "[UnicornBackground] Suppressed Unicorn Studio runtime failure",
          event.error,
        );
      }
    };

    window.addEventListener("unhandledrejection", onUnhandledRejection);
    window.addEventListener("error", onWindowError);

    void ensureUnicornStudioReady()
      .then((unicorn) => {
        if (!active || !unicorn) {
          return;
        }
        if (renderRequestedRef.current) {
          return;
        }
        renderRequestedRef.current = true;
        requestAnimationFrame(() => {
          if (!active) {
            return;
          }
          try {
            unicorn.renderAll?.();
          } catch (error) {
            if (process.env.NODE_ENV !== "production") {
              logger.warn("[UnicornBackground] Render failed", error);
            }
          }
        });
      })
      .catch((error) => {
        if (process.env.NODE_ENV !== "production") {
          logger.warn("[UnicornBackground] Unable to initialise Unicorn Studio", error);
        }
      });

    return () => {
      active = false;
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      window.removeEventListener("error", onWindowError);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      data-us-project="BjsE8kV7u8dXeocM7a11"
      data-us-production="true"
      data-us-lazyload="true"
      style={{ width: "100%", height: "100%" }}
      className="absolute inset-0 z-0"
    />
  );
}
