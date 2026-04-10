"use client";

import Image from "next/image";
import { type ComponentProps, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { resolveAppThemeMode } from "@/lib/theme/app-theme";

type LogoProps = Omit<ComponentProps<typeof Image>, "src" | "alt">;

const getLogoSource = (
  themeMode: "light" | "dark",
  width: number,
  height: number,
) => {
  const isFullLogo = width >= height * 2 || width >= 96;
  const isLightTheme = themeMode === "light";

  if (isFullLogo) {
    return isLightTheme ? "/logo/nexis-logo-full-light.svg" : "/logo/nexis-logo-full-dark.svg";
  }

  return isLightTheme ? "/logo/nexis-logo-light.svg" : "/logo/nexis-logo-dark.svg";
};

export const Logo = ({ className, width = 48, height = 48, ...rest }: LogoProps) => {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { style, ...imageProps } = rest;
  const combinedClassName = className ?? "";
  const normalizedWidth = typeof width === "number" ? width : Number(width);
  const normalizedHeight = typeof height === "number" ? height : Number(height);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder during SSR
    return (
      <div
        className={`${combinedClassName} bg-muted animate-pulse rounded`}
        style={{ width: normalizedWidth, height: normalizedHeight, ...style }}
      />
    );
  }

  const logoSrc = getLogoSource(
    resolveAppThemeMode(theme, resolvedTheme),
    normalizedWidth,
    normalizedHeight,
  );

  return (
    <Image
      alt="Nexis Logo"
      className={combinedClassName}
      height={height}
      src={logoSrc}
      width={width}
      style={{ height: "auto", ...style }}
      {...imageProps}
    />
  );
};
