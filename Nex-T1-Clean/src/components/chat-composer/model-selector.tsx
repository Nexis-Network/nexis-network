"use client";

import { memo, type ReactNode } from "react";

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { cn } from "@/lib/utils";
import {
  COMPOSER_MODEL_MENU_CLASS,
  COMPOSER_MODEL_ITEM_CLASS,
  COMPOSER_MODEL_TRIGGER_CLASS,
} from "@/components/chat-composer/composer-theme";
export type ComposerModelOption = {
  value: string;
  name: string;
  description?: string;
  badges?: string[];
  max?: boolean;
};

type ModelSelectorProps = {
  value: string;
  options: ReadonlyArray<ComposerModelOption>;
  onSelect: (value: string) => void;
  triggerClassName?: string;
  labelClassName?: string;
  leadingIcon?: ReactNode;
  labelOverride?: string;
  useGlassTrigger?: boolean;
};

const COMPACT_MODEL_TRIGGER_CLASS =
  "group inline-flex h-6 w-auto min-w-0 items-center justify-center gap-1.5 rounded-full border border-transparent bg-transparent px-0 text-[var(--auth-composer-muted,var(--muted-foreground))] shadow-none outline-none ring-0 ring-transparent transition-all duration-150 hover:bg-transparent hover:text-[var(--auth-composer-muted,var(--muted-foreground))] focus:outline-none focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-transparent";

function renderMaxBadge() {
  return (
    <div className="flex h-[14px] items-center gap-1.5 rounded border border-sky-400/20 bg-sky-400/10 px-1 py-0 text-sky-300">
      <span className="text-[9px] font-bold uppercase">MAX</span>
    </div>
  );
}

function renderDegenBadge() {
  return (
    <div className="flex h-[14px] items-center gap-1.5 rounded border border-orange-700/20 bg-orange-700/10 px-1 py-0 text-orange-600">
      <span className="text-[9px] font-bold uppercase">DEGEN</span>
    </div>
  );
}

const isNexT1Model = (model?: ComposerModelOption) =>
  model?.name === "Nex Instant";

function renderModelName(
  model: ComposerModelOption | undefined,
  className?: string,
) {
  if (!model) return null;
  if (isNexT1Model(model)) {
    return (
      <AnimatedShinyText
        shimmerWidth={80}
        className={cn(
          "mx-0 max-w-none text-xs font-semibold leading-tight",
          "bg-gradient-to-r from-transparent via-foreground/80 via-50% to-transparent dark:via-white/90",
          className,
        )}
      >
        {model.name}
      </AnimatedShinyText>
    );
  }
  return (
    <span
      className={cn(
        "text-xs font-medium leading-tight",
        className,
      )}
    >
      {model.name}
    </span>
  );
}

function ModelSelectorComponent({
  value,
  options,
  onSelect,
  triggerClassName,
  labelClassName,
  leadingIcon,
  labelOverride,
  useGlassTrigger = true,
}: ModelSelectorProps) {
  const activeOption = options.find((option) => option.value === value);
  const label = labelOverride ?? activeOption?.name ?? "Nex";

  return (
    <Select value={value} onValueChange={onSelect}>
      <SelectTrigger
        className={cn(
          useGlassTrigger
            ? COMPOSER_MODEL_TRIGGER_CLASS
            : COMPACT_MODEL_TRIGGER_CLASS,
          triggerClassName,
        )}
      >
        {leadingIcon ? <span className="shrink-0">{leadingIcon}</span> : null}
        <span
          className={cn("font-funnel text-xs font-medium", labelClassName)}
        >
          {label}
        </span>
      </SelectTrigger>
      <SelectContent
        noScroll
        className={cn(
          COMPOSER_MODEL_MENU_CLASS,
          "!border-[var(--auth-composer-menu-border)]",
        )}
      >
        {options.map((model) => {
          const showMax = Boolean("max" in model && model.max);
          const showDegen = model.badges?.includes("DEGEN");
          return (
            <SelectItem
              key={model.value}
              value={model.value}
              className={COMPOSER_MODEL_ITEM_CLASS}
            >
              <span className="flex flex-col gap-1">
                <span className="flex items-center gap-1 text-xs font-medium">
                  {renderModelName(model, "text-xs font-medium leading-tight")}
                  {showMax ? renderMaxBadge() : null}
                  {!showMax && showDegen ? renderDegenBadge() : null}
                </span>
                {model.description ? (
                  <span className="text-[11px]">
                    {model.description}
                  </span>
                ) : null}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

export const ModelSelector = memo(ModelSelectorComponent);
