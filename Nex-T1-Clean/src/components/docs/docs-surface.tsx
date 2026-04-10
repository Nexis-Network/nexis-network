import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

const DOCS_OVERLAY_ASSETS = {
  "horizon-grid": "/assets/overlays/Horizon-Grid.svg",
} as const;

export type DocsOverlayAsset = keyof typeof DOCS_OVERLAY_ASSETS;

export function DocsSurface({
  children,
  className,
  contentClassName,
  overlayAsset,
  overlayClassName,
  overlayStyle,
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  overlayAsset?: DocsOverlayAsset;
  overlayClassName?: string;
  overlayStyle?: CSSProperties;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-border/60 bg-card",
        className,
      )}
    >
      {overlayAsset ? (
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 bg-no-repeat opacity-70",
            "[mask-image:linear-gradient(180deg,rgba(0,0,0,0.95),rgba(0,0,0,0.2))] dark:[mask-image:linear-gradient(180deg,rgba(255,255,255,0.95),rgba(255,255,255,0.2))]",
            overlayClassName,
          )}
          style={{
            backgroundImage: `url(${DOCS_OVERLAY_ASSETS[overlayAsset]})`,
            backgroundPosition: "center top",
            backgroundSize: "cover",
            ...overlayStyle,
          }}
        />
      ) : null}
      <div className={cn("relative", contentClassName)}>{children}</div>
    </div>
  );
}
