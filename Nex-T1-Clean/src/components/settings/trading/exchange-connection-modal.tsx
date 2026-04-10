"use client";

import { Button } from "@/components/settings/shared/settings-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
/**
 * Exchange Connection Modal
 * 
 * Domain: settings/trading
 * Responsibility: Add/edit CEX exchange API connections
 * Follows project styling: dark settings surface, neutral accents, dialog pattern from McpApiKeyModal
 */

import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, AlertTriangle, Key } from "lucide-react";
import { logger } from "@/lib/logger";

// Supported exchanges - matches backend types
const EXCHANGES = [
  { id: "binance", name: "Binance", logo: "/logos/binance.svg" },
  { id: "coinbase", name: "Coinbase", logo: "/logos/coinbase.svg" },
  { id: "kraken", name: "Kraken", logo: "/logos/kraken.svg" },
  { id: "bybit", name: "Bybit", logo: "/logos/bybit.svg" },
  { id: "okx", name: "OKX", logo: "/logos/okx.svg" },
  { id: "bitfinex", name: "Bitfinex", logo: "/logos/bitfinex.svg" },
  { id: "huobi", name: "Huobi", logo: "/logos/huobi.svg" },
  { id: "kucoin", name: "KuCoin", logo: "/logos/kucoin.svg" },
  { id: "gemini", name: "Gemini", logo: "/logos/gemini.svg" },
] as const;

type ExchangeId = (typeof EXCHANGES)[number]["id"];

interface ExchangeConnectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    exchangeId: ExchangeId;
    label: string;
    apiKey: string;
    apiSecret: string;
    passphrase?: string;
    isTestnet: boolean;
    permissions: { spot: boolean; futures: boolean; withdraw: boolean };
  }) => Promise<void>;
  editMode?: {
    exchangeId: ExchangeId;
    label: string;
    isTestnet: boolean;
  };
}

export function ExchangeConnectionModal({
  open,
  onOpenChange,
  onSave,
  editMode,
}: ExchangeConnectionModalProps) {
  const [exchangeId, setExchangeId] = React.useState<ExchangeId>(
    editMode?.exchangeId || "binance"
  );
  const [label, setLabel] = React.useState(editMode?.label || "Default");
  const [apiKey, setApiKey] = React.useState("");
  const [apiSecret, setApiSecret] = React.useState("");
  const [passphrase, setPassphrase] = React.useState("");
  const [isTestnet, setIsTestnet] = React.useState(editMode?.isTestnet || false);
  const [spotEnabled, setSpotEnabled] = React.useState(true);
  const [futuresEnabled, setFuturesEnabled] = React.useState(false);
  const [withdrawEnabled, setWithdrawEnabled] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Exchanges that require passphrase
  const needsPassphrase = ["okx", "kucoin", "bitfinex"].includes(exchangeId);

  const handleSave = async () => {
    // Validation
    if (!apiKey.trim()) {
      setError("API Key is required");
      return;
    }
    if (!apiSecret.trim()) {
      setError("API Secret is required");
      return;
    }
    if (needsPassphrase && !passphrase.trim()) {
      setError("Passphrase is required for this exchange");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSave({
        exchangeId,
        label: label.trim() || "Default",
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim(),
        passphrase: passphrase.trim() || undefined,
        isTestnet,
        permissions: {
          spot: spotEnabled,
          futures: futuresEnabled,
          withdraw: withdrawEnabled,
        },
      });
      onOpenChange(false);
      // Reset form
      setApiKey("");
      setApiSecret("");
      setPassphrase("");
    } catch (e) {
      logger.error("[ExchangeConnectionModal] Save failed", e);
      setError(e instanceof Error ? e.message : "Failed to save connection");
    } finally {
      setLoading(false);
    }
  };

  const selectedExchange = EXCHANGES.find((e) => e.id === exchangeId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-[var(--bento-card)] border-[var(--bento-border)] text-[var(--bento-text-primary)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-[var(--bento-text-primary)]" />
            {editMode ? "Edit Exchange Connection" : "Connect Exchange"}
          </DialogTitle>
          <DialogDescription className="text-[var(--bento-text-muted)] text-sm">
            Your API keys are encrypted with Supabase Vault and stored securely.
            We recommend using API keys with <strong>read-only + trade</strong>{" "}
            permissions (no withdrawals).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          {/* Exchange Select */}
          <div className="grid gap-2">
            <Label className="text-sm font-medium text-[var(--bento-text-primary)]">Exchange</Label>
            <Select
              value={exchangeId}
              onValueChange={(v) => setExchangeId(v as ExchangeId)}
              disabled={!!editMode}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    {selectedExchange?.name}
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {EXCHANGES.map((exchange) => (
                  <SelectItem key={exchange.id} value={exchange.id}>
                    {exchange.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Label */}
          <div className="grid gap-2">
            <Label className="text-sm font-medium text-[var(--bento-text-primary)]">
              Label (optional)
            </Label>
              <Input
                placeholder="e.g., Main Trading Account"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="border-[var(--bento-border)] bg-[var(--settings-elevated)] text-[var(--bento-text-primary)]"
              />
          </div>

          {/* API Key */}
          <div className="grid gap-2">
            <Label className="text-sm font-medium text-[var(--bento-text-primary)]">
              API Key <span className="text-red-400">*</span>
            </Label>
            <Input
              type="password"
              placeholder="Enter your API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="border-[var(--bento-border)] bg-[var(--settings-elevated)] font-mono text-sm text-[var(--bento-text-primary)]"
            />
          </div>

          {/* API Secret */}
          <div className="grid gap-2">
            <Label className="text-sm font-medium text-[var(--bento-text-primary)]">
              API Secret <span className="text-red-400">*</span>
            </Label>
            <Input
              type="password"
              placeholder="Enter your API secret"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              className="border-[var(--bento-border)] bg-[var(--settings-elevated)] font-mono text-sm text-[var(--bento-text-primary)]"
            />
          </div>

          {/* Passphrase (conditional) */}
          {needsPassphrase && (
            <div className="grid gap-2">
              <Label className="text-sm font-medium text-[var(--bento-text-primary)]">
                Passphrase <span className="text-red-400">*</span>
              </Label>
              <Input
                type="password"
                placeholder="Enter your API passphrase"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="border-[var(--bento-border)] bg-[var(--settings-elevated)] font-mono text-sm text-[var(--bento-text-primary)]"
              />
              <p className="text-[10px] text-[var(--bento-text-muted)]">
                Required for {selectedExchange?.name} API access
              </p>
            </div>
          )}

          {/* Testnet Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-[var(--bento-border)] bg-[var(--settings-elevated)] p-3">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium text-[var(--bento-text-primary)]">
                Testnet Mode
              </Label>
              <p className="text-[11px] text-[var(--bento-text-muted)]">
                Use sandbox/testnet API for testing
              </p>
            </div>
            <Switch
              checked={isTestnet}
              onCheckedChange={setIsTestnet}
            />
          </div>

          {/* Permissions */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-[var(--bento-text-primary)] flex items-center gap-2">
              <Shield className="w-4 h-4" />
              API Permissions
            </Label>
            <div className="grid gap-2 rounded-lg border border-[var(--bento-border)] bg-[var(--settings-elevated)] p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--bento-text-muted)]">Spot Trading</span>
                <Switch
                  checked={spotEnabled}
                  onCheckedChange={setSpotEnabled}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--bento-text-muted)]">Futures Trading</span>
                <Switch
                  checked={futuresEnabled}
                  onCheckedChange={setFuturesEnabled}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[var(--bento-text-muted)]">Withdrawals</span>
                  <AlertTriangle className="h-3 w-3 text-[#d0c09a]" />
                </div>
                <Switch
                  checked={withdrawEnabled}
                  onCheckedChange={setWithdrawEnabled}
                />
              </div>
              {withdrawEnabled && (
                <p className="mt-1 rounded-md border border-[rgba(208,192,154,0.2)] bg-[rgba(208,192,154,0.08)] px-2 py-1 text-[10px] text-[#d0c09a]">
                  ⚠️ Enabling withdrawals increases security risk. Use with caution.
                </p>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="rounded-lg border border-[rgba(239,68,68,0.24)] bg-[rgba(127,29,29,0.16)] p-3 text-sm text-[#f0d0d0]">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            tone="surface"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            tone="primary"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? "Connecting..." : editMode ? "Update Connection" : "Connect Exchange"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
