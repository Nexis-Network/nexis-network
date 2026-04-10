"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import useSound from "use-sound";

import { cn } from "@/lib/utils";

const VoiceModeOverlay = () => {
  const [preview, setPreview] = useState(false);
  const [play] = useSound("/audio/sweep1.mp3", {
    volume: 0.7,
  });

  const handleToggleIntelligence = () => {
    !preview && play();

    setPreview((x) => !x);
  };

  return (
    <motion.div className="relative flex h-full w-full">
      {/* Blur overlay (pseudo-element replacement) */}
      <AppleBorderGradient intensity="xl" preview={preview} />

      <div className="absolute left-1/2 top-[30%] grid -translate-x-1/2 content-start justify-items-center gap-6 text-center">
        <span className="text-foreground after:to-foreground relative max-w-[12ch] text-xs uppercase leading-tight opacity-40 after:absolute after:left-1/2 after:top-full after:h-16 after:w-px after:bg-gradient-to-b after:from-transparent after:content-['']">
          Click to see the border gradient
        </span>
      </div>

      {/* All Content */}
      <div className="z-2 relative flex size-full items-center justify-center">
        <button
          onClick={handleToggleIntelligence}
          style={{ boxShadow: "0 0 0 1px var(--muted)" }}
          className="bg-background rounded-2xl px-5 py-2 transition-all duration-300 active:scale-[0.98]"
        >
          Turn {preview ? "On" : "Off"} Apple Intelligence
        </button>
      </div>
    </motion.div>
  );
};

export const AppleBorderGradient = ({
  preview,
  className,
  intensity = "lg",
}: {
  preview: boolean;
  className?: string;
  intensity: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
}) => {
  return (
    <AnimatePresence>
      {preview && (
        <motion.div
          initial={{ opacity: 0 }}
          exit={{ opacity: 0 }}
          animate={{
            opacity: 1,
            background: [
              "linear-gradient(0deg, rgb(59, 130, 246), rgb(168, 85, 247), rgb(239, 68, 68), rgb(249, 115, 22))",
              "linear-gradient(360deg, rgb(59, 130, 246), rgb(168, 85, 247), rgb(239, 68, 68), rgb(249, 115, 22))",
            ],
          }}
          transition={{
            opacity: {
              duration: 0.5,
              ease: "easeInOut",
            },
            duration: 5,
            repeat: Infinity,
            ease: "linear",
          }}
          className={cn(
            "after:bg-muted absolute size-full after:absolute after:inset-[2px] after:content-['']",
            className,
            intensity == "xs" && "after:blur-xs",
            intensity == "sm" && "after:blur-sm",
            intensity == "md" && "after:blur-md",
            intensity == "lg" && "after:blur-lg",
            intensity == "xl" && "after:blur-xl",
            intensity == "2xl" && "after:blur-2xl",
            intensity == "3xl" && "after:blur-3xl",
          )}
        />
      )}
    </AnimatePresence>
  );
};

export { VoiceModeOverlay };
