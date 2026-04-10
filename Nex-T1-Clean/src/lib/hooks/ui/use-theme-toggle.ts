"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";

import { runAppThemeTransition } from "./theme-transition";

type ThemeSelection = "light" | "dark";

export const useThemeToggle = ({
}: Record<string, never> = {}) => {
  const { setTheme, resolvedTheme } = useTheme();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (!resolvedTheme) return;
    setIsDark(resolvedTheme === "dark");
  }, [resolvedTheme]);

  const runTransition = useCallback(
    (targetTheme: ThemeSelection) => {
      runAppThemeTransition({ nextTheme: targetTheme, setTheme });
    },
    [setTheme],
  );

  const setCrazyLightTheme = useCallback(() => {
    setIsDark(false);
    runTransition("light");
  }, [runTransition]);

  const setCrazyDarkTheme = useCallback(() => {
    setIsDark(true);
    runTransition("dark");
  }, [runTransition]);

  const toggleTheme = useCallback(() => {
    const nextTheme = isDark ? "light" : "dark";
    if (nextTheme === "dark") {
      setCrazyDarkTheme();
    } else {
      setCrazyLightTheme();
    }
  }, [isDark, setCrazyDarkTheme, setCrazyLightTheme]);

  const actions = useMemo(
    () => ({
      isDark,
      setIsDark,
      toggleTheme,
      setCrazyLightTheme,
      setCrazyDarkTheme,
    }),
    [isDark, setCrazyDarkTheme, setCrazyLightTheme, toggleTheme],
  );

  return actions;
};
