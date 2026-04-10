"use client";

import dynamic from "next/dynamic";
import type { ErrorInfo, ReactNode } from "react";
import { Component, useCallback, useEffect, useState } from "react";

import { captureHandledException } from "@/lib/observability/sentry-client";
import { cn } from "@/lib/utils";

const Spline = dynamic(() => import("@splinetool/react-spline").then((mod) => mod.default), {
  ssr: false,
});

if (typeof window !== "undefined") {
  setupSplineConsoleSuppression();
}

type SplineCanvasProps = {
  sceneUrl: string;
  className?: string;
  canvasClassName?: string;
  onReady?: () => void;
  onError?: () => void;
  loadingFallback?: ReactNode;
  reducedMotionFallback?: ReactNode;
  errorFallback?: ReactNode;
  instrumentationTag?: string;
  prefetchOnIdle?: boolean;
};

type SplineErrorBoundaryProps = {
  fallback: ReactNode;
  children: ReactNode;
  onCapture?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
  resetKey?: string | number | boolean;
};

type SplineErrorBoundaryState = {
  hasError: boolean;
};

class SplineErrorBoundary extends Component<SplineErrorBoundaryProps, SplineErrorBoundaryState> {
  state: SplineErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): SplineErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onCapture?.(error, errorInfo);
  }

  componentDidUpdate(previous: SplineErrorBoundaryProps) {
    if (previous.resetKey !== this.props.resetKey && this.state.hasError) {
      this.reset();
    }
  }

  reset() {
    this.setState({ hasError: false });
    this.props.onReset?.();
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

const DefaultLoadingFallback = () => (
  <div className="flex h-full w-full items-center justify-center bg-[#09090A]">
    <div className="h-12 w-12 animate-pulse rounded-full bg-primary/50 blur-xl" />
  </div>
);

const DefaultReducedMotionFallback = () => (
  <div className="flex h-full w-full flex-col items-center justify-center gap-6 bg-linear-to-br from-slate-950 via-slate-900 to-slate-800">
    <div className="h-14 w-14 rounded-full bg-primary/50 blur-xl" />
    <p className="px-6 text-center text-sm text-muted-foreground">
      Motion effects are disabled. Interactive content is unavailable with reduced motion preferences.
    </p>
  </div>
);

const DefaultErrorFallback = () => (
  <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-linear-to-br from-slate-950 via-slate-900 to-slate-800 px-6 text-center">
    <div className="h-14 w-14 rounded-full bg-rose-500/40 blur-xl" />
    <p className="text-sm text-muted-foreground">
      Interactive scene is unavailable right now. Please refresh or try again later.
    </p>
  </div>
);

const PREFETCH_IDLE_TIMEOUT_MS = 1200;

type ExtendedWindow = Window & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
};

let hasWarmedSplineRuntime = false;
const prefetchedSplineScenes = new Set<string>();

const warmSplineRuntime = () => {
  if (hasWarmedSplineRuntime) {
    return;
  }

  hasWarmedSplineRuntime = true;

  void import("@splinetool/react-spline").catch(() => {
    // If the warmup fails (e.g. offline), allow future retries.
    hasWarmedSplineRuntime = false;
  });
};

const warmSplineScene = (sceneUrl: string) => {
  if (!sceneUrl || prefetchedSplineScenes.has(sceneUrl) || typeof window === "undefined") {
    return;
  }

  prefetchedSplineScenes.add(sceneUrl);

  try {
    void fetch(sceneUrl, { cache: "force-cache" });
  } catch (error) {
    // Swallow fetch errors — the runtime will attempt to load the scene normally if this fails.
    prefetchedSplineScenes.delete(sceneUrl);
    captureHandledException(error as Error, { tags: { ui: "spline-prefetch" } });
  }
};

const warmSplineAssets = (sceneUrl: string) => {
  warmSplineRuntime();
  warmSplineScene(sceneUrl);
};

export function SplineCanvas({
  sceneUrl,
  className,
  canvasClassName,
  onReady,
  onError,
  loadingFallback,
  reducedMotionFallback,
  errorFallback,
  instrumentationTag = "spline-canvas",
  prefetchOnIdle = true,
}: SplineCanvasProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [shouldRenderSpline, setShouldRenderSpline] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = (event: MediaQueryListEvent | MediaQueryList) => {
      setPrefersReducedMotion(event.matches);
    };

    updatePreference(mediaQuery);

    const listener = (event: MediaQueryListEvent) => updatePreference(event);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", listener);
    } else {
      mediaQuery.addListener(listener);
    }

    return () => {
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", listener);
      } else {
        mediaQuery.removeListener(listener);
      }
    };
  }, []);

  // Allow the runtime to attempt loading even if preflight fails; we no longer
  // pessimistically flip into an error state on network hiccups.
  useEffect(() => {
    setHasError(false);
    setIsReady(false);
    setShouldRenderSpline(false);

    const idle = (window as ExtendedWindow).requestIdleCallback ?? window.requestAnimationFrame;
    const cancel = (window as ExtendedWindow).cancelIdleCallback ?? window.cancelAnimationFrame;
    const handle = idle(() => setShouldRenderSpline(true));
    return () => cancel(handle);
  }, [sceneUrl]);

  useEffect(() => {
    if (!prefetchOnIdle || typeof window === "undefined" || prefersReducedMotion) {
      return;
    }

    let cancelled = false;

    const runWarmup = () => {
      if (cancelled) {
        return;
      }
      warmSplineAssets(sceneUrl);
    };

    const idleWindow = window as ExtendedWindow;

    if (typeof idleWindow.requestIdleCallback === "function") {
      const idleHandle = idleWindow.requestIdleCallback(runWarmup, { timeout: PREFETCH_IDLE_TIMEOUT_MS });
      return () => {
        cancelled = true;
        idleWindow.cancelIdleCallback?.(idleHandle);
      };
    }

    const timeoutId = window.setTimeout(runWarmup, PREFETCH_IDLE_TIMEOUT_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [prefetchOnIdle, prefersReducedMotion, sceneUrl]);

  useEffect(() => {
    setShouldRenderSpline(!prefersReducedMotion);
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (shouldRenderSpline) {
      setIsReady(false);
      setHasError(false);
    }
  }, [shouldRenderSpline]);

  useEffect(() => {
    if (!shouldRenderSpline) {
      return;
    }

    const exitConsoleContext = enterSplineConsoleContext();
    return () => {
      exitConsoleContext();
    };
  }, [shouldRenderSpline]);

  const handleLoad = useCallback(() => {
    setIsReady(true);
    setHasError(false);
    onReady?.();
  }, [onReady]);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsReady(false);
    onError?.();
  }, [onError]);

  return (
    <div className={cn("relative flex h-full w-full items-center justify-center overflow-hidden", className)}>
      {prefersReducedMotion ? (
        reducedMotionFallback ?? <DefaultReducedMotionFallback />
      ) : hasError ? (
        errorFallback ?? <DefaultErrorFallback />
      ) : shouldRenderSpline ? (
        <>
          <SplineErrorBoundary
            fallback={errorFallback ?? <DefaultErrorFallback />}
            onCapture={(error, errorInfo) =>
              captureHandledException(error, {
                tags: { ui: instrumentationTag },
                extra: { componentStack: errorInfo.componentStack },
              })
            }
            onReset={() => {
              setHasError(false);
              setIsReady(false);
            }}
            resetKey={shouldRenderSpline}
          >
            <div className={cn("absolute inset-0", canvasClassName)}>
              <Spline
                scene={sceneUrl}
                className="h-full w-full"
                onLoad={handleLoad}
                onError={handleError}
              />
            </div>
          </SplineErrorBoundary>
          {!isReady ? (
            <div className="absolute inset-0 z-10">
              {loadingFallback ?? <DefaultLoadingFallback />}
            </div>
          ) : null}
        </>
      ) : (
        loadingFallback ?? <DefaultLoadingFallback />
      )}
    </div>
  );
}

type PatchedConsoleError = Console["error"] & {
  __splineMissingPropertyPatched__?: boolean;
};

const SPLINE_ERROR_MESSAGE = "missing property";
const SPLINE_RUNTIME_HINTS = [
  "@splinetool/runtime",
  "@splinetool/react-spline",
  "@splinetool+runtime",
  "@splinetool+react-spline",
  "splinetool/runtime",
  "splinetool/react-spline",
  "components/visuals/spline",
  "spline-canvas",
  "splinecanvas",
  "spline-hero",
  "scene.splinecode",
  "@splinetool",
];
const SPLINE_CONTEXT_KEYS: Array<"message" | "stack" | "componentStack" | "filename" | "sourceURL"> = [
  "message",
  "stack",
  "componentStack",
  "filename",
  "sourceURL",
];
let lastSuppressedSplineErrorAt = 0;
let activeSplineConsoleContexts = 0;

function setupSplineConsoleSuppression() {
  const consoleRef = window.console;
  // Capture the original error function once, at safe module scope level if possible, 
  // or at least before we patch it.
  const originalError = consoleRef.error;

  // Check if already patched to avoid recursive patching
  if ((originalError as PatchedConsoleError).__splineMissingPropertyPatched__) {
    return;
  }

  const patched: PatchedConsoleError = (...args) => {
    if (shouldSuppressSplineConsoleError(args)) {
      return;
    }
    // Call the original captured function.
    // We use Function.prototype.apply to ensure we keep the context correct (console).
    originalError.apply(consoleRef, args);
  };

  patched.__splineMissingPropertyPatched__ = true;
  consoleRef.error = patched;
}

function shouldSuppressSplineConsoleError(args: UntypedJson[]): boolean {
  const now = Date.now();
  const contextStrings = args.flatMap(extractSplineConsoleStrings);
  const hasMissingPropertyMessage = contextStrings.some(includesMissingPropertyMessage);
  const hasSplineContext = contextStrings.some(includesSplineRuntimeHint);
  const hasActiveSplineContext = hasActiveSplineConsoleContext();

  if (hasMissingPropertyMessage && (hasSplineContext || hasActiveSplineContext)) {
    lastSuppressedSplineErrorAt = now;
    return true;
  }

  const isReactFollowupMessage =
    now - lastSuppressedSplineErrorAt < 750 &&
    args.length > 0 &&
    typeof args[0] === "string" &&
    args[0].toLowerCase().includes("the above error occurred in");

  return isReactFollowupMessage;
}

function extractSplineConsoleStrings(argument: UntypedJson): string[] {
  const segments: string[] = [];

  const appendIfString = (value: UntypedJson) => {
    if (typeof value === "string" && value.length > 0) {
      segments.push(value);
    }
  };

  if (argument == null) {
    return segments;
  }

  if (typeof argument === "string") {
    appendIfString(argument);
    return segments;
  }

  if (argument instanceof Error) {
    appendIfString(argument.message);
    appendIfString(argument.stack);
    return segments;
  }

  if (typeof argument === "object") {
    const record = argument as Record<string, UntypedJson>;
    for (const key of SPLINE_CONTEXT_KEYS) {
      appendIfString(record[key]);
    }
  }

  return segments;
}

const includesMissingPropertyMessage = (value: string) =>
  value.toLowerCase().includes(SPLINE_ERROR_MESSAGE);

const includesSplineRuntimeHint = (value: string) => {
  const normalized = value.toLowerCase();
  return SPLINE_RUNTIME_HINTS.some((hint) => normalized.includes(hint));
};

function enterSplineConsoleContext() {
  let released = false;
  activeSplineConsoleContexts += 1;

  return () => {
    if (released) {
      return;
    }
    released = true;
    activeSplineConsoleContexts = Math.max(0, activeSplineConsoleContexts - 1);
  };
}

const hasActiveSplineConsoleContext = () => activeSplineConsoleContexts > 0;
