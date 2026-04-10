import type { CSSProperties } from "react";

type ParsedHslColor = {
  h: number;
  s: number;
  l: number;
};

type BoxShadowLayer = [number, number, number, number, number, boolean];

type AnimateValueArgs = {
  start?: number;
  end?: number;
  duration?: number;
  delay?: number;
  ease?: (value: number) => number;
  onUpdate: (value: number) => void;
  onEnd?: () => void;
};

type AnimationHandle = {
  cancel: () => void;
};

const DEFAULT_GLOW_COLOR: ParsedHslColor = { h: 40, s: 80, l: 80 };
const GRADIENT_POSITIONS = [
  "80% 55%",
  "69% 34%",
  "8% 6%",
  "41% 38%",
  "86% 85%",
  "82% 18%",
  "51% 4%",
] as const;
const COLOR_MAP = [0, 1, 2, 0, 1, 2, 1] as const;
const BOX_SHADOW_LAYERS: readonly BoxShadowLayer[] = [
  [0, 0, 0, 1, 100, true],
  [0, 0, 1, 0, 60, true],
  [0, 0, 3, 0, 50, true],
  [0, 0, 6, 0, 40, true],
  [0, 0, 15, 0, 30, true],
  [0, 0, 25, 2, 20, true],
  [0, 0, 50, 2, 10, true],
  [0, 0, 1, 0, 60, false],
  [0, 0, 3, 0, 50, false],
  [0, 0, 6, 0, 40, false],
  [0, 0, 15, 0, 30, false],
  [0, 0, 25, 2, 20, false],
  [0, 0, 50, 2, 10, false],
] as const;

export const BORDER_GLOW_DROP_SHADOW =
  "rgba(0,0,0,0.1) 0 1px 2px, rgba(0,0,0,0.1) 0 2px 4px, rgba(0,0,0,0.1) 0 4px 8px, rgba(0,0,0,0.1) 0 8px 16px, rgba(0,0,0,0.1) 0 16px 32px, rgba(0,0,0,0.1) 0 32px 64px";

export function easeOutCubic(value: number): number {
  return 1 - Math.pow(1 - value, 3);
}

export function easeInCubic(value: number): number {
  return value * value * value;
}

export function parseHslColor(hslColor: string): ParsedHslColor {
  const match = hslColor.match(/([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/);

  if (!match) {
    return DEFAULT_GLOW_COLOR;
  }

  return {
    h: Number.parseFloat(match[1]),
    s: Number.parseFloat(match[2]),
    l: Number.parseFloat(match[3]),
  };
}

export function buildBoxShadow(glowColor: string, intensity: number): string {
  const { h, s, l } = parseHslColor(glowColor);
  const baseColor = `${h}deg ${s}% ${l}%`;

  return BOX_SHADOW_LAYERS.map(([x, y, blur, spread, alpha, inset]) => {
    const opacity = Math.min(alpha * intensity, 100);
    const layerShadow = `${x}px ${y}px ${blur}px ${spread}px hsl(${baseColor} / ${opacity}%)`;

    return inset ? `inset ${layerShadow}` : layerShadow;
  }).join(", ");
}

export function buildMeshGradients(colors: string[]): string[] {
  const meshGradients: string[] = [];

  for (let index = 0; index < GRADIENT_POSITIONS.length; index += 1) {
    const color = colors[Math.min(COLOR_MAP[index], colors.length - 1)];
    meshGradients.push(
      `radial-gradient(at ${GRADIENT_POSITIONS[index]}, ${color} 0px, transparent 50%)`,
    );
  }

  meshGradients.push(`linear-gradient(${colors[0]} 0 100%)`);

  return meshGradients;
}

export function createConicMask(
  angle: string,
  leadingStop: string,
  middleStart: string,
  middleEnd: string,
  trailingStop: string,
): CSSProperties {
  const maskImage = `conic-gradient(from ${angle} at center, black ${leadingStop}, transparent ${middleStart}, transparent ${middleEnd}, black ${trailingStop})`;

  return {
    WebkitMaskImage: maskImage,
    maskImage,
  };
}

export function animateValue({
  start = 0,
  end = 100,
  duration = 1000,
  delay = 0,
  ease = easeOutCubic,
  onUpdate,
  onEnd,
}: AnimateValueArgs): AnimationHandle {
  let animationFrameId: number | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let cancelled = false;
  const startAt = performance.now() + delay;

  const tick = (): void => {
    if (cancelled) {
      return;
    }

    const progress = Math.min((performance.now() - startAt) / duration, 1);
    onUpdate(start + (end - start) * ease(progress));

    if (progress < 1) {
      animationFrameId = requestAnimationFrame(tick);
      return;
    }

    onEnd?.();
  };

  timeoutId = setTimeout(() => {
    animationFrameId = requestAnimationFrame(tick);
  }, delay);

  return {
    cancel: () => {
      cancelled = true;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
    },
  };
}
