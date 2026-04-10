"use client";

import { useEffect, useState } from "react";
import UnicornScene from "unicornstudio-react/next";
import { isWebGLAvailable } from "@/lib/unicornstudio";

const DEFAULT_PROJECT_ID = "879QfCXlKtCrG030CL67";

type UnicornBackgroundProps = {
  projectId?: string;
  jsonUrl?: string;
};

export function UnicornBackground({ projectId = DEFAULT_PROJECT_ID, jsonUrl }: UnicornBackgroundProps) {
  // Use the same embed strategy as the landing hero: UnicornScene React wrapper
  const sceneProps = jsonUrl ? { jsonFilePath: jsonUrl } : { projectId };
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Only render if WebGL is available to avoid console spam and crashes
    if (typeof window !== "undefined" && isWebGLAvailable()) {
      setShouldRender(true);
    }
  }, []);

  if (!shouldRender) {
     return (
        <div className="absolute inset-0 z-0 overflow-hidden bg-background">
            <div className="absolute inset-0 bg-gradient-to-b from-black via-slate-900 to-background" />
        </div>
     );
  }

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <UnicornScene
        {...sceneProps}
        width="100%"
        height="100%"
        scale={1}
        dpi={1.5}
        fps={60}
        lazyLoad={false}
        production
        altText="Animated background"
        ariaLabel="Animated background"
        className="absolute inset-0 h-full w-full object-cover"
        placeholderClassName="absolute inset-0 h-full w-full bg-gradient-to-b from-black via-slate-900 to-background"
        showPlaceholderWhileLoading
        showPlaceholderOnError
      />
      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent via-transparent to-background" />
      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-background/30 via-background/0 to-background" />
    </div>
  );
}
