"use client";

import { Flame, Route, ShieldCheck, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { canUseMevProtection } from "@/lib/billing/feature-access";
import { useCreditsContext } from "@/components/providers/credits-provider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ChatExecutionPreferences } from "@/modules/chat/execution-preferences";

type ComposerExecutionPreferencesPanelProps = {
  preferences: ChatExecutionPreferences;
  onChange: (next: ChatExecutionPreferences) => void;
};

const toggleItems: Array<{
  key: keyof Pick<
    ChatExecutionPreferences,
    "mevProtection" | "crossChainRouting" | "gasPriority"
  >;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    key: "mevProtection",
    label: "MEV Protection",
    description: "Prefer protected routing when supported.",
    icon: ShieldCheck,
  },
  {
    key: "crossChainRouting",
    label: "Cross-chain Routing",
    description: "Allow the agent to route across chains.",
    icon: Route,
  },
  {
    key: "gasPriority",
    label: "Gas Priority",
    description: "Favor faster confirmations over standard pricing.",
    icon: Flame,
  },
];

function ToggleRow({
  icon: Icon,
  label,
  description,
  pressed,
  disabled = false,
  onPressedChange,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  pressed: boolean;
  disabled?: boolean;
  onPressedChange: () => void;
}) {
  return (
    <Tooltip delayDuration={120}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-pressed={pressed}
          disabled={disabled}
          onClick={onPressedChange}
          className={cn(
            "flex w-full items-center justify-between gap-3 rounded-xl border border-transparent bg-transparent px-3 py-2.5 text-left ring-0 ring-transparent transition-colors duration-150 hover:bg-[var(--auth-composer-menu-hover-bg,var(--accent))] focus-visible:outline-none focus-visible:ring-0",
            disabled ? "cursor-not-allowed opacity-50" : "",
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <Icon
              className="size-3.5 shrink-0"
            />
            <span className="truncate text-xs font-medium">{label}</span>
          </div>

          <span
            aria-hidden="true"
            className={cn(
              "size-2.5 shrink-0 rounded-full border transition-colors duration-150",
              pressed
                ? "border-[var(--auth-ring)] bg-[var(--auth-ring)]"
                : "border-[var(--auth-composer-menu-border,var(--border))] bg-transparent",
            )}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={8}
        className="max-w-56 text-xs leading-relaxed"
      >
        {description}
      </TooltipContent>
    </Tooltip>
  );
}

export function ComposerExecutionPreferencesPanel({
  preferences,
  onChange,
}: ComposerExecutionPreferencesPanelProps) {
  const { plan } = useCreditsContext();
  const mevProtectionAllowed = canUseMevProtection(plan);

  return (
    <div className="flex w-full flex-col items-stretch gap-1.5">
      {toggleItems.map(({ key, label, description, icon }) => (
        <ToggleRow
          key={key}
          icon={icon}
          label={label}
          description={
            key === "mevProtection" && !mevProtectionAllowed
              ? "Available on paid plans."
              : description
          }
          pressed={
            key === "mevProtection" && !mevProtectionAllowed
              ? false
              : preferences[key]
          }
          disabled={key === "mevProtection" && !mevProtectionAllowed}
          onPressedChange={() =>
            onChange({
              ...preferences,
              [key]:
                key === "mevProtection" && !mevProtectionAllowed
                  ? false
                  : !preferences[key],
            })
          }
        />
      ))}
    </div>
  );
}
