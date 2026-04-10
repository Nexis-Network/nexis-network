"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import styles from "./cosmic-border.module.css";

type CosmicBorderProps = {
  children: ReactNode;
  className?: string;
  active?: boolean;
};

export function CosmicBorder({ children, className, active = true }: CosmicBorderProps) {
  const overlaysActive = active;

  return (
    <div className={cn(styles.wrapper, className)} data-active={overlaysActive ? "true" : "false"}>
      {overlaysActive ? <div className={styles.galaxy} aria-hidden /> : null}
      <div className={styles.searchContainer}>
        {overlaysActive ? <div className={styles.nebula} aria-hidden /> : null}
        {overlaysActive ? <div className={styles.starfield} aria-hidden /> : null}
        {overlaysActive ? <div className={styles.cosmicDust} aria-hidden /> : null}
        {overlaysActive ? <div className={styles.cosmicDust} aria-hidden /> : null}
        {overlaysActive ? <div className={styles.cosmicDust} aria-hidden /> : null}
        {overlaysActive ? <div className={styles.stardust} aria-hidden /> : null}
        {overlaysActive ? <div className={styles.cosmicRing} aria-hidden /> : null}
        <div className={styles.main}>
          {children}
          {overlaysActive ? <div className={styles.inputMask} aria-hidden /> : null}
          {overlaysActive ? <div className={styles.cosmicGlow} aria-hidden /> : null}
          {overlaysActive ? <div className={styles.wormholeBorder} aria-hidden /> : null}
        </div>
      </div>
    </div>
  );
}
