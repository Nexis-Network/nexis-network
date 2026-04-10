"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";

import { cn } from "@/lib/utils";
import { ensureUnicornStudioReady, isWebGLAvailable } from "@/lib/unicornstudio";


import { logger } from '@/lib/logger';
const DEFAULT_PROJECT_ID = "auam1b0AYBvgVGJ5S8OO";
const UNICORN_IDLE_TIMEOUT_MS = 1200;

type IdleHandle = number | null;

const requestIdle = (callback: () => void): IdleHandle => {
  if (typeof window === "undefined") {
    return null;
  }

  if (typeof window.requestIdleCallback === "function") {
    return window.requestIdleCallback(callback, { timeout: UNICORN_IDLE_TIMEOUT_MS });
  }

  return window.setTimeout(callback, UNICORN_IDLE_TIMEOUT_MS);
};

const cancelIdle = (handle: IdleHandle) => {
  if (handle == null || typeof window === "undefined") {
    return;
  }

  if (typeof window.cancelIdleCallback === "function") {
    window.cancelIdleCallback(handle);
    return;
  }

  window.clearTimeout(handle);
};

export type UnicornSceneProps = {
  projectId?: string;
  className?: string;
  sceneClassName?: string;
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  sceneStyle?: CSSProperties;
};

export function UnicornScene({
  projectId = DEFAULT_PROJECT_ID,
  className,
  sceneClassName,
  width = "1440px",
  height = "900px",
  sceneStyle,
}: UnicornSceneProps) {
  const [mounted, setMounted] = useState(false);
  const renderRequestedRef = useRef(false);
  const { ref: sceneRef, inView } = useInView({
    triggerOnce: true,
    rootMargin: "200px 0px",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !inView) {
      return;
    }

    if (!isWebGLAvailable()) {
      return;
    }

    let isActive = true;
    let idleHandle: IdleHandle = null;

    idleHandle = requestIdle(() => {
      void ensureUnicornStudioReady()
        .then((unicorn) => {
          if (!isActive || !unicorn) {
            return;
          }

          if (typeof unicorn.renderAll === "function") {
            if (renderRequestedRef.current) {
              return;
            }
            renderRequestedRef.current = true;
            requestAnimationFrame(() => {
              if (!isActive) {
                return;
              }
              try {
                unicorn.renderAll?.();
              } catch (error) {
                if (process.env.NODE_ENV !== "production") {
                  logger.warn("[UnicornScene] Render failed", error);
                }
              }
            });
          }
        })
        .catch((error) => {
          if (process.env.NODE_ENV !== "production") {
            logger.warn("[UnicornScene] Unable to initialise Unicorn Studio", error);
          }
        });
    });

    return () => {
      isActive = false;
      cancelIdle(idleHandle);
    };
  }, [inView, mounted]);

  if (!mounted) return null;

  return (
    <div className={cn("w-full flex justify-center bg-[#0f0f10]", className)}>
      <div
        data-us-project={projectId}
        data-us-production="true"
        data-us-lazyload="true"
        ref={sceneRef}
        className={sceneClassName}
        style={{ width, height, backgroundColor: "#0f0f10", ...sceneStyle }}
      />
    </div>
  );
}
