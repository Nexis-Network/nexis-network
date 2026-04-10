import { MoonStar, SunMedium, type LucideIcon } from "lucide-react";

import type { AppTheme } from "@/lib/theme/app-theme";

export type AppThemeOption = {
  value: AppTheme;
  label: string;
  description: string;
  icon: LucideIcon;
};

export const APP_THEME_OPTIONS: readonly AppThemeOption[] = [
  {
    value: "light",
    label: "Light",
    description: "Bright surfaces across /app and /settings.",
    icon: SunMedium,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Deeper dark surfaces and the dark composer treatment.",
    icon: MoonStar,
  },
] as const;
