"use client";

import { useCallback } from "react";

import { SplineCanvas } from "@/components/visuals/spline/spline-canvas";

const SPLINE_SCENE_URL = "https://prod.spline.design/EsbNyuVz0pe5v9jN/scene.splinecode";
const BACKGROUND_GRADIENT = "from-[#030712] via-[#050c19] to-[#010409]";

export function LoadingPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#09090A]">
      <div className="h-16 w-16 animate-pulse rounded-full bg-primary/50 blur-2xl" />
    </div>
  );
}

function ReducedMotionFallback() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 bg-linear-to-br from-slate-950 via-slate-900 to-slate-800">
      <div className="h-14 w-14 rounded-full bg-primary/50 blur-xl" />
      <div className="text-center text-sm text-muted-foreground">
        Motion disabled — displaying static hero.
      </div>
    </div>
  );
}

function ErrorFallback() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-linear-to-br from-slate-950 via-slate-900 to-slate-800 px-6 text-center">
      <div className="h-14 w-14 rounded-full bg-rose-500/40 blur-xl" />
      <div className="text-sm text-muted-foreground">
        Interactive hero is unavailable right now. Please refresh or try again later.
      </div>
    </div>
  );
}

type SplineHeroProps = {
  onReady?: () => void;
  onError?: () => void;
};

export function SplineHero({ onReady, onError }: SplineHeroProps = {}) {
  const handleReady = useCallback(() => {
    onReady?.();
  }, [onReady]);

  const handleError = useCallback(() => {
    onError?.();
  }, [onError]);

  return (
    <SplineCanvas
      sceneUrl={SPLINE_SCENE_URL}
      className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-linear-to-br ${BACKGROUND_GRADIENT}`}
      canvasClassName="absolute inset-0"
      onReady={handleReady}
      onError={handleError}
      loadingFallback={<LoadingPlaceholder />}
      reducedMotionFallback={<ReducedMotionFallback />}
      errorFallback={<ErrorFallback />}
      instrumentationTag="spline-hero"
    />
  );
}
