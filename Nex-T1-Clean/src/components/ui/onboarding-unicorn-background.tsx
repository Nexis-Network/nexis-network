"use client";

import { useEffect, useState } from "react";
import UnicornScene from "unicornstudio-react/next";

import { isWebGLAvailable } from "@/lib/unicornstudio";

const ONBOARDING_PROJECT_ID = "pC8XJxtdLKKbFmFqFxQJ";
const ONBOARDING_SDK_URL =
  "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.1.4/dist/unicornStudio.umd.js";

export function OnboardingUnicornBackground() {
  const [canRenderScene, setCanRenderScene] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && isWebGLAvailable()) {
      setCanRenderScene(true);
    }
  }, []);

  if (!canRenderScene) {
    return (
      <div
        aria-hidden="true"
        data-testid="onboarding-unicorn-background-fallback"
        className="absolute inset-0 z-0 overflow-hidden rounded-[inherit] bg-[#050816]"
      >
        <div className="pointer-events-none absolute inset-0 bg-[#0f0f10]/10 backdrop-blur-sm" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(95,127,255,0.35),transparent_42%),radial-gradient(circle_at_20%_80%,rgba(40,210,255,0.18),transparent_30%),linear-gradient(180deg,rgba(8,12,22,0.45),rgba(4,6,12,0.88))]" />
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:34px_34px]" />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      data-testid="onboarding-unicorn-background"
      className="absolute inset-0 z-0 overflow-hidden rounded-[inherit]"
    >
      <UnicornScene
        projectId={ONBOARDING_PROJECT_ID}
        sdkUrl={ONBOARDING_SDK_URL}
        width="100%"
        height="100%"
        scale={1}
        dpi={1.5}
        fps={60}
        lazyLoad
        production
        altText="Decorative onboarding background"
        ariaLabel="Decorative onboarding background"
        className="absolute inset-0 h-full w-full"
        placeholderClassName="absolute inset-0 h-full w-full bg-[#050816]"
        showPlaceholderOnError
        showPlaceholderWhileLoading
      />
      <div className="pointer-events-none absolute inset-0 bg-[#0f0f10]/10 backdrop-blur-sm" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(128,164,255,0.26),transparent_34%),linear-gradient(180deg,rgba(5,8,22,0.12),rgba(5,8,22,0.68)_72%,rgba(4,6,12,0.92))]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#050816] via-[#050816]/72 to-transparent" />
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/6" />
    </div>
  );
}
