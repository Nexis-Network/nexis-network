"use client";

import { useEffect, useState, type ComponentType } from "react";

import { isWebGLAvailable } from "@/lib/unicornstudio";

const ORB_PROJECT_ID = "D5BFXdFg2lZMSiRe2WZh";
const ORB_SDK_URL =
  "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.1.0-1/dist/unicornStudio.umd.js";

type UnicornSceneComponentProps = {
  projectId: string;
  sdkUrl: string;
  width: string;
  height: string;
  scale: number;
  dpi: number;
  fps: 60;
  lazyLoad: boolean;
  production: boolean;
  altText: string;
  ariaLabel: string;
  className: string;
  placeholderClassName: string;
  showPlaceholderOnError: boolean;
  showPlaceholderWhileLoading: boolean;
};

export function AgentOrbScene() {
  const [canRenderScene, setCanRenderScene] = useState(false);
  const [UnicornSceneComponent, setUnicornSceneComponent] = useState<
    ComponentType<UnicornSceneComponentProps> | null
  >(null);

  useEffect(() => {
    let isActive = true;

    if (typeof window !== "undefined" && isWebGLAvailable()) {
      setCanRenderScene(true);
      void import("unicornstudio-react/next")
        .then((mod) => {
          if (!isActive) return;
          const Scene = (mod.default ?? mod.UnicornScene) as ComponentType<UnicornSceneComponentProps>;
          setUnicornSceneComponent(() => Scene);
        })
        .catch(() => {
          if (!isActive) return;
          setCanRenderScene(false);
          setUnicornSceneComponent(null);
        });
    }

    return () => {
      isActive = false;
    };
  }, []);

  if (!canRenderScene || !UnicornSceneComponent) {
    return (
      <div
        aria-hidden="true"
        className="h-full w-full"
        style={{
          background:
            "radial-gradient(circle at 58% 58%, #7d77e0 0%, #6662cb 16%, #424684 34%, #262a56 53%, #171a38 69%, #101228 84%, #0a0b16 100%)",
        }}
      />
    );
  }

  return (
    <UnicornSceneComponent
      projectId={ORB_PROJECT_ID}
      sdkUrl={ORB_SDK_URL}
      width="100%"
      height="100%"
      scale={1}
      dpi={1.5}
      fps={60}
      lazyLoad
      production
      altText="Agent orb animation"
      ariaLabel="Agent orb animation"
      className="h-full w-full"
      placeholderClassName="h-full w-full bg-[#0a0b16]"
      showPlaceholderOnError
      showPlaceholderWhileLoading
    />
  );
}
