import fs from "node:fs";
import path from "node:path";
import Image from "next/image";

import { cn } from "@/lib/utils";

const HOBBES_HERO_DIR = path.join(process.cwd(), "public", "hobbes", "hero");
const HOBBES_HERO_ASSET_FILES = {
  composite: "hero-canvas-composite.png",
  container: "hero-container.png",
  layerOne: "canvas-01-element.png",
  layerTwo: "canvas-02-element.png",
} as const;
const HOBBES_HERO_FALLBACK_BACKGROUND =
  "absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(92,171,228,0.24),transparent_24%),radial-gradient(circle_at_20%_24%,rgba(149,228,92,0.12),transparent_24%),linear-gradient(180deg,#06080c_0%,#090b0f_48%,#03040c_100%)]";

export type HobbesHeroCanvasMode = "composite" | "container" | "layered" | "missing";

type HobbesHeroAssetSelection = {
  mode: HobbesHeroCanvasMode;
  srcs: readonly string[];
  missingFiles: readonly string[];
};

function heroAssetExists(fileName: string) {
  return fs.existsSync(path.join(HOBBES_HERO_DIR, fileName));
}

function toPublicHeroSrc(fileName: string) {
  return `/hobbes/hero/${fileName}`;
}

function resolveHobbesHeroAssetSelection(preferLayered = false): HobbesHeroAssetSelection {
  const compositeExists = heroAssetExists(HOBBES_HERO_ASSET_FILES.composite);
  const containerExists = heroAssetExists(HOBBES_HERO_ASSET_FILES.container);
  const layeredAssets = [HOBBES_HERO_ASSET_FILES.layerOne, HOBBES_HERO_ASSET_FILES.layerTwo].filter(heroAssetExists);

  if (compositeExists && !preferLayered) {
    return {
      mode: "composite",
      srcs: [toPublicHeroSrc(HOBBES_HERO_ASSET_FILES.composite)],
      missingFiles: [],
    };
  }

  if (containerExists && !preferLayered) {
    return {
      mode: "container",
      srcs: [toPublicHeroSrc(HOBBES_HERO_ASSET_FILES.container)],
      missingFiles: [],
    };
  }

  if (layeredAssets.length >= 2) {
    return {
      mode: "layered",
      srcs: layeredAssets.map(toPublicHeroSrc),
      missingFiles: [],
    };
  }

  if (compositeExists) {
    return {
      mode: "composite",
      srcs: [toPublicHeroSrc(HOBBES_HERO_ASSET_FILES.composite)],
      missingFiles: [],
    };
  }

  if (containerExists) {
    return {
      mode: "container",
      srcs: [toPublicHeroSrc(HOBBES_HERO_ASSET_FILES.container)],
      missingFiles: [],
    };
  }

  return {
    mode: "missing",
    srcs: [],
    missingFiles: Object.values(HOBBES_HERO_ASSET_FILES),
  };
}

const DEFAULT_HOBBES_HERO_ASSET_SELECTION = resolveHobbesHeroAssetSelection();

if (process.env.NODE_ENV !== "production" && DEFAULT_HOBBES_HERO_ASSET_SELECTION.mode === "missing") {
  console.warn(
    `[hobbes-hero] Missing extracted hero assets in public/hobbes/hero. Expected one of ${HOBBES_HERO_ASSET_FILES.composite}, ${HOBBES_HERO_ASSET_FILES.container}, or the layered pair ${HOBBES_HERO_ASSET_FILES.layerOne} + ${HOBBES_HERO_ASSET_FILES.layerTwo}.`,
  );
}

export function getHobbesHeroAssetSelection(options: { preferLayered?: boolean } = {}) {
  if (options.preferLayered) {
    return resolveHobbesHeroAssetSelection(true);
  }

  return DEFAULT_HOBBES_HERO_ASSET_SELECTION;
}

type HobbesHeroCanvasProps = {
  className?: string;
  preferLayered?: boolean;
};

export function HobbesHeroCanvas({ className, preferLayered = false }: HobbesHeroCanvasProps) {
  const assetSelection = getHobbesHeroAssetSelection({ preferLayered });
  const primarySrc = assetSelection.srcs[0];

  return (
    <div aria-hidden className={cn("relative size-full overflow-hidden", className)}>
      {assetSelection.mode === "missing" ? (
        <div className={HOBBES_HERO_FALLBACK_BACKGROUND} />
      ) : assetSelection.mode === "layered" ? (
        assetSelection.srcs.map((src, index) => (
          <Image
            key={src}
            src={src}
            alt=""
            aria-hidden="true"
            fill
            priority={index === 0}
            className="object-cover object-center"
            sizes="100vw"
          />
        ))
      ) : !primarySrc ? (
        <div className={HOBBES_HERO_FALLBACK_BACKGROUND} />
      ) : (
        <Image
          src={primarySrc}
          alt=""
          aria-hidden="true"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
      )}
    </div>
  );
}
