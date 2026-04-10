import * as React from "react";

import {
  Button as ShadcnButton,
} from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TONE_TO_VARIANT = {
  primary: "default",
  surface: "outline",
  secondary: "secondary",
  ghost: "ghost",
  destructive: "destructive",
} as const;

type SettingsButtonTone = keyof typeof TONE_TO_VARIANT;

type ShadcnButtonProps = React.ComponentPropsWithoutRef<typeof ShadcnButton>;
type SettingsButtonRef = React.ElementRef<typeof ShadcnButton>;

export interface SettingsButtonProps extends ShadcnButtonProps {
  children?: React.ReactNode;
  tone?: SettingsButtonTone;
}

const SettingsButton = React.forwardRef<SettingsButtonRef, SettingsButtonProps>(
  ({ className, tone, variant, size, ...props }, ref) => {
    const resolvedVariant = variant ?? (tone ? TONE_TO_VARIANT[tone] : undefined);
    const resolvedSize = size ?? "sm";

    return (
      <ShadcnButton
        ref={ref}
        data-settings-button="true"
        variant={resolvedVariant}
        size={resolvedSize}
        className={cn(
          "rounded-[var(--settings-radius)] border-[var(--settings-border)] shadow-none transition-colors",
          resolvedSize === "sm" && "h-8 px-3 text-xs",
          resolvedSize === "icon" && "size-8",
          resolvedSize === "icon-sm" && "size-7",
          className,
        )}
        {...props}
      />
    );
  },
);

SettingsButton.displayName = "SettingsButton";

export {
  SettingsButton,
  SettingsButton as Button,
};

export type {
  SettingsButtonProps as ButtonProps,
};
