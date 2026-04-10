"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

export type AgentAvatarProps = Omit<
  React.CanvasHTMLAttributes<HTMLCanvasElement>,
  "children"
> & {
  seed: string;
  size?: number;
  animated?: boolean;
};

const GRID_SIZE = 6;
const PULSE_SPEED = 0.002;
const PULSE_AMPLITUDE = 22;
const BREATHE_SPEED = 0.001;
const BREATHE_AMPLITUDE = 10;
const WAVE_SPEED = 0.0015;
const WAVE_AMPLITUDE = 15;
const WAVE_LENGTH = 3;
const SPARKLE_SPEED = 0.004;
const SPARKLE_THRESHOLD = 0.92;
const SPARKLE_BOOST = 25;
const SCALE_PULSE_SPEED = 0.0008;
const SCALE_PULSE_AMOUNT = 0.03;
const HUE_SPREAD = 45;
const GLOW_RADIUS_RATIO = 0.25;

const hashSeed = (value: string): number => {
  let hash = 0;
  for (const char of value) {
    hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  }
  return Math.abs(hash);
};

const createRng = (seed: number) => {
  let state = seed;
  return () => {
    state = (state + 0x6d_2b_79_f5) | 0;
    let tmp = Math.imul(state ^ (state >>> 15), 1 | state);
    tmp = (tmp + Math.imul(tmp ^ (tmp >>> 7), 61 | tmp)) ^ tmp;
    return ((tmp ^ (tmp >>> 14)) >>> 0) / 4_294_967_296;
  };
};

type HslTuple = [hue: number, saturation: number, lightness: number];

const generatePalette = (hash: number): [HslTuple, HslTuple, HslTuple] => {
  const rng = createRng(hash);
  const baseHue = rng() * 360;
  const saturation = 75 + rng() * 20;

  return [
    [baseHue, saturation, 55 + rng() * 10],
    [
      (baseHue - HUE_SPREAD + rng() * HUE_SPREAD * 2) % 360,
      saturation - 5 + rng() * 10,
      40 + rng() * 15,
    ],
    [
      (baseHue - HUE_SPREAD + rng() * HUE_SPREAD * 2) % 360,
      saturation - 10 + rng() * 15,
      60 + rng() * 15,
    ],
  ];
};

type GridCell = {
  colorIndex: number;
  phase: number;
  brightness: number;
  sparklePhase: number;
};

const generateGrid = (hash: number): GridCell[][] => {
  const rng = createRng(hash + 1);
  const grid: GridCell[][] = [];

  for (let y = 0; y < GRID_SIZE; y += 1) {
    grid[y] = [];
    for (let x = 0; x < GRID_SIZE; x += 1) {
      grid[y]![x] = {
        colorIndex: Math.floor(rng() * 3),
        phase: rng() * Math.PI * 2,
        brightness: 0.3 + rng() * 0.7,
        sparklePhase: rng() * Math.PI * 2,
      };
    }
  }

  return grid;
};

export default function AgentAvatar({
  seed,
  size = 64,
  animated = true,
  className,
  ...props
}: AgentAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    context.scale(dpr, dpr);

    const hash = hashSeed(seed);
    const palette = generatePalette(hash);
    const grid = generateGrid(hash);
    const cellSize = size / GRID_SIZE;
    const half = size / 2;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let shouldAnimate = animated && !motionQuery.matches;

    const draw = (time: number) => {
      context.clearRect(0, 0, size, size);

      const scale = shouldAnimate
        ? 1 + Math.sin(time * SCALE_PULSE_SPEED) * SCALE_PULSE_AMOUNT
        : 1;

      context.save();
      context.translate(half, half);
      context.scale(scale, scale);
      context.translate(-half, -half);

      context.beginPath();
      context.arc(half, half, half, 0, Math.PI * 2);
      context.clip();

      context.fillStyle = "#08080f";
      context.fillRect(0, 0, size, size);

      const breatheOffset = shouldAnimate
        ? Math.sin(time * BREATHE_SPEED) * BREATHE_AMPLITUDE
        : 0;

      for (let y = 0; y < GRID_SIZE; y += 1) {
        for (let x = 0; x < GRID_SIZE; x += 1) {
          const cell = grid[y]![x]!;
          const [hue, saturation, lightness] = palette[cell.colorIndex]!;

          const pulse = shouldAnimate
            ? Math.sin(time * PULSE_SPEED + cell.phase) * PULSE_AMPLITUDE
            : 0;

          const waveDistance = (x + y) / WAVE_LENGTH;
          const wave = shouldAnimate
            ? Math.sin(time * WAVE_SPEED + waveDistance) * WAVE_AMPLITUDE
            : 0;

          const sparkleValue = shouldAnimate
            ? Math.sin(time * SPARKLE_SPEED + cell.sparklePhase)
            : 0;
          const sparkle =
            sparkleValue > SPARKLE_THRESHOLD
              ? ((sparkleValue - SPARKLE_THRESHOLD) /
                  (1 - SPARKLE_THRESHOLD)) *
                SPARKLE_BOOST
              : 0;

          const finalLightness = Math.min(
            90,
            Math.max(
              20,
              (lightness + pulse + breatheOffset + wave + sparkle) *
                cell.brightness,
            ),
          );
          const finalSaturation = Math.min(100, saturation + 5);

          context.shadowColor = `hsl(${hue}, ${finalSaturation}%, ${finalLightness}%)`;
          context.shadowBlur = cellSize * 0.45;
          context.fillStyle = `hsl(${hue}, ${finalSaturation}%, ${finalLightness}%)`;
          context.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }

      context.shadowBlur = 0;
      context.restore();

      const [glowHue, glowSaturation, glowLightness] = palette[0];
      context.save();
      context.globalCompositeOperation = "screen";
      context.shadowColor = `hsla(${glowHue}, ${glowSaturation}%, ${glowLightness}%, 0.6)`;
      context.shadowBlur = size * GLOW_RADIUS_RATIO;
      context.beginPath();
      context.arc(half, half, half - 1, 0, Math.PI * 2);
      context.strokeStyle = `hsla(${glowHue}, ${glowSaturation}%, ${glowLightness}%, 0.15)`;
      context.lineWidth = 2;
      context.stroke();
      context.restore();

      if (shouldAnimate) {
        rafRef.current = requestAnimationFrame(draw);
      }
    };

    const handleMotionChange = () => {
      cancelAnimationFrame(rafRef.current);
      shouldAnimate = animated && !motionQuery.matches;
      if (shouldAnimate) {
        rafRef.current = requestAnimationFrame(draw);
      } else {
        draw(0);
      }
    };

    motionQuery.addEventListener("change", handleMotionChange);

    if (shouldAnimate) {
      rafRef.current = requestAnimationFrame(draw);
    } else {
      draw(0);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      motionQuery.removeEventListener("change", handleMotionChange);
    };
  }, [animated, seed, size]);

  return (
    <canvas
      aria-label={`Avatar for ${seed}`}
      className={cn("rounded-full", className)}
      ref={canvasRef}
      role="img"
      style={{ width: size, height: size }}
      {...props}
    />
  );
}
