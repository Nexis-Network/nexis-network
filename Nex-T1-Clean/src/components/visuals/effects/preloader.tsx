"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import styles from "./preloader.module.css";

type PreloaderProps = {
  autoDismissMs?: number | null;
  onFinish?: () => void;
  active?: boolean;
  showOncePerSession?: boolean;
};

const SESSION_STORAGE_KEY = "nex_chaingpt_preloader_shown";
const COLUMNS = 6;
const PIXELS_PER_COLUMN = 18;
const LOWER_PIXEL_START_INDEX = 9;
const PIXELATE_DURATION_MS = 260;
const PIXELATE_STAGGER_MS = 280;
const MIN_VISIBLE_DURATION_MS = 180;
const REVEAL_TOTAL_MS = PIXELATE_DURATION_MS + PIXELATE_STAGGER_MS + 120;
const DEFAULT_MAX_WAIT_MS = 12_000;
const PROGRESS_POLL_INTERVAL_MS = 140;
const PROGRESS_ANIMATION_INTERVAL_MS = 24;
const DOM_PROGRESS_WEIGHT = 0.35;
const MEDIA_PROGRESS_WEIGHT = 0.65;
const LINE_DELAYS_SECONDS = [1.3, 0.6, 0.8, 0.9, 1.1, 0];

const supportsReducedMotion = () => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

const buildPixelDelays = () => {
  const delays = Array.from({ length: COLUMNS }, () =>
    Array.from({ length: PIXELS_PER_COLUMN }, () => 0),
  );

  for (let col = 0; col < COLUMNS; col += 1) {
    for (let pixel = LOWER_PIXEL_START_INDEX; pixel < PIXELS_PER_COLUMN; pixel += 1) {
      delays[col][pixel] = Math.random() * (PIXELATE_STAGGER_MS / 1_000);
    }
  }

  return delays;
};

const getDomProgress = () => {
  if (typeof document === "undefined") {
    return 1;
  }

  if (document.readyState === "complete") {
    return 1;
  }

  if (document.readyState === "interactive") {
    return 0.68;
  }

  return 0.2;
};

const getFontProgress = () => {
  if (typeof document === "undefined" || !("fonts" in document)) {
    return 1;
  }

  return document.fonts.status === "loaded" ? 1 : 0;
};

type ResourceTracker = {
  getProgress: () => number;
  disconnect: () => void;
};

const hasVideoSource = (video: HTMLVideoElement) =>
  Boolean(video.currentSrc || video.src || video.querySelector("source[src]"));

const isVideoReady = (video: HTMLVideoElement) =>
  video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA || video.error != null;

const createResourceTracker = (): ResourceTracker => {
  if (typeof document === "undefined") {
    return {
      getProgress: () => 1,
      disconnect: () => {},
    };
  }

  const tracked = new WeakSet<Element>();
  const completed = new WeakSet<Element>();
  const cleanups: Array<() => void> = [];

  let totalResources = 0;
  let loadedResources = 0;

  const markComplete = (element: Element) => {
    if (completed.has(element)) {
      return;
    }

    completed.add(element);
    loadedResources += 1;
  };

  const trackImage = (image: HTMLImageElement) => {
    if (tracked.has(image) || !image.src) {
      return;
    }

    tracked.add(image);
    totalResources += 1;

    if (image.complete) {
      markComplete(image);
      return;
    }

    const onDone = () => {
      markComplete(image);
      image.removeEventListener("load", onDone);
      image.removeEventListener("error", onDone);
    };

    image.addEventListener("load", onDone, { once: true });
    image.addEventListener("error", onDone, { once: true });
    cleanups.push(() => {
      image.removeEventListener("load", onDone);
      image.removeEventListener("error", onDone);
    });
  };

  const trackVideo = (video: HTMLVideoElement) => {
    if (tracked.has(video) || !hasVideoSource(video)) {
      return;
    }

    tracked.add(video);
    totalResources += 1;

    if (isVideoReady(video)) {
      markComplete(video);
      return;
    }

    const onDone = () => {
      markComplete(video);
      video.removeEventListener("loadeddata", onDone);
      video.removeEventListener("error", onDone);
      video.removeEventListener("stalled", onDone);
    };

    video.addEventListener("loadeddata", onDone, { once: true });
    video.addEventListener("error", onDone, { once: true });
    video.addEventListener("stalled", onDone, { once: true });
    cleanups.push(() => {
      video.removeEventListener("loadeddata", onDone);
      video.removeEventListener("error", onDone);
      video.removeEventListener("stalled", onDone);
    });
  };

  const collect = (root: ParentNode) => {
    for (const image of Array.from(root.querySelectorAll<HTMLImageElement>("img[src]"))) {
      trackImage(image);
    }

    for (const video of Array.from(root.querySelectorAll<HTMLVideoElement>("video"))) {
      trackVideo(video);
    }
  };

  collect(document);

  if (typeof MutationObserver === "function" && document.body) {
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of Array.from(record.addedNodes)) {
          if (!(node instanceof Element)) {
            continue;
          }

          if (node.matches("img[src]")) {
            trackImage(node as HTMLImageElement);
          } else if (node.matches("video")) {
            trackVideo(node as HTMLVideoElement);
          }

          collect(node);
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    cleanups.push(() => observer.disconnect());
  }

  return {
    getProgress: () => {
      if (totalResources <= 0) {
        return 1;
      }

      return Math.min(1, loadedResources / totalResources);
    },
    disconnect: () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    },
  };
};

type PreloaderGridProps = {
  isPixelating: boolean;
  pixelDelays: number[][];
};

const PreloaderGrid = React.memo(function PreloaderGrid({ isPixelating, pixelDelays }: PreloaderGridProps) {
  const columns = useMemo(
    () => Array.from({ length: COLUMNS }, (_, columnIndex) => ({ index: columnIndex })),
    [],
  );

  return (
    <div className={styles.textGrid}>
      {columns.map(({ index: columnIndex }) => (
        <div
          key={`preloader-col-${columnIndex}`}
          className={styles.col}
          style={{ "--line-delay": `${LINE_DELAYS_SECONDS[columnIndex] ?? 0}s` } as React.CSSProperties}
        >
          {Array.from({ length: PIXELS_PER_COLUMN }, (_, pixelIndex) => (
            <div
              key={`pixel-${columnIndex}-${pixelIndex}`}
              className={cn(
                styles.pixel,
                isPixelating && pixelIndex >= LOWER_PIXEL_START_INDEX ? styles.pixelFade : null,
              )}
              style={
                {
                  "--pixel-delay": `${pixelDelays[columnIndex]?.[pixelIndex] ?? 0}s`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      ))}
    </div>
  );
});

const Preloader = ({
  autoDismissMs = DEFAULT_MAX_WAIT_MS,
  onFinish,
  active = true,
  showOncePerSession = false,
}: PreloaderProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isPixelating, setIsPixelating] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [pixelDelays, setPixelDelays] = useState<number[][]>(() =>
    Array.from({ length: COLUMNS }, () => Array.from({ length: PIXELS_PER_COLUMN }, () => 0)),
  );

  const timersRef = useRef<number[]>([]);
  const progressPollIntervalRef = useRef<number | null>(null);
  const progressAnimationIntervalRef = useRef<number | null>(null);
  const finishCalledRef = useRef(false);
  const revealStartedRef = useRef(false);
  const sequenceStartedRef = useRef(false);
  const resourceTrackerRef = useRef<ResourceTracker | null>(null);
  const startedAtMsRef = useRef(0);
  const targetProgressRef = useRef(0);

  const clearTimerRefs = useCallback(() => {
    for (const timeout of timersRef.current) {
      window.clearTimeout(timeout);
    }
    timersRef.current = [];

    if (progressPollIntervalRef.current != null) {
      window.clearInterval(progressPollIntervalRef.current);
      progressPollIntervalRef.current = null;
    }

    if (progressAnimationIntervalRef.current != null) {
      window.clearInterval(progressAnimationIntervalRef.current);
      progressAnimationIntervalRef.current = null;
    }

    resourceTrackerRef.current?.disconnect();
    resourceTrackerRef.current = null;
  }, []);

  const finish = useCallback(() => {
    if (finishCalledRef.current) {
      return;
    }
    finishCalledRef.current = true;
    onFinish?.();
  }, [onFinish]);

  const dismiss = useCallback(() => {
    clearTimerRefs();
    setIsVisible(false);
    finish();
  }, [clearTimerRefs, finish]);

  const queueTimeout = useCallback((callback: () => void, delayMs: number) => {
    const timeout = window.setTimeout(callback, Math.max(delayMs, 0));
    timersRef.current.push(timeout);
    return timeout;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!active) {
      dismiss();
      return;
    }

    if (supportsReducedMotion()) {
      dismiss();
      return;
    }

    if (showOncePerSession) {
      const seen = window.sessionStorage.getItem(SESSION_STORAGE_KEY) === "true";
      if (seen) {
        dismiss();
        return;
      }
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, "true");
    }

    if (sequenceStartedRef.current) {
      return;
    }
    sequenceStartedRef.current = true;

    startedAtMsRef.current = Date.now();
    targetProgressRef.current = 0;
    revealStartedRef.current = false;
    setIsVisible(true);
    setProgress(0);
    setIsPixelating(false);
    setIsRevealing(false);
    setPixelDelays(buildPixelDelays());
    resourceTrackerRef.current = createResourceTracker();

    let isCancelled = false;
    const onFontsReady = () => {
      if (isCancelled) {
        return;
      }
      targetProgressRef.current = Math.max(targetProgressRef.current, 96);
    };

    if ("fonts" in document && "ready" in document.fonts) {
      document.fonts.ready.then(onFontsReady).catch(() => {});
    }

    const updateTargetProgress = () => {
      const domProgress = getDomProgress();
      const mediaProgress = resourceTrackerRef.current?.getProgress() ?? 1;
      const fontProgress = getFontProgress();
      const weightedMediaProgress = mediaProgress * 0.85 + fontProgress * 0.15;
      const blendedProgress = Math.round(
        (DOM_PROGRESS_WEIGHT * domProgress + MEDIA_PROGRESS_WEIGHT * weightedMediaProgress) * 100,
      );
      const elapsedMs = Date.now() - startedAtMsRef.current;
      const reachedMaxWait = autoDismissMs != null && elapsedMs >= Math.max(autoDismissMs, 0);
      const fullyLoaded = domProgress >= 1 && mediaProgress >= 1 && fontProgress >= 1;

      const nextTarget = reachedMaxWait || fullyLoaded ? 100 : Math.min(99, blendedProgress);
      targetProgressRef.current = Math.max(targetProgressRef.current, nextTarget);
    };

    updateTargetProgress();

    progressPollIntervalRef.current = window.setInterval(() => {
      updateTargetProgress();
    }, PROGRESS_POLL_INTERVAL_MS);

    progressAnimationIntervalRef.current = window.setInterval(() => {
      setProgress((previous) => {
        const target = targetProgressRef.current;
        if (previous >= target) {
          return previous;
        }
        const gap = target - previous;
        const step = Math.max(1, Math.ceil(gap * 0.16));
        return Math.min(target, previous + step);
      });
    }, PROGRESS_ANIMATION_INTERVAL_MS);

    return () => {
      isCancelled = true;
      clearTimerRefs();
    };
  }, [
    active,
    autoDismissMs,
    clearTimerRefs,
    dismiss,
    showOncePerSession,
  ]);

  useEffect(() => {
    if (!isVisible || progress < 100 || revealStartedRef.current) {
      return;
    }

    revealStartedRef.current = true;
    const elapsedMs = Date.now() - startedAtMsRef.current;
    const revealDelay = Math.max(MIN_VISIBLE_DURATION_MS - elapsedMs, 0);

    queueTimeout(() => {
      setIsPixelating(true);
      setIsRevealing(true);
      queueTimeout(() => {
        dismiss();
      }, REVEAL_TOTAL_MS);
    }, revealDelay);
  }, [dismiss, isVisible, progress, queueTimeout]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className={cn(styles.overlay, isRevealing ? styles.overlayRevealing : null)} aria-hidden="true">
      <PreloaderGrid isPixelating={isPixelating} pixelDelays={pixelDelays} />
      <div className={styles.progressHud}>
        <span className={styles.progressValue}>{String(progress).padStart(3, "0")}</span>
        <span className={styles.progressPercent}>%</span>
      </div>
    </div>
  );
};

export { Preloader };
