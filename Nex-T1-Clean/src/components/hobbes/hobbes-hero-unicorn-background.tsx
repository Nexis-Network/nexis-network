"use client";

import { useEffect, useState } from "react";
import UnicornScene from "unicornstudio-react/next";

import { isWebGLAvailable } from "@/lib/unicornstudio";

const HOBBES_HERO_UNICORN_PROJECT_ID = "7ZtMz4KgDM9xfkFTTXnK";
const HOBBES_HERO_UNICORN_SDK_URL =
  "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.1.4/dist/unicornStudio.umd.js";

export function HobbesHeroUnicornBackground() {
  const [canRenderScene, setCanRenderScene] = useState(false);

  useEffect(() => {
    setCanRenderScene(isWebGLAvailable());
  }, []);

  if (!canRenderScene) {
    return (
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_72%_22%,rgba(118,184,255,0.26),transparent_22%),radial-gradient(circle_at_30%_18%,rgba(255,255,255,0.08),transparent_30%),linear-gradient(180deg,#06080c_0%,#090b0f_48%,#03040c_100%)]"
      />
    );
  }

  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      <UnicornScene
        projectId={HOBBES_HERO_UNICORN_PROJECT_ID}
        sdkUrl={HOBBES_HERO_UNICORN_SDK_URL}
        width="100%"
        height="100%"
        scale={1}
        dpi={1.5}
        fps={60}
        lazyLoad={false}
        production
        altText="Decorative Hobbes hero background"
        ariaLabel="Decorative Hobbes hero background"
        className="absolute inset-0 h-full w-full"
        placeholderClassName="absolute inset-0 h-full w-full bg-[#03040c]"
        showPlaceholderOnError
        showPlaceholderWhileLoading
      />
    </div>
  );
}
