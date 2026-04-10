"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Cpu, CreditCard, Upload, Zap } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useMcpServerCount } from "@/lib/hooks/mcp/use-mcp-server-count";
import { cn } from "@/lib/utils";
import { McpCatalogModal } from "@/components/ai-elements/mcp-catalog-modal";
import { ExchangeConnectionModal } from "@/components/settings/trading/exchange-connection-modal";
import { RiskWarningDialog } from "./risk-warning-dialog";
import {
  ActionMenuStatusRow,
  ActionMenuTrigger,
} from "./composer-action-menu/action-menu-sections";
import {
  useComposerAutoMode,
  useComposerExchangeConnectionManager,
} from "./composer-action-menu/action-menu-hooks";
import type {
  AutomationState,
  AutonomousActionKey,
  ComposerActionMenuTriggerVariant,
} from "./composer-action-menu/action-menu-types";
import {
  COMPOSER_MENU_CONTENT_CLASS,
  COMPOSER_MENU_ITEM_CLASS,
  COMPOSER_MENU_LABEL_CLASS,
  COMPOSER_MENU_SEPARATOR_CLASS,
  COMPOSER_MENU_SUBCONTENT_CLASS,
} from "@/components/chat-composer/composer-theme";
import type { ComposerModelOption } from "@/components/chat-composer/model-selector";

export type { AutomationState, AutonomousActionKey } from "./composer-action-menu/action-menu-types";

interface ComposerActionMenuProps {
  onUploadClick: () => void;
  automationState: AutomationState;
  onAutomationToggle: (key: AutonomousActionKey, value: boolean) => void;
  isAuthenticated: boolean;
  className?: string;
  triggerVariant?: ComposerActionMenuTriggerVariant;
  modelValue: string;
  modelOptions: readonly ComposerModelOption[];
  onModelSelect: (value: string) => void;
}

export function ComposerActionMenu({
  onUploadClick,
  automationState: _automationState,
  onAutomationToggle: _onAutomationToggle,
  isAuthenticated,
  className,
  triggerVariant = "default",
  modelValue,
  modelOptions,
  onModelSelect,
}: ComposerActionMenuProps) {
  const [allowance, setAllowance] = useState("1000");
  const { activeCount, refresh: refreshMcpCount } = useMcpServerCount();
  const { activeExchangeCount, handleSaveExchange } =
    useComposerExchangeConnectionManager(isAuthenticated);
  const {
    isAutoMode,
    riskWarning,
    handleAutoModeToggle,
    handleWarningConfirm,
    handleWarningCancel,
  } = useComposerAutoMode();
  const [isMcpCatalogOpen, setIsMcpCatalogOpen] = useState(false);
  const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);

  return (
    <>
      <McpCatalogModal
        open={isMcpCatalogOpen}
        onOpenChange={(open) => {
          setIsMcpCatalogOpen(open);
          if (!open) {
            refreshMcpCount();
          }
        }}
      />

      <ExchangeConnectionModal
        open={isExchangeModalOpen}
        onOpenChange={setIsExchangeModalOpen}
        onSave={handleSaveExchange}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <ActionMenuTrigger
            className={className}
            triggerVariant={triggerVariant}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={8}
          className={cn(
            COMPOSER_MENU_CONTENT_CLASS,
            "w-72 p-2 !border-[var(--auth-composer-menu-border)]",
          )}
        >
          <DropdownMenuLabel className={COMPOSER_MENU_LABEL_CLASS}>
            Configuration
          </DropdownMenuLabel>

          <DropdownMenuGroup className="space-y-1">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className={cn(COMPOSER_MENU_ITEM_CLASS, "justify-between")}>
                <div className="flex items-center gap-2">
                  <Cpu className="size-3.5" />
                  <span>Model</span>
                </div>
                <span className="text-muted-foreground">{modelOptions.find(o => o.value === modelValue)?.name ?? "Nex"}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className={cn(COMPOSER_MENU_SUBCONTENT_CLASS, "w-56 !border-[var(--auth-composer-menu-border)]")}>
                  {modelOptions.map((model) => (
                    <DropdownMenuItem
                      key={model.value}
                      onClick={() => onModelSelect(model.value)}
                      className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs"
                    >
                      <span className="flex flex-col gap-0.5">
                        <span className="font-medium">{model.name}</span>
                        {model.description ? <span className="text-[10px] text-muted-foreground">{model.description}</span> : null}
                      </span>
                      {model.value === modelValue ? <Check className="size-3 text-sky-500" /> : null}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>

          </DropdownMenuGroup>

          <DropdownMenuSeparator className={COMPOSER_MENU_SEPARATOR_CLASS} />

          <DropdownMenuItem
            onClick={onUploadClick}
            className={cn(COMPOSER_MENU_ITEM_CLASS, "justify-start gap-2")}
          >
            <Upload className="size-3.5" />
            <span>Upload File</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className={COMPOSER_MENU_SEPARATOR_CLASS} />

          <DropdownMenuLabel className={COMPOSER_MENU_LABEL_CLASS}>
            Automation
          </DropdownMenuLabel>

          <div className="flex items-center justify-between px-2 py-1.5">
            <div className="flex items-center gap-2">
              <Zap className="size-3.5" />
              <div className="flex flex-col">
                <span className="text-xs">Auto Mode</span>
                <span className="text-[10px]">Skip approvals</span>
              </div>
            </div>
            <Switch
              checked={isAutoMode}
              onCheckedChange={handleAutoModeToggle}
              size="xs"
            />
          </div>

          <div className="flex items-center justify-between px-2 py-1.5">
            <div className="flex items-center gap-2">
              <CreditCard className="size-3.5" />
              <span className="text-xs">Allowance</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs">$</span>
              <Input
                value={allowance}
                onChange={(event) => setAllowance(event.target.value)}
                className="h-6 w-16 rounded-md border-[var(--auth-composer-menu-border,var(--border))] bg-[var(--auth-composer-model-bg,var(--muted))] px-1 text-right text-xs focus-visible:ring-1 focus-visible:ring-sky-500"
              />
            </div>
          </div>

          <ActionMenuStatusRow
            icon={
              <Image
                src="/assets/interface/mcp.svg"
                alt="MCP servers"
                width={14}
                height={14}
                className="size-3.5 object-contain"
              />
            }
            label="MCP Servers"
            badgeLabel={`${activeCount} Active`}
            onClick={() => setIsMcpCatalogOpen(true)}
          />

          <ActionMenuStatusRow
            icon={
              <Image
                src="/assets/interface/Connections.svg"
                alt="Connected exchanges"
                width={14}
                height={14}
                className="size-3.5 object-contain"
              />
            }
            label="Connected Exchanges"
            badgeLabel={`${activeExchangeCount} Active`}
            onClick={() => setIsExchangeModalOpen(true)}
          />
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
