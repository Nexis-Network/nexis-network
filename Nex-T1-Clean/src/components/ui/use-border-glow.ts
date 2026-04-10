"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEventHandler,
  type RefObject,
} from "react";
import { useReducedMotion } from "motion/react";

import {
  getCursorAngle,
  getEdgeProximity,
} from "@/components/ui/border-glow.geometry";
import { startBorderGlowIntro } from "@/components/ui/border-glow.intro";

type UseBorderGlowArgs = {
  animated: boolean;
};

type UseBorderGlowReturn = {
  cardRef: RefObject<HTMLDivElement | null>;
  cursorAngle: number;
  edgeProximity: number;
  isVisible: boolean;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onPointerMove: PointerEventHandler<HTMLDivElement>;
};

export function useBorderGlow({
  animated,
}: UseBorderGlowArgs): UseBorderGlowReturn {
  const cardRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const prefersReducedMotion = Boolean(useReducedMotion());
  const [isHovered, setIsHovered] = useState(false);
  const [cursorAngle, setCursorAngle] = useState(45);
  const [edgeProximity, setEdgeProximity] = useState(0);
  const [sweepActive, setSweepActive] = useState(false);

  const flushPointerState = useCallback(() => {
    animationFrameRef.current = null;
    const element = cardRef.current;
    const pointer = pointerRef.current;

    if (!element || !pointer) {
      return;
    }

    setEdgeProximity(getEdgeProximity(element, pointer.x, pointer.y));
    setCursorAngle(getCursorAngle(element, pointer.x, pointer.y));
  }, []);

  const schedulePointerUpdate = useCallback(() => {
    if (animationFrameRef.current !== null) {
      return;
    }

    animationFrameRef.current = requestAnimationFrame(flushPointerState);
  }, [flushPointerState]);

  const onPointerMove = useCallback<PointerEventHandler<HTMLDivElement>>(
    (event) => {
      if (event.pointerType === "touch") {
        return;
      }

      const element = cardRef.current;
      if (!element) {
        return;
      }

      const rect = element.getBoundingClientRect();
      pointerRef.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      schedulePointerUpdate();
    },
    [schedulePointerUpdate],
  );

  const onPointerEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const onPointerLeave = useCallback(() => {
    pointerRef.current = null;
    setIsHovered(false);
  }, []);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!animated || prefersReducedMotion) {
      return;
    }

    setSweepActive(true);

    return startBorderGlowIntro({
      onAngleChange: setCursorAngle,
      onIntroEnd: () => setSweepActive(false),
      onVisibilityChange: setEdgeProximity,
    });
  }, [animated, prefersReducedMotion]);

  return {
    cardRef,
    cursorAngle,
    edgeProximity,
    isVisible: isHovered || sweepActive,
    onPointerEnter,
    onPointerLeave,
    onPointerMove,
  };
}
