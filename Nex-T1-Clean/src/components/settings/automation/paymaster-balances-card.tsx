"use client";

import {
  usePaymasterBalances,
  useUpsertPaymasterBalance,
} from "@/modules/automation/hooks";
import { useToast } from "@/hooks/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/settings/shared/settings-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  SettingsTable,
  SettingsTableBody,
  SettingsTableCell,
  SettingsTableHead,
  SettingsTableHeader,
  SettingsTableHeaderRow,
  SettingsTableRow,
  SettingsTableShell,
} from "@/components/settings/shared/settings-table";

import { useState } from "react";
import { Loader2 } from "lucide-react";
type PaymasterFormState = {
  chainSlug: string;
  paymasterAddress: string;
  currentBalance: string;
  balanceCurrency: string;
  thresholdAmount: string;
  metadata: string;
};

const DEFAULT_FORM: PaymasterFormState = {
  chainSlug: "",
  paymasterAddress: "",
  currentBalance: "",
  balanceCurrency: "ETH",
  thresholdAmount: "",
  metadata: "{\n  \n}",
};

export function PaymasterBalancesCard() {
  const { data, isLoading, error, refetch, isRefetching } =
    usePaymasterBalances();
  const upsertBalance = useUpsertPaymasterBalance();
  const { toast } = useToast();

  const [formState, setFormState] = useState<PaymasterFormState>(DEFAULT_FORM);

  const handleFormChange = <K extends keyof PaymasterFormState>(
    key: K,
    value: PaymasterFormState[K],
  ) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => setFormState(DEFAULT_FORM);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const currentBalance = Number(formState.currentBalance);
    const thresholdAmount = Number(formState.thresholdAmount);

    if (!Number.isFinite(currentBalance) || Number.isNaN(currentBalance)) {
      toast({
        title: "Invalid balance",
        description: "Enter a numeric paymaster balance.",
        variant: "destructive",
      });
      return;
    }

    if (
      !Number.isFinite(thresholdAmount) ||
      Number.isNaN(thresholdAmount) ||
      thresholdAmount < 0
    ) {
      toast({
        title: "Invalid threshold",
        description: "Threshold must be zero or greater.",
        variant: "destructive",
      });
      return;
    }

    let metadata: Record<string, UntypedJson> | undefined;
    try {
      metadata =
        formState.metadata.trim().length > 0
          ? safeParseJson(formState.metadata)
          : undefined;
    } catch (parseError) {
      toast({
        title: "Invalid metadata",
        description:
          parseError instanceof Error
            ? parseError.message
            : "Metadata JSON could not be parsed.",
        variant: "destructive",
      });
      return;
    }

    try {
      await upsertBalance.mutateAsync({
        chainSlug: formState.chainSlug.trim(),
        paymasterAddress: formState.paymasterAddress.trim(),
        currentBalance,
        balanceCurrency: formState.balanceCurrency.trim().toUpperCase(),
        thresholdAmount,
        metadata,
      });
      toast({
        title: "Paymaster updated",
        description: "Paymaster balance and threshold saved successfully.",
      });
      resetForm();
    } catch (mutationError) {
      toast({
        title: "Failed to update paymaster",
        description:
          mutationError instanceof Error
            ? mutationError.message
            : "An unknown error occurred while updating paymaster.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-[var(--bento-card)] border-[var(--bento-border)] rounded-[20px]">
      <CardHeader className="space-y-2">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="text-[var(--bento-text-primary)]">
              Paymaster Balances
            </CardTitle>
            <CardDescription className="text-[var(--bento-text-muted)]">
              Monitor gas sponsorship levels across chains and raise alerts
              before automation stalls.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching || isLoading}
            >
              {isRefetching ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Refreshing…
                </>
              ) : (
                "Refresh"
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          onSubmit={handleSubmit}
          className="grid gap-3 rounded-lg border border-[var(--bento-border)] bg-[var(--bento-card)] p-4"
        >
          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="paymaster-chain">Chain slug</Label>
              <Input
                id="paymaster-chain"
                value={formState.chainSlug}
                onChange={(event) =>
                  handleFormChange("chainSlug", event.target.value)
                }
                placeholder="base, optimism, solana"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="paymaster-address">Paymaster address</Label>
              <Input
                id="paymaster-address"
                value={formState.paymasterAddress}
                onChange={(event) =>
                  handleFormChange("paymasterAddress", event.target.value)
                }
                placeholder="0x..."
                required
              />
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="paymaster-balance">Current balance</Label>
              <Input
                id="paymaster-balance"
                type="number"
                step="any"
                value={formState.currentBalance}
                onChange={(event) =>
                  handleFormChange("currentBalance", event.target.value)
                }
                placeholder="0.25"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="paymaster-currency">Currency</Label>
              <Input
                id="paymaster-currency"
                value={formState.balanceCurrency}
                onChange={(event) =>
                  handleFormChange("balanceCurrency", event.target.value)
                }
                placeholder="ETH"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="paymaster-threshold">Threshold</Label>
              <Input
                id="paymaster-threshold"
                type="number"
                step="any"
                value={formState.thresholdAmount}
                onChange={(event) =>
                  handleFormChange("thresholdAmount", event.target.value)
                }
                placeholder="0.05"
                required
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="paymaster-metadata">Metadata (JSON)</Label>
            <Textarea
              id="paymaster-metadata"
              rows={3}
              value={formState.metadata}
              onChange={(event) =>
                handleFormChange("metadata", event.target.value)
              }
              className="font-mono text-xs"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={upsertBalance.isPending}>
              {upsertBalance.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save paymaster"
              )}
            </Button>
          </div>
        </form>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {isLoading && (
          <div className="flex items-center gap-2 rounded-lg border border-[var(--bento-border)] bg-white/[0.03] px-3 py-2 text-sm text-[var(--bento-text-muted)]">
            <Loader2 className="size-4 animate-spin" />
            Loading paymaster balances…
          </div>
        )}

        {(data ?? []).length === 0 && !isLoading && (
          <p className="text-sm text-[var(--bento-text-muted)]">
            No paymaster balances recorded yet. Add a paymaster above to track
            sponsored gas levels.
          </p>
        )}

        {(data ?? []).length > 0 && (
          <SettingsTableShell>
            <SettingsTable className="min-w-[620px]">
              <SettingsTableHeader>
                <SettingsTableHeaderRow>
                  <SettingsTableHead>Chain</SettingsTableHead>
                  <SettingsTableHead>Paymaster</SettingsTableHead>
                  <SettingsTableHead>Balance</SettingsTableHead>
                  <SettingsTableHead>Threshold</SettingsTableHead>
                  <SettingsTableHead>Last refreshed</SettingsTableHead>
                </SettingsTableHeaderRow>
              </SettingsTableHeader>
              <SettingsTableBody>
                {(data ?? []).map((entry) => (
                  <SettingsTableRow key={entry.id}>
                    <SettingsTableCell className="text-[var(--settings-foreground-strong)]">
                      {entry.chainSlug}
                    </SettingsTableCell>
                    <SettingsTableCell className="font-mono text-xs">
                      {truncateMiddle(entry.paymasterAddress, 12)}
                    </SettingsTableCell>
                    <SettingsTableCell className="text-[var(--settings-foreground-strong)]">
                      {entry.currentBalance.toLocaleString(undefined, {
                        maximumFractionDigits: 6,
                      })}{" "}
                      <Badge
                        variant="outline"
                        className="ml-1 border-[var(--bento-border)] text-[10px] uppercase"
                      >
                        {entry.balanceCurrency}
                      </Badge>
                    </SettingsTableCell>
                    <SettingsTableCell>
                      {entry.thresholdAmount.toLocaleString(undefined, {
                        maximumFractionDigits: 6,
                      })}
                    </SettingsTableCell>
                    <SettingsTableCell className="text-xs">
                      {entry.lastRefreshedAt.toLocaleString()}
                    </SettingsTableCell>
                  </SettingsTableRow>
                ))}
              </SettingsTableBody>
            </SettingsTable>
          </SettingsTableShell>
        )}
      </CardContent>
      <CardFooter className="text-xs text-[var(--bento-text-muted)]">
        Paymaster balances auto-refresh as automation runs. Update when topping
        up sponsor accounts to keep telemetry accurate.
      </CardFooter>
    </Card>
  );
}

function safeParseJson(value: string): Record<string, UntypedJson> {
  if (!value || value.trim().length === 0) {
    return {};
  }
  return JSON.parse(value);
}

function truncateMiddle(value: string, length: number) {
  if (!value) return "";
  if (value.length <= length) return value;
  const half = Math.floor(length / 2);
  return `${value.slice(0, half)}…${value.slice(-half)}`;
}
