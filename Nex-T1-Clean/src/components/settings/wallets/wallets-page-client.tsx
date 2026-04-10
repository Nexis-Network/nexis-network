"use client";

import Link from "next/link";
import { Layers3, Link2, Wallet2, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { useTranslations } from "@/components/providers/locale-provider";
import { CdpWalletDetailCard } from "@/components/settings/wallets/cdp-wallet-detail-card";
import { WalletsTable } from "@/components/settings/wallets/wallets-table";
import { AgentWalletsSection } from "@/components/settings/wallets/agent-wallets-section";
import { DetachedWalletsSection } from "@/components/settings/wallets/detached-wallets-section";
import { ConnectExternalWalletCard } from "@/components/settings/wallets/connect-external-wallet-card";
import { CdpStakingCard } from "@/components/wallets/cdp/cdp-staking-card";
import { CdpUsdcRewardsCard } from "@/components/wallets/cdp/cdp-usdc-rewards-card";
import { CdpSpendPermissionsCard } from "@/components/settings/wallets/cdp-spend-permissions-card";
import { NztRollupWalletCard } from "@/components/settings/wallets/nzt-rollup-wallet-card";
import { SettingsPage, SettingsPageHeader, SettingsSection } from "@/components/settings-v2/primitives/page";
import { useProfileAggregate } from "@/hooks/user/use-profile-aggregate";
import { useResolvedCdpWallets } from "@/lib/cdp/use-resolved-cdp-wallets";
import { augmentWalletPortfoliosWithResolvedCdp } from "@/lib/cdp/cdp-wallet-portfolios";
import type { ProfileAggregate } from "@/lib/user/profile";
import { resolveWalletLabel } from "@/components/settings/wallets/lib/wallet-normalizers";
import { CDP_EMBEDDED_ENABLED } from "@/lib/cdp/feature-flag";
import { cn } from "@/lib/utils";

const CDP_ENABLED = CDP_EMBEDDED_ENABLED;

type WalletsPageClientProps = {
  initialProfile?: ProfileAggregate;
};

function WalletStatusCard({
  icon: Icon,
  label,
  value,
  detail,
  accent = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  accent?: "default" | "cyan";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/70 px-4 py-4 shadow-none",
        accent === "cyan" ? "bg-muted/30" : "bg-card",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-background p-2 text-foreground">
          <Icon className="size-4" />
        </div>
      </div>
      <p className="mt-3 max-w-[22rem] text-sm leading-5 text-muted-foreground">
        {detail}
      </p>
    </div>
  );
}

function WalletSectionBadge({ label }: { label: string }) {
  return (
    <Badge
      variant="outline"
      className="rounded-lg px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
    >
      {label}
    </Badge>
  );
}

function walletAddressesMatch(candidate: string | null | undefined, address: string | null): boolean {
  if (typeof candidate !== "string" || typeof address !== "string") return false;

  const normalizedCandidate = candidate.trim();
  const normalizedAddress = address.trim();
  if (!normalizedCandidate || !normalizedAddress) return false;

  if (normalizedCandidate.startsWith("0x") && normalizedAddress.startsWith("0x")) {
    return normalizedCandidate.toLowerCase() === normalizedAddress.toLowerCase();
  }

  return normalizedCandidate === normalizedAddress;
}

export default function WalletPortfolioPage({ initialProfile }: WalletsPageClientProps) {
  const searchParams = useSearchParams();
  const t = useTranslations("app");
  const { data: profile, isLoading: profileLoading, error: profileError } = useProfileAggregate({
    initialData: initialProfile,
  });
  const wallets = useMemo(() => profile?.wallets ?? [], [profile?.wallets]);
  const { evmAddress, solanaAddress } = useResolvedCdpWallets({
    fallbackWallets: wallets,
  });
  const augmentedWallets = useMemo(
    () =>
      augmentWalletPortfoliosWithResolvedCdp(wallets, {
        evmAddress,
        solanaAddress,
      }),
    [wallets, evmAddress, solanaAddress],
  );
  const resolvedWalletLabels = useMemo(() => {
    const findLabelForAddress = (address: string | null): string | null => {
      const wallet = augmentedWallets.find((candidate) => walletAddressesMatch(candidate.address, address));
      return wallet ? resolveWalletLabel(wallet) : null;
    };

    return {
      evm: findLabelForAddress(evmAddress),
      solana: findLabelForAddress(solanaAddress),
    };
  }, [augmentedWallets, evmAddress, solanaAddress]);
  const handledScrollKeyRef = useRef<string | null>(null);
  const walletError = profileError instanceof Error ? profileError.message : undefined;
  const walletActionParam = searchParams.get("walletAction");
  const walletAddressParam = searchParams.get("walletAddress");
  const sectionParam = searchParams.get("section");
  const embeddedWalletCount = Number(Boolean(evmAddress)) + Number(Boolean(solanaAddress));
  const externalWallets = useMemo(
    () =>
      augmentedWallets
        .filter((wallet) => {
          const metaType = typeof wallet.metadata?.walletType === "string" ? wallet.metadata.walletType : "";
          return wallet.walletType === "external_connected" || metaType.includes("external");
        })
        .map((wallet) => ({
          id: wallet.walletId,
          address: wallet.address ?? "",
          walletType: typeof wallet.metadata?.walletType === "string" ? wallet.metadata.walletType : "external_evm",
          providerName: wallet.providerName ?? undefined,
          chainId: wallet.metadata?.chainId as number | undefined,
        })),
    [augmentedWallets],
  );

  const walletTableAction = useMemo<"send" | "receive" | "export-private-key" | null>(() => {
    if (walletActionParam === "send") return "send";
    if (walletActionParam === "receive") return "receive";
    if (walletActionParam === "export-private-key") return "export-private-key";
    return null;
  }, [walletActionParam]);
  const embeddedWalletValue = profileLoading ? "…" : `${embeddedWalletCount}/2`;
  const walletInventoryValue = profileLoading ? "…" : String(augmentedWallets.length);
  const externalConnectorValue = profileLoading ? "…" : String(externalWallets.length);

  useEffect(() => {
    const shouldFocusSpendPermissions =
      walletActionParam === "set-allowance" || sectionParam === "spend-permissions";
    if (!shouldFocusSpendPermissions) return;

    const scrollKey = `${walletActionParam ?? ""}:${sectionParam ?? ""}`;
    if (handledScrollKeyRef.current === scrollKey) return;

    const timer = window.setTimeout(() => {
      document.getElementById("cdp-spend-permissions-section")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      handledScrollKeyRef.current = scrollKey;
    }, 150);

    return () => window.clearTimeout(timer);
  }, [sectionParam, walletActionParam]);

  return (
    <SettingsPage className="space-y-8">
      <SettingsPageHeader
        title={t("walletsPage.title")}
        description={t("walletsPage.description")}
        action={
          <Button
            asChild
            size="sm"
            variant="outline"
            className="rounded-xl"
          >
            <Link href="/settings/wallets?tab=security">Review security</Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <WalletStatusCard
          icon={Wallet2}
          label="Nex Wallet lanes"
          value={embeddedWalletValue}
          detail={
            profileLoading
              ? "Checking Nex Wallet provisioning across your active chains."
              : embeddedWalletCount > 0
              ? "Provisioned across your EVM and Solana Nex Wallet lanes."
              : "Provision Nex Wallet lanes to unlock send, receive, staking, and export actions."
          }
          accent="cyan"
        />
        <WalletStatusCard
          icon={Layers3}
          label="Wallet inventory"
          value={walletInventoryValue}
          detail={
            profileLoading
              ? "Compiling the wallets currently indexed in your settings workspace."
              : augmentedWallets.length === 1
              ? "Wallet indexed across your settings workspace."
              : "Wallets indexed across your settings workspace."
          }
        />
        <WalletStatusCard
          icon={Link2}
          label="External connectors"
          value={externalConnectorValue}
          detail={
            profileLoading
              ? "Checking linked connectors and external wallet coverage."
              : externalWallets.length > 0
              ? "Linked connectors are available for balance views and transfer flows."
              : "Add MetaMask, Phantom, or another wallet connector to broaden your coverage."
          }
        />
      </div>

      <SettingsSection
        title="Nex Wallet control plane"
        description="Keep your provisioned wallet lanes, rollup execution path, and Nex Wallet identity surfaces together."
        badge={<WalletSectionBadge label="Nex Wallet" />}
      >
        <div className="grid gap-4 xl:grid-cols-3">
          {CDP_ENABLED ? (
            <>
              <CdpWalletDetailCard
                chain="evm"
                address={evmAddress}
                label={resolvedWalletLabels.evm}
              />
              <CdpWalletDetailCard
                chain="solana"
                address={solanaAddress}
                label={resolvedWalletLabels.solana}
              />
            </>
          ) : null}
          <NztRollupWalletCard wallets={augmentedWallets} />
        </div>
      </SettingsSection>

      {CDP_ENABLED ? (
        <SettingsSection
          title="Automation controls"
          description="Review agent spending approvals, funding lanes, staking access, and rewards tied to your Nex Wallets."
          badge={<WalletSectionBadge label="Execution" />}
        >
          <div className="grid gap-4 xl:grid-cols-2">
            <div id="cdp-spend-permissions-section" className="xl:col-span-2">
              <CdpSpendPermissionsCard />
            </div>
            {evmAddress ? <CdpStakingCard chain="evm" address={evmAddress} /> : null}
            {solanaAddress ? <CdpStakingCard chain="solana" address={solanaAddress} /> : null}
            {evmAddress ? (
              <div className="xl:col-span-2">
                <CdpUsdcRewardsCard address={evmAddress} />
              </div>
            ) : null}
          </div>
        </SettingsSection>
      ) : null}

      <SettingsSection
        title="Connected wallets"
        description="Link external wallets, inspect balances, and keep your inventory aligned with the rest of the settings workspace."
        badge={<WalletSectionBadge label="Inventory" />}
      >
        <div className="space-y-6">
          <ConnectExternalWalletCard
            existingWallets={externalWallets}
            isLoading={profileLoading}
          />
          <WalletsTable
            wallets={augmentedWallets}
            isLoading={profileLoading}
            error={walletError}
            initialAction={walletTableAction}
            initialWalletAddress={walletAddressParam}
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title="Agent wallet surfaces"
        description="Wallet lanes assigned to deployed agents and detached runtimes remain visible here for review and maintenance."
        badge={<WalletSectionBadge label="Runtime" />}
      >
        <div className="space-y-6">
          <AgentWalletsSection />
          <DetachedWalletsSection />
        </div>
      </SettingsSection>
    </SettingsPage>
  );
}
