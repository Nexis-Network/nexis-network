"use client";

import {
  forwardRef,
  useEffect,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
import {
  Check,
  ChevronDown,
  Flame,
  Percent,
  Settings2,
  ShieldAlert,
  Zap,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  CHAT_EXECUTION_SLIPPAGE_OPTIONS,
  formatChatExecutionGasPrice,
  formatChatExecutionSlippage,
  hasExecutionPreferenceOverrides,
  type ChatExecutionPreferences,
} from "@/modules/chat/execution-preferences";

import type { ChatComposerStyle } from "./types";
import {
  COMPOSER_ICON_BUTTON_CLASS,
  COMPOSER_ICON_CLASS,
  COMPOSER_MENU_CONTENT_CLASS,
  COMPOSER_MENU_LABEL_CLASS,
  COMPOSER_MENU_SEPARATOR_CLASS,
  COMPOSER_MENU_SUBCONTENT_CLASS,
  COMPOSER_TEXT_TRIGGER_CLASS,
} from "./composer-theme";

import { ComposerExecutionPreferencesPanel } from "./composer-execution-preferences-panel";
import { RiskWarningDialog, type RiskWarning } from "./risk-warning-dialog";

type ComposerRiskLevel = "low" | "medium" | "high";
type ComposerPreferencesTriggerVariant = "icon" | "text";

interface ComposerPreferencesMenuProps {
  executionPreferences: ChatExecutionPreferences;
  onExecutionPreferencesChange: (value: ChatExecutionPreferences) => void;
  composerStyle: ChatComposerStyle;
  onComposerStyleChange: (value: ChatComposerStyle) => void;
  className?: string;
  triggerVariant?: ComposerPreferencesTriggerVariant;
  triggerLabel?: string;
  triggerClassName?: string;
  labelClassName?: string;
  triggerIcon?: ReactNode;
}

type ComposerPreferencesTriggerProps = ComponentPropsWithoutRef<"button"> & {
  open: boolean;
  hasOverrides: boolean;
  triggerVariant: ComposerPreferencesTriggerVariant;
  triggerLabel: string;
  triggerClassName?: string;
  labelClassName?: string;
  triggerIcon?: ReactNode;
};

const ComposerPreferencesTrigger = forwardRef<
  HTMLButtonElement,
  ComposerPreferencesTriggerProps
>(function ComposerPreferencesTrigger(
  {
    open,
    hasOverrides: _hasOverrides,
    triggerVariant,
    triggerLabel,
    triggerClassName,
    labelClassName,
    triggerIcon,
    className,
    ...buttonProps
  },
  ref,
) {
  if (triggerVariant === "text") {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={triggerLabel}
        {...buttonProps}
        className={cn(COMPOSER_TEXT_TRIGGER_CLASS, triggerClassName, className)}
      >
        {triggerIcon ? <span className="shrink-0">{triggerIcon}</span> : null}
        <span className={cn("font-funnel text-xs font-medium", labelClassName)}>
          {triggerLabel}
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 transition-transform duration-150",
            open && "rotate-180",
          )}
        />
      </button>
    );
  }

  return (
    <button
      ref={ref}
      type="button"
      aria-label={triggerLabel}
      {...buttonProps}
      className={cn(
        COMPOSER_ICON_BUTTON_CLASS,
        triggerClassName,
        className,
      )}
    >
      {triggerIcon ? (
        <span className="shrink-0 text-current">{triggerIcon}</span>
      ) : (
        <Settings2 className={COMPOSER_ICON_CLASS} />
      )}
    </button>
  );
});

function ComposerRiskLevelValue({ level }: { level: ComposerRiskLevel }) {
  return (
    <span
      className={cn(
        "capitalize",
        level === "high"
          ? "text-red-400"
          : level === "medium"
            ? "text-yellow-400"
            : "text-green-400",
      )}
    >
      {level}
    </span>
  );
}

export function ComposerPreferencesMenu({
  executionPreferences,
  onExecutionPreferencesChange,
  composerStyle,
  onComposerStyleChange,
  className,
  triggerVariant = "icon",
  triggerLabel = "Preferences",
  triggerClassName,
  labelClassName,
  triggerIcon,
}: ComposerPreferencesMenuProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const resolvedTriggerIcon = triggerIcon ?? (
    <Image
      src={
        isDark
          ? "/assets/chat-composer-icons/preferences-dark.svg"
          : "/assets/chat-composer-icons/preferences-light.svg"
      }
      alt=""
      width={20}
      height={20}
      className={COMPOSER_ICON_CLASS}
    />
  );
  const [open, setOpen] = useState(false);
  const [gasPriceDraft, setGasPriceDraft] = useState(
    executionPreferences.gasPriceGwei != null
      ? formatChatExecutionGasPrice(executionPreferences.gasPriceGwei)
      : "",
  );
  const [riskLevel, setRiskLevel] = useState<ComposerRiskLevel>("medium");
  const [riskWarning, setRiskWarning] = useState<RiskWarning | null>(null);
  const [pendingRiskLevel, setPendingRiskLevel] =
    useState<ComposerRiskLevel | null>(null);

  const hasOverrides = hasExecutionPreferenceOverrides(executionPreferences);

  useEffect(() => {
    setGasPriceDraft(
      executionPreferences.gasPriceGwei != null
        ? formatChatExecutionGasPrice(executionPreferences.gasPriceGwei)
        : "",
    );
  }, [executionPreferences.gasPriceGwei]);

  const handleMaxSlippageChange = (
    maxSlippagePct: ChatExecutionPreferences["maxSlippagePct"],
  ) => {
    onExecutionPreferencesChange({
      ...executionPreferences,
      maxSlippagePct,
    });
  };

  const handleGasPriceCommit = () => {
    const trimmed = gasPriceDraft.trim();

    if (!trimmed) {
      setGasPriceDraft("");
      if (executionPreferences.gasPriceGwei != null) {
        onExecutionPreferencesChange({
          ...executionPreferences,
          gasPriceGwei: null,
        });
      }
      return;
    }

    const parsed = Number.parseFloat(trimmed);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setGasPriceDraft(
        executionPreferences.gasPriceGwei != null
          ? formatChatExecutionGasPrice(executionPreferences.gasPriceGwei)
          : "",
      );
      return;
    }

    const normalized = Number.parseFloat(parsed.toFixed(4));
    setGasPriceDraft(formatChatExecutionGasPrice(normalized));

    if (executionPreferences.gasPriceGwei !== normalized) {
      onExecutionPreferencesChange({
        ...executionPreferences,
        gasPriceGwei: normalized,
      });
    }
  };

  const clearGasPricePreference = () => {
    setGasPriceDraft("");

    if (executionPreferences.gasPriceGwei != null) {
      onExecutionPreferencesChange({
        ...executionPreferences,
        gasPriceGwei: null,
      });
    }
  };

  const handleRiskLevelChange = (level: ComposerRiskLevel) => {
    if (level === "low") {
      setRiskLevel(level);
      return;
    }

    setPendingRiskLevel(level);
    setRiskWarning({
      title: `${level.charAt(0).toUpperCase() + level.slice(1)} Risk Mode`,
      description: `You are about to elevate the agent's risk profile to ${level}. This permits the execution of complex, autonomous strategies which carry significant inherent risks, including smart contract failures, market volatility, and potential total loss of funds. AI models can hallucinate or misinterpret instructions. By proceeding, you accept full liability for all outcomes.`,
      confirmLabel: `Enable ${level} Risk`,
    });
  };

  const handleWarningConfirm = () => {
    if (pendingRiskLevel) {
      setRiskLevel(pendingRiskLevel);
      setPendingRiskLevel(null);
    }
    setRiskWarning(null);
  };

  const handleWarningCancel = () => {
    setPendingRiskLevel(null);
    setRiskWarning(null);
  };

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <ComposerPreferencesTrigger
            open={open}
            hasOverrides={hasOverrides}
            triggerVariant={triggerVariant}
            triggerLabel={triggerLabel}
            triggerClassName={triggerClassName}
            labelClassName={labelClassName}
            triggerIcon={resolvedTriggerIcon}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={8}
          className={cn(
            COMPOSER_MENU_CONTENT_CLASS,
            "!border-[var(--auth-composer-menu-border)]",
            className,
          )}
        >
          <DropdownMenuLabel className={COMPOSER_MENU_LABEL_CLASS}>
            Preferences
          </DropdownMenuLabel>

          <div className="px-2 py-1">
            <ComposerExecutionPreferencesPanel
              preferences={executionPreferences}
              onChange={onExecutionPreferencesChange}
            />
          </div>

          <DropdownMenuSeparator className={COMPOSER_MENU_SEPARATOR_CLASS} />

          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs">
              <div className="flex items-center gap-2">
                <Percent className="size-3.5" />
                <span>Max Slippage</span>
              </div>
              <span>
                {formatChatExecutionSlippage(
                  executionPreferences.maxSlippagePct,
                )}
              </span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent
                className={cn(
                  COMPOSER_MENU_SUBCONTENT_CLASS,
                  "w-36 !border-[var(--auth-composer-menu-border)]",
                )}
              >
                {CHAT_EXECUTION_SLIPPAGE_OPTIONS.map((value) => (
                  <DropdownMenuItem
                    key={value}
                    onClick={() => handleMaxSlippageChange(value)}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs"
                  >
                    <span>{formatChatExecutionSlippage(value)}</span>
                    {executionPreferences.maxSlippagePct === value ? (
                      <Check className="size-3 text-sky-500" />
                    ) : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs">
              <div className="flex items-center gap-2">
                <Flame className="size-3.5" />
                <span>Gas prices</span>
              </div>
              <span>
                {executionPreferences.gasPriceGwei != null
                  ? `${formatChatExecutionGasPrice(executionPreferences.gasPriceGwei)} gwei`
                  : "Auto"}
              </span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent
                className={cn(
                  COMPOSER_MENU_SUBCONTENT_CLASS,
                  "w-52 p-2 !border-[var(--auth-composer-menu-border)]",
                )}
              >
                <div
                  className="space-y-2"
                  onKeyDown={(event) => {
                    event.stopPropagation();
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleGasPriceCommit();
                    }
                  }}
                >
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium uppercase tracking-[0.08em]">
                      Custom gas target
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.0001"
                        inputMode="decimal"
                        value={gasPriceDraft}
                        onChange={(event) =>
                          setGasPriceDraft(event.target.value)
                        }
                        onBlur={handleGasPriceCommit}
                        placeholder="Auto"
                        className="h-8 border-[var(--auth-composer-menu-border,var(--border))] bg-[var(--auth-composer-model-bg,var(--muted))] px-2 text-right text-xs ring-0 ring-transparent focus-visible:ring-0 focus-visible:ring-transparent"
                      />
                      <span className="text-[11px]">gwei</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] leading-snug">
                      Leave blank to use automatic gas estimation.
                    </p>
                    <button
                      type="button"
                      onClick={clearGasPricePreference}
                      className="shrink-0 rounded-full border border-transparent bg-[var(--auth-composer-model-bg,var(--muted))] px-2 py-1 text-[10px] font-medium ring-0 ring-transparent transition-colors duration-150 hover:bg-[var(--auth-composer-model-hover-bg,var(--accent))] hover:text-[var(--auth-composer-model-hover-fg,var(--foreground))]"
                    >
                      Auto
                    </button>
                  </div>
                </div>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs">
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-3.5" />
                <span>Risk level</span>
              </div>
              <ComposerRiskLevelValue level={riskLevel} />
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent
                className={cn(
                  COMPOSER_MENU_SUBCONTENT_CLASS,
                  "w-32 !border-[var(--auth-composer-menu-border)]",
                )}
              >
                {(["low", "medium", "high"] as const).map((level) => (
                  <DropdownMenuItem
                    key={level}
                    onClick={() => handleRiskLevelChange(level)}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs capitalize"
                  >
                    <div className="flex items-center gap-2">
                      {level === "high" ? (
                        <Zap className="size-3.5 text-red-400" />
                      ) : (
                        <ShieldAlert
                          className={cn(
                            "size-3.5",
                            level === "medium"
                              ? "text-yellow-400"
                              : "text-green-400",
                          )}
                        />
                      )}
                      <ComposerRiskLevelValue level={level} />
                    </div>
                    {riskLevel === level ? (
                      <Check className="size-3 text-sky-500" />
                    ) : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuSeparator className={COMPOSER_MENU_SEPARATOR_CLASS} />

          <div className="flex items-center justify-between rounded-lg px-2 py-1.5">
            <div className="flex flex-col">
              <span className="text-xs font-medium">Small composer</span>
              <span className="text-[10px]">
                Switch between the standard and compact layouts
              </span>
            </div>
            <Switch
              checked={composerStyle === "small"}
              onCheckedChange={(checked) =>
                onComposerStyleChange(checked ? "small" : "default")
              }
              size="xs"
              aria-label="Use small composer"
            />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <RiskWarningDialog
        open={Boolean(riskWarning)}
        warning={riskWarning}
        onCancel={handleWarningCancel}
        onConfirm={handleWarningConfirm}
      />
    </>
  );
}
