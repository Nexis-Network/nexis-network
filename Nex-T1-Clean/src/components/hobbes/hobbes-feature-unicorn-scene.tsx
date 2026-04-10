"use client";

import { useEffect, useState } from "react";
import UnicornScene from "unicornstudio-react/next";

import { isWebGLAvailable } from "@/lib/unicornstudio";

const HOBBES_FEATURE_UNICORN_PROJECT_ID = "Q97ts0gJjPFVY9NbpZry";
const HOBBES_FEATURE_UNICORN_SDK_URL =
  "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.1.4/dist/unicornStudio.umd.js";

export function HobbesFeatureUnicornScene() {
  const [canRenderScene, setCanRenderScene] = useState(false);

  useEffect(() => {
    setCanRenderScene(isWebGLAvailable());
  }, []);

  if (!canRenderScene) {
    return (
      <div
        aria-label="Nex Copilot product interface"
        role="img"
        className="absolute inset-0 bg-[radial-gradient(circle_at_78%_42%,rgba(117,196,255,0.18),transparent_24%),radial-gradient(circle_at_66%_22%,rgba(255,255,255,0.07),transparent_18%),linear-gradient(180deg,#03040c_0%,#070910_18%,#070910_82%,#03040c_100%),linear-gradient(90deg,#03040c_0%,#03040c_18%,#05060d_38%,#070910_72%,#03040c_96%,#03040c_100%)]"
      />
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#03040c]">
      <div className="absolute inset-0 origin-right scale-[0.7] opacity-92">
        <UnicornScene
          projectId={HOBBES_FEATURE_UNICORN_PROJECT_ID}
          sdkUrl={HOBBES_FEATURE_UNICORN_SDK_URL}
          width="100%"
          height="100%"
          scale={1}
          dpi={1.5}
          fps={60}
          lazyLoad={false}
          production
          altText="Nex Copilot product interface"
          ariaLabel="Nex Copilot product interface"
          className="absolute inset-0 h-full w-full"
          placeholderClassName="absolute inset-0 h-full w-full bg-[#03040c]"
          showPlaceholderOnError
          showPlaceholderWhileLoading
        />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#03040c_0%,transparent_16%,transparent_84%,#03040c_100%),linear-gradient(90deg,#03040c_0%,#03040c_20%,transparent_44%,transparent_78%,#03040c_96%,#03040c_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-[58%] bg-gradient-to-r from-[#03040c] via-[#03040c]/90 via-45% to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-[22%] bg-gradient-to-r from-transparent via-[#03040c]/76 to-[#03040c]"
      />
    </div>
  );
}
