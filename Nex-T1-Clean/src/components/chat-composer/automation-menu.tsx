"use client";

import { memo, useMemo, useState } from "react";
import {
  IconArrowsExchange,
  IconRocket,
  IconShoppingCart,
  IconCoin,
  IconStack2,
} from "@tabler/icons-react";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Terminal } from "@/components/animate-ui/icons/terminal";
import {
  COMPOSER_ICON_BUTTON_CLASS,
  COMPOSER_ICON_CLASS,
  COMPOSER_MENU_CONTENT_CLASS,
  COMPOSER_MENU_LABEL_CLASS,
  COMPOSER_MENU_SEPARATOR_CLASS,
} from "@/components/chat-composer/composer-theme";
import type {
  AutomationState,
  AutonomousActionKey,
} from "@/modules/chat/automation-preferences";

type AutomationMenuItem = {
  key: AutonomousActionKey;
  label: string;
  icon: typeof IconArrowsExchange;
};

const AUTOMATION_MENU_ITEMS: AutomationMenuItem[] = [
  { key: "bridge", label: "Auto bridge", icon: IconArrowsExchange },
  { key: "deploy", label: "Auto deploy", icon: IconRocket },
  { key: "buy", label: "Auto buy", icon: IconShoppingCart },
  { key: "sell", label: "Auto sell", icon: IconCoin },
  { key: "stake", label: "Auto stake", icon: IconStack2 },
];

export type AutomationMenuProps = {
  automationState: AutomationState;
  disabled?: boolean;
  onToggle: (key: AutonomousActionKey, value: boolean) => void;
  isAuthenticated: boolean;
};

function AutomationMenuComponent({
  automationState,
  disabled = false,
  onToggle,
  isAuthenticated,
}: AutomationMenuProps) {
  const [open, setOpen] = useState(false);
  const hasAutomationEnabled = useMemo(
    () => Object.values(automationState).some(Boolean),
    [automationState],
  );
  const isActive = open || hasAutomationEnabled;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            COMPOSER_ICON_BUTTON_CLASS,
            isActive &&
              "bg-[var(--auth-composer-control-active-bg)] text-[var(--auth-composer-control-hover-fg)]",
            disabled && "cursor-wait opacity-70",
          )}
          aria-label="Automation controls"
          title="Automation controls"
          disabled={disabled}
          aria-pressed={isActive}
        >
          <Terminal className={COMPOSER_ICON_CLASS} animateOnHover />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={cn(COMPOSER_MENU_CONTENT_CLASS, "w-72 p-3")}
      >
        <DropdownMenuLabel
          className={cn(COMPOSER_MENU_LABEL_CLASS, "uppercase tracking-wide")}
        >
          Automation Controls
        </DropdownMenuLabel>
        <DropdownMenuSeparator className={COMPOSER_MENU_SEPARATOR_CLASS} />
        <DropdownMenuGroup className="space-y-3">
          {AUTOMATION_MENU_ITEMS.map(({ key, label, icon: IconComponent }) => (
            <div key={key} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <IconComponent className={COMPOSER_ICON_CLASS} />
                <Label className="text-xs font-medium">
                  {label}
                </Label>
              </div>
              <Switch
                checked={automationState[key]}
                disabled={disabled}
                onCheckedChange={(checked) => onToggle(key, checked)}
                size="xs"
              />
            </div>
          ))}
        </DropdownMenuGroup>
        <p className="text-[11px] leading-snug">
          When enabled, Nex skips approval for that action. Disabled actions
          require human-in-the-loop confirmation.
        </p>
        {!isAuthenticated ? (
          <p className="text-[11px] text-amber-500">
            Sign in to persist automation settings.
          </p>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const AutomationMenu = memo(AutomationMenuComponent);
