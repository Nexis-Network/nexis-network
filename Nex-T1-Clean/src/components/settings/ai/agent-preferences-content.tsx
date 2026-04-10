"use client";

import { Shield, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { BentoCard } from "@/components/settings/shared/bento-card";
import { Button } from "@/components/settings/shared/settings-button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { InfoButton } from "@/components/sidebar-03/animated-icons";
import Image from "next/image";
import { SettingsPage, SettingsPageHeader } from "@/components/settings-v2/primitives/page";
import { LIQUID_GLASS_LOGOS } from "@/components/liquid-glass-logos";

import { logger } from '@/lib/logger';
type AgentSettings = {
  autonomousMode: boolean;
  riskTolerance: "conservative" | "moderate" | "aggressive";
  maxTransactionValueUsd: string;
  preferredChains: string[];
};

const DEFAULT_SETTINGS: AgentSettings = {
  autonomousMode: false,
  riskTolerance: "conservative",
  maxTransactionValueUsd: "100.00",
  preferredChains: [],
};

const AVAILABLE_CHAINS = [
  { id: "ethereum", name: "Ethereum", iconSrc: LIQUID_GLASS_LOGOS.ethereum },
  { id: "base", name: "Base", iconSrc: "/icons/chain-icons/base.svg" },
  { id: "optimism", name: "Optimism", iconSrc: "/icons/chain-icons/optimism.svg" },
  { id: "arbitrum", name: "Arbitrum", iconSrc: "/icons/chain-icons/arbitrum.svg" },
  { id: "polygon", name: "Polygon", iconSrc: "/icons/chain-icons/polygon.svg" },
  // BSC (BNB Chain) icon lives under the BNB assets in our local icon set.
  { id: "bsc", name: "BSC", iconSrc: LIQUID_GLASS_LOGOS.bnb },
  { id: "solana", name: "Solana", iconSrc: LIQUID_GLASS_LOGOS.solana },
] as const;

const RISK_LEVELS = [
  {
    id: "conservative",
    title: "Conservative",
    description: "Lowest limits. Manual approval recommended.",
  },
  {
    id: "moderate",
    title: "Moderate",
    description: "Balanced limits. Some automation allowed.",
  },
  {
    id: "aggressive",
    title: "Aggressive",
    description: "Higher limits. More automation.",
  },
] as const;

export default function AgentPreferencesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AgentSettings>(DEFAULT_SETTINGS);
  const [initialSettings, setInitialSettings] = useState<AgentSettings | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/approvals/settings");
      if (!res.ok) throw new Error("Failed to load settings");
      const data = await res.json();
      const next: AgentSettings = {
        autonomousMode: Boolean(data.autonomousMode),
        riskTolerance: (data.riskTolerance ?? "conservative") as AgentSettings["riskTolerance"],
        maxTransactionValueUsd: String(data.maxTransactionValueUsd ?? DEFAULT_SETTINGS.maxTransactionValueUsd),
        preferredChains: Array.isArray(data.preferredChains) ? data.preferredChains : [],
      };
      setSettings(next);
      setInitialSettings(next);
    } catch (error) {
      logger.error("Failed to load settings:", error);
      toast.error("Failed to load agent settings");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/approvals/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autonomousMode: settings.autonomousMode,
          riskTolerance: settings.riskTolerance,
          maxTransactionValueUsd: settings.maxTransactionValueUsd,
          preferredChains: settings.preferredChains,
        }),
      });

      if (!res.ok) throw new Error("Failed to save settings");

      toast.success("Agent settings updated");
      setInitialSettings(settings);
    } catch (error) {
      logger.error("Failed to save settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const toggleChain = (chainId: string) => {
    setSettings((prev) => ({
      ...prev,
      preferredChains: prev.preferredChains.includes(chainId)
        ? prev.preferredChains.filter((c) => c !== chainId)
        : [...prev.preferredChains, chainId],
    }));
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--bento-text-muted)]" />
      </div>
    );
  }

  return (
    <SettingsPage>
      <SettingsPageHeader
        title="Agent settings"
        description="Control autonomous execution, approval thresholds, and preferred chains."
      />

      <BentoCard>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[var(--settings-foreground-subtle)]" />
              <Label htmlFor="autonomous-mode" className="text-base font-regular text-[var(--bento-text-primary)]">
                Autonomous execution
              </Label>
              {settings.autonomousMode ? (
                <Badge variant="outline" className="rounded-full border-[var(--bento-border)] text-[10px] uppercase tracking-wide">
                  Enabled
                </Badge>
              ) : (
                <Badge variant="outline" className="rounded-full border-[var(--bento-border)] text-[10px] uppercase tracking-wide text-[var(--bento-text-muted)]">
                  Disabled
                </Badge>
              )}
            </div>
            <p className="text-sm text-[var(--bento-text-muted)]">
              When enabled, the agent may execute within your configured limits without asking for approval.
            </p>

            {settings.autonomousMode && (
              <div className="mt-2 flex items-start gap-2 rounded-lg border border-[var(--bento-border)] bg-white/[0.03] p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--bento-text-muted)]" />
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-[var(--bento-text-primary)]">Risk note</p>
                  <p className="text-xs text-[var(--bento-text-muted)]">
                    Autonomous execution can move funds without confirmation. Keep your threshold low until you’ve validated behavior.
                  </p>
                </div>
              </div>
            )}
          </div>
          <Switch
            id="autonomous-mode"
            checked={settings.autonomousMode}
            onCheckedChange={(checked) =>
              setSettings((prev) => ({
                ...prev,
                autonomousMode: checked,
              }))
            }
          />
        </div>
      </BentoCard>

      <BentoCard>
        <div className="space-y-1">
          <Label className="text-base font-regular text-[var(--bento-text-primary)]">Risk profile</Label>
          <p className="text-sm text-[var(--bento-text-muted)]">
            Impacts autonomous limits and how strict approvals are applied.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {RISK_LEVELS.map((level) => {
            const isSelected = settings.riskTolerance === level.id;
            return (
              <button
                key={level.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    riskTolerance: level.id,
                  }))
                }
                className={[
                  "text-left rounded-lg border p-4 transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
                  isSelected
                    ? "border-[var(--bento-text-muted)]/30 bg-white/[0.05]"
                    : "border-[var(--bento-border)] bg-transparent hover:bg-white/5",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--bento-text-primary)]">{level.title}</p>
                    <p className="mt-1 text-xs text-[var(--bento-text-muted)]">{level.description}</p>
                  </div>
                  {isSelected ? (
                    <Badge variant="outline" className="rounded-full border-[var(--bento-border)] text-[10px] uppercase tracking-wide">
                      Selected
                    </Badge>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </BentoCard>

      <BentoCard>
        <div className="space-y-1">
          <Label htmlFor="max-value" className="text-base font-regular text-[var(--bento-text-primary)]">
            Auto-approve threshold
          </Label>
          <p className="text-sm text-[var(--bento-text-muted)]">
            Transactions above this value always require manual approval (even when autonomous execution is enabled).
          </p>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <span className="font-mono text-xs text-[var(--bento-text-muted)]">$</span>
          <Input
            id="max-value"
            type="number"
            min="0"
            step="0.01"
            value={settings.maxTransactionValueUsd}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                maxTransactionValueUsd: e.target.value,
              }))
            }
            className="max-w-xs font-mono"
            inputMode="decimal"
          />
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-lg border border-[var(--bento-border)] bg-white/[0.03] p-3">
          <InfoButton className="mt-0.5 h-4 w-4 shrink-0 text-[var(--bento-text-muted)]" />
          <p className="text-xs text-[var(--bento-text-muted)]">
            Set to <span className="font-mono">$0</span> to require approval for all transactions, regardless of amount.
          </p>
        </div>
      </BentoCard>

      <BentoCard>
        <div className="space-y-1">
          <Label className="text-base font-regular text-[var(--bento-text-primary)]">Preferred chains</Label>
          <p className="text-sm text-[var(--bento-text-muted)]">
            Used to filter autonomous execution suggestions and defaults.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {AVAILABLE_CHAINS.map((chain) => {
            const isSelected = settings.preferredChains.includes(chain.id);
            return (
              <button
                key={chain.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggleChain(chain.id)}
                className={[
                  "rounded-lg border px-3 py-2 text-sm transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
                  isSelected
                    ? "border-[var(--bento-text-muted)]/30 bg-white/[0.05] text-[var(--bento-text-primary)]"
                    : "border-[var(--bento-border)] bg-transparent text-[var(--bento-text-muted)] hover:bg-white/5",
                ].join(" ")}
              >
                <span className="flex items-center gap-2">
                  <Image
                    src={chain.iconSrc}
                    alt={`${chain.name} logo`}
                    width={16}
                    height={16}
                    sizes="16px"
                    className="h-4 w-4 shrink-0 rounded-full"
                  />
                  <span className="font-medium">{chain.name}</span>
                </span>
              </button>
            );
          })}
        </div>

        {settings.preferredChains.length === 0 ? (
          <p className="mt-3 text-xs text-[var(--bento-text-muted)]">No chains selected (all chains allowed).</p>
        ) : null}
      </BentoCard>

      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          onClick={() => {
            if (initialSettings) {
              setSettings(initialSettings);
              toast.message("Changes reverted");
              return;
            }
            setLoading(true);
            void loadSettings();
          }}
          disabled={saving}
          tone="surface"
        >
          Cancel
        </Button>
        <Button tone="primary" onClick={saveSettings} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save settings
        </Button>
      </div>
    </SettingsPage>
  );
}
