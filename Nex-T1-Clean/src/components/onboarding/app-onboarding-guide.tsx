"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTranslations } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import { useAppOnboardingGuide } from "@/hooks/user/use-app-onboarding";
import { APP_ONBOARDING_VERSION } from "@/lib/user/onboarding";
import { trackAgentEvent } from "@/modules/analytics/events";
import { getAppOnboardingGuideCopy } from "@/modules/app/i18n";

type Rect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

function hasSameRect(nextRect: Rect, previousRect: Rect | null) {
  if (!previousRect) {
    return false;
  }

  return (
    Math.abs(previousRect.top - nextRect.top) < 0.5 &&
    Math.abs(previousRect.left - nextRect.left) < 0.5 &&
    Math.abs(previousRect.width - nextRect.width) < 0.5 &&
    Math.abs(previousRect.height - nextRect.height) < 0.5
  );
}

const HIGHLIGHT_PADDING = 12; // Tighter padding for cleaner look
const VIEWPORT_PADDING = 16;

const AppOnboardingGuideComponent = () => {
  const t = useTranslations("app");
  const copy = useMemo(() => getAppOnboardingGuideCopy(t), [t]);
  const steps = copy.steps;
  const isMobile = useIsMobile();
  const { shouldShow, markCompleted, markDismissed } = useAppOnboardingGuide();

  const [visible, setVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [highlightRect, setHighlightRect] = useState<Rect | null>(null);
  const [cardPosition, setCardPosition] = useState<{ top: number; left: number; placement: "top" | "bottom" } | null>(
    null,
  );
  const cardRef = useRef<HTMLDivElement | null>(null);
  const seenStepsRef = useRef<Set<string>>(new Set());

  // Wait for hydration and check visibility
  useEffect(() => {
    if (shouldShow && !isMobile) {
      // Small delay to ensure UI is settled
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [isMobile, shouldShow]);

  const handleSkip = useCallback(() => {
    setVisible(false);
    void markDismissed();
  }, [markDismissed]);

  const handleFinish = useCallback(() => {
    setVisible(false);
    void markCompleted();
  }, [markCompleted]);

  // Reset state when visibility toggles
  useEffect(() => {
    if (!visible) {
      setCurrentIndex(0);
      setHighlightRect(null);
      setCardPosition(null);
      seenStepsRef.current.clear();
    }
  }, [visible]);

  // Track target element and update highlight
  useEffect(() => {
    if (!visible) return;

    const step = steps[currentIndex];
    if (!step) {
      handleFinish();
      return;
    }

    // Function to find element with retry logic
    const findElement = () => 
      document.querySelector<HTMLElement>(`[data-onboarding-id="${step.targetId}"]`);

    const updateRect = () => {
      const element = findElement();
      if (!element) return;
      
      const rect = element.getBoundingClientRect();
      const nextRect = {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      };

      setHighlightRect((previousRect) =>
        hasSameRect(nextRect, previousRect) ? previousRect : nextRect,
      );
    };

    let element = findElement();
    
    // Auto-advance if element missing (skip hidden steps)
    if (!element) {
        const tid = setTimeout(() => {
             element = findElement();
             if (!element) {
                // If still missing, find next valid step
                const nextIndex = steps.findIndex((candidate, idx) => {
                    if (idx <= currentIndex) return false;
                    return Boolean(document.querySelector(`[data-onboarding-id="${candidate.targetId}"]`));
                });
                if (nextIndex === -1) {
                    handleSkip(); // No more visible steps
                } else {
                    setCurrentIndex(nextIndex);
                }
             } else {
                 updateRect();
             }
        }, 200);
        return () => clearTimeout(tid);
    }

    updateRect();

    // Listeners
    const handleScroll = () => updateRect();
    const handleResize = () => updateRect();
    
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && element) {
      observer = new ResizeObserver(updateRect);
      observer.observe(element);
    }

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
      observer?.disconnect();
    };
  }, [currentIndex, handleFinish, handleSkip, steps, visible]);

  // Calculate Card Position
  useLayoutEffect(() => {
    if (!visible || !highlightRect) return;
    const card = cardRef.current;
    if (!card) return;

    const measure = () => {
      const bounds = card.getBoundingClientRect();
      const { innerHeight, innerWidth } = window;
      const topSpace = highlightRect.top;
      const bottomSpace = innerHeight - (highlightRect.top + highlightRect.height);
      const preferAbove = topSpace > bottomSpace && topSpace > bounds.height + HIGHLIGHT_PADDING;

      const placement = preferAbove ? "top" : "bottom";
      let desiredTop = preferAbove
        ? highlightRect.top - bounds.height - HIGHLIGHT_PADDING
        : highlightRect.top + highlightRect.height + HIGHLIGHT_PADDING;

      // Keep within viewport vertically
      if (desiredTop < VIEWPORT_PADDING) desiredTop = VIEWPORT_PADDING;
      if (desiredTop + bounds.height > innerHeight - VIEWPORT_PADDING) {
          desiredTop = innerHeight - bounds.height - VIEWPORT_PADDING;
      }

      const centerLeft = highlightRect.left + highlightRect.width / 2 - bounds.width / 2;
      const desiredLeft = Math.min(
        Math.max(VIEWPORT_PADDING, centerLeft),
        innerWidth - bounds.width - VIEWPORT_PADDING,
      );

      setCardPosition((prev) => {
        if (
          prev &&
          Math.abs(prev.top - desiredTop) < 0.5 &&
          Math.abs(prev.left - desiredLeft) < 0.5 &&
          prev.placement === placement
        ) {
          return prev;
        }
        return {
          top: desiredTop,
          left: desiredLeft,
          placement,
        };
      });
    };

    measure();
  }, [highlightRect, visible, currentIndex]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev >= steps.length - 1) {
        handleFinish();
        return prev;
      }
      return Math.min(steps.length - 1, prev + 1);
    });
  }, [handleFinish, steps.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!visible) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleSkip();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        handleNext();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        handlePrevious();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleNext, handlePrevious, handleSkip, visible]);

  // Analytics tracking
  useEffect(() => {
    if (!visible) return;
    const currentStep = steps[currentIndex];
    if (!currentStep) return;
    if (seenStepsRef.current.has(currentStep.id)) {
      return;
    }
    seenStepsRef.current.add(currentStep.id);
    trackAgentEvent("app_onboarding_step_viewed", {
      stepId: currentStep.id,
      index: currentIndex,
      version: APP_ONBOARDING_VERSION,
    });
  }, [currentIndex, steps, visible]);

  const highlightStyle = useMemo(() => {
    if (!highlightRect) {
      return { opacity: 0, top: 0, left: 0, width: 0, height: 0 };
    }
    return {
      top: highlightRect.top - HIGHLIGHT_PADDING / 2,
      left: highlightRect.left - HIGHLIGHT_PADDING / 2,
      width: highlightRect.width + HIGHLIGHT_PADDING,
      height: highlightRect.height + HIGHLIGHT_PADDING,
      opacity: 1,
    };
  }, [highlightRect]);

  if (!visible) {
    return null;
  }

  const step = steps[currentIndex];
  if (!step) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-200">


      {/* Highlight Box */}
      <div
        className="absolute rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] transition-all duration-300 ease-out will-change-[top,left,width,height]"
        style={highlightStyle}
        aria-hidden
      >
        {/* Pulse Effect */}
        <div className="absolute inset-0 -m-1 animate-pulse rounded-xl" />
      </div>

      {/* Card */}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`onboarding-${step.id}-title`}
        className={cn(
          "pointer-events-auto absolute w-full max-w-[360px] flex flex-col gap-0",
          "rounded-2xl bg-black/60 backdrop-blur-2xl shadow-2xl",
          "transition-all duration-300 ease-out will-change-[top,left,opacity]",
          !cardPosition || !highlightRect ? "opacity-0 scale-95" : "opacity-100 scale-100"
        )}
        style={{
          top: cardPosition?.top ?? 0,
          left: cardPosition?.left ?? 0,
        }}
      >
        {/* Progress Bar */}
        <div className="h-1 w-full overflow-hidden rounded-t-2xl bg-white/5">
            <div 
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
            />
        </div>

        <div className="relative p-5">
            <button
            type="button"
            onClick={handleSkip}
            className="absolute right-3 top-3 inline-flex size-7 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:bg-white/10 hover:text-foreground"
            aria-label={copy.skipAria}
            >
            <X className="size-4" />
            </button>

            <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1 pr-6">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-primary/80">
                        {copy.stepLabel(currentIndex + 1, steps.length)}
                    </span>
                    <h3
                        id={`onboarding-${step.id}-title`}
                        className="text-lg font-medium leading-tight text-foreground"
                    >
                        {step.title}
                    </h3>
                </div>
                
                <p className="text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                </p>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                    className="h-8 gap-1.5 px-0 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground disabled:opacity-30"
                >
                    <ArrowLeft className="size-3.5" />
                    {copy.back}
                </Button>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSkip}
                        className="h-8 rounded-full px-3 text-xs font-normal text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    >
                        {copy.skip}
                    </Button>
                    <Button
                        size="sm"
                        onClick={currentIndex >= steps.length - 1 ? handleFinish : handleNext}
                        className="h-8 gap-1.5 rounded-full bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                    >
                        {currentIndex >= steps.length - 1 ? copy.finish : copy.next}
                        {currentIndex < steps.length - 1 && <ArrowRight className="size-3.5" />}
                    </Button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export const AppOnboardingGuide = memo(AppOnboardingGuideComponent);
