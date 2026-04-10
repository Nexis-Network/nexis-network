"use client";

import { useEffect, useState } from "react";
import UnicornScene from "unicornstudio-react/next";

import { isWebGLAvailable } from "@/lib/unicornstudio";

const AUTH_UNICORN_PROJECT_ID = "pC8XJxtdLKKbFmFqFxQJ";
const AUTH_UNICORN_SDK_URL =
  "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.1.4/dist/unicornStudio.umd.js";

export function AuthShellBackground(): React.JSX.Element {
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
        data-testid="auth-shell-background-fallback"
        className="absolute inset-0 z-0 overflow-hidden rounded-[inherit] bg-[#050816]"
      >
        <div className="pointer-events-none absolute inset-0 bg-[#0f0f10]/10 backdrop-blur-sm" />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      data-testid="auth-shell-background"
      className="absolute inset-0 z-0 overflow-hidden rounded-[inherit] bg-[#050816]"
    >
      <UnicornScene
        projectId={AUTH_UNICORN_PROJECT_ID}
        sdkUrl={AUTH_UNICORN_SDK_URL}
        width="100%"
        height="100%"
        scale={1}
        dpi={1.5}
        fps={60}
        lazyLoad
        production
        altText="Decorative auth background"
        ariaLabel="Decorative auth background"
        className="absolute inset-0 h-full w-full"
        placeholderClassName="absolute inset-0 h-full w-full bg-[#050816]"
        showPlaceholderOnError
        showPlaceholderWhileLoading
      />
      <div className="pointer-events-none absolute inset-0 bg-[#0f0f10]/10 backdrop-blur-sm" />
    </div>
  );
}
