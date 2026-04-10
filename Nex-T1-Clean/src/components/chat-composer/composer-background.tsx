import { memo } from "react";
import { motion } from "motion/react";

import { Grainient } from "./grainient";
import {
  COMPOSER_BACKGROUND_WIPE_DURATION_SECONDS,
  useComposerBackgroundTransition,
} from "./hooks/use-composer-background-transition";
import type { ModelGrainientPalette } from "./utils/model-grainient-palette";

interface ComposerBackgroundProps {
  isActive?: boolean;
  modelValue?: string;
  showStarsOverlay?: boolean;
}

function ComposerBackgroundGrainientLayer({
  palette,
}: {
  palette: ModelGrainientPalette;
}) {
  return (
    <Grainient
      className="h-full w-full"
      color1={palette.color1}
      color2={palette.color2}
      color3={palette.color3}
      timeSpeed={0.25}
      colorBalance={0.02}
      warpStrength={0.85}
      warpFrequency={4.2}
      warpSpeed={2}
      warpAmplitude={50}
      blendAngle={-24}
      blendSoftness={0.52}
      rotationAmount={420}
      noiseScale={2}
      grainAmount={0.1}
      grainScale={2}
      grainAnimated
      contrast={1.5}
      gamma={1}
      saturation={1}
      centerX={0.12}
      centerY={-0.1}
      zoom={0.82}
    />
  );
}

export const ComposerBackground = memo(function ComposerBackground({
  isActive = true,
  modelValue,
  showStarsOverlay = false,
}: ComposerBackgroundProps) {
  const { activePalette, previousPalette, isTransitioning, transitionKey, clearTransition } =
    useComposerBackgroundTransition(modelValue);
  const basePalette = previousPalette ?? activePalette;

  return (
    <>
      <motion.div
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit]"
        initial={false}
        animate={{ opacity: isActive ? 1 : 0 }}
        transition={{
          opacity: { ease: [0.28, 0.72, 0.32, 1], duration: 0.6 },
        }}
      >
        <ComposerBackgroundGrainientLayer palette={basePalette} />
        {isTransitioning ? (
          <motion.div
            key={transitionKey}
            data-background-transition="wipe"
            className="absolute inset-0"
            initial={{ clipPath: "inset(0 100% 0 0)", opacity: 0.96 }}
            animate={{ clipPath: "inset(0 0% 0 0)", opacity: 1 }}
            transition={{
              clipPath: {
                ease: [0.22, 1, 0.36, 1],
                duration: COMPOSER_BACKGROUND_WIPE_DURATION_SECONDS,
              },
              opacity: {
                ease: [0.22, 1, 0.36, 1],
                duration: COMPOSER_BACKGROUND_WIPE_DURATION_SECONDS * 0.9,
              },
            }}
            onAnimationComplete={clearTransition}
          >
            <ComposerBackgroundGrainientLayer palette={activePalette} />
          </motion.div>
        ) : null}
      </motion.div>
      {showStarsOverlay ? (
        <motion.div
          className="pointer-events-none absolute inset-0 z-[1] rounded-[inherit]"
          style={{
            backgroundImage: "url('/assets/stars.svg')",
            backgroundPosition: "50% 60%",
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
          }}
          initial={false}
          animate={{ opacity: isActive ? 0.14 : 0 }}
          transition={{ opacity: { ease: [0.28, 0.72, 0.32, 1], duration: 0.65 } }}
        />
      ) : null}
      <motion.div
        className="pointer-events-none absolute inset-0 z-[2] rounded-[inherit] mix-blend-soft-light"
        style={{
          backgroundImage: "url('/assets/Noise.png')",
          backgroundPosition: "0 0",
          backgroundRepeat: "repeat",
          backgroundSize: "60px 60px",
        }}
        initial={false}
        animate={{ opacity: isActive ? 0.08 : 0 }}
        transition={{ opacity: { ease: [0.28, 0.72, 0.32, 1], duration: 0.65 } }}
      />
    </>
  );
});
