"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AgentCampaignStatusPanel } from "@/components/agents/agent-campaign-status-panel";
import {
  loadCampaignReceipts,
  loadCampaignStatus,
  postCampaignMutation,
} from "@/components/agents/agent-campaign-manager.api";
import {
  CAMPAIGN_CHAIN_OPTIONS,
  type CampaignStatusResponse,
  type ReceiptTimelineResponse,
  type TokenStandard,
} from "@/components/agents/agent-campaign-manager.types";

type AgentCampaignManagerProps = {
  agentId: string;
  canManage: boolean;
};

export function AgentCampaignManager({ agentId, canManage }: AgentCampaignManagerProps) {
  const [loading, setLoading] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [contributing, setContributing] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [distributing, setDistributing] = useState(false);
  const [campaignStatus, setCampaignStatus] = useState<CampaignStatusResponse | null>(null);
  const [receipts, setReceipts] = useState<ReceiptTimelineResponse["receipts"]>([]);

  const [chainRef, setChainRef] = useState<string>(CAMPAIGN_CHAIN_OPTIONS[0]?.chainRef ?? "eip155:8453");
  const [tokenStandard, setTokenStandard] = useState<TokenStandard>("erc404");
  const [acceptedAssetsRaw, setAcceptedAssetsRaw] = useState<string>("native,eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913");
  const [whitelistUsersRaw, setWhitelistUsersRaw] = useState<string>("");
  const [whitelistEnabled, setWhitelistEnabled] = useState<boolean>(false);
  const [whitelistOnlyUntilTs, setWhitelistOnlyUntilTs] = useState<string>("");
  const [bondingCurveEnabled, setBondingCurveEnabled] = useState<boolean>(false);
  const [bondingCurveSlopeBps, setBondingCurveSlopeBps] = useState<number>(500);
  const [perWalletCooldownSeconds, setPerWalletCooldownSeconds] = useState<number>(30);
  const [maxContributors, setMaxContributors] = useState<number>(0);

  const [targetBaseUnits, setTargetBaseUnits] = useState<string>("1000000000000000000");
  const [minContributionBaseUnits, setMinContributionBaseUnits] = useState<string>("1000000000000000");
  const [maxContributionBaseUnits, setMaxContributionBaseUnits] = useState<string>("100000000000000000");
  const [valuationCapBaseUnits, setValuationCapBaseUnits] = useState<string>("1000000000000000000000");
  const [treasuryAddress, setTreasuryAddress] = useState<string>("");

  const [creatorBps, setCreatorBps] = useState<number>(1000);
  const [operatorBps, setOperatorBps] = useState<number>(500);
  const [requireVerifiedWallet, setRequireVerifiedWallet] = useState<boolean>(false);
  const [blockSanctionedJurisdictions, setBlockSanctionedJurisdictions] = useState<boolean>(true);
  const [requireAcknowledgedRisk, setRequireAcknowledgedRisk] = useState<boolean>(true);

  const [contributionNetworkId, setContributionNetworkId] = useState<string>("eip155:8453");
  const [contributionAssetId, setContributionAssetId] = useState<string>("native");
  const [contributionAmountBaseUnits, setContributionAmountBaseUnits] = useState<string>("1000000000000000");
  const [contributionTxHash, setContributionTxHash] = useState<string>("");

  const [claimNetworkId, setClaimNetworkId] = useState<string>("eip155:8453");
  const [claimAssetId, setClaimAssetId] = useState<string>("native");
  const [claimBaseUnits, setClaimBaseUnits] = useState<string>("");
  const [claimTxHash, setClaimTxHash] = useState<string>("");

  const [distributionNetworkId, setDistributionNetworkId] = useState<string>("eip155:8453");
  const [distributionAssetId, setDistributionAssetId] = useState<string>("native");
  const [distributionGrossBaseUnits, setDistributionGrossBaseUnits] = useState<string>("1000000000000000");
  const [distributionTxHash, setDistributionTxHash] = useState<string>("");
  const [executeOnChainPayout, setExecuteOnChainPayout] = useState<boolean>(true);
  const [investorTreasuryAddress, setInvestorTreasuryAddress] = useState<string>("");

  const [finalizeStatus, setFinalizeStatus] = useState<"finalized" | "cancelled">("finalized");
  const [campaignAddress, setCampaignAddress] = useState<string>("");
  const [shareTokenAddress, setShareTokenAddress] = useState<string>("");

  const investorBps = useMemo(() => Math.max(0, 10_000 - creatorBps - operatorBps), [creatorBps, operatorBps]);

  const loadStatus = useCallback(async () => {
    const payload = await loadCampaignStatus(agentId);
    setCampaignStatus(payload);
  }, [agentId]);

  const loadReceipts = useCallback(async () => {
    const payload = await loadCampaignReceipts(agentId);
    setReceipts(payload);
  }, [agentId]);

  useEffect(() => {
    void Promise.all([loadStatus(), loadReceipts()]);
  }, [loadReceipts, loadStatus]);

  const activeCampaign = campaignStatus?.campaign ?? null;
  const activeCampaignId = activeCampaign?.id ?? null;
  const isCampaignOpen = activeCampaign?.status === "active";
  const claimable = campaignStatus?.position?.claimableBaseUnits ?? "0";

  const postMutation = useCallback(
    async <TPayload extends Record<string, unknown>, TResponse = Record<string, unknown>>(
      action: "create" | "deploy" | "finalize" | "distribute" | "contribute" | "claim",
      payload: TPayload,
      fallbackError: string,
    ) =>
      postCampaignMutation<TPayload, TResponse>({
        agentId,
        action,
        payload,
        fallbackError,
      }),
    [agentId],
  );

  return (
    <section className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <header className="space-y-1">
        <h2 className="text-lg font-regular text-white">Campaign launchpad</h2>
        <p className="text-sm text-muted-foreground">
          Create crowdfunding campaigns and deploy on-chain contracts for fractional ownership.
        </p>
      </header>

      <AgentCampaignStatusPanel campaignStatus={campaignStatus} receipts={receipts} />

      <div className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-sm font-medium text-white">Investor actions</h3>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="grid gap-2">
            <Label htmlFor="contribution-network">Contribution Network</Label>
            <Input id="contribution-network" className="bg-black/40 font-mono text-xs" value={contributionNetworkId} onChange={(event) => setContributionNetworkId(event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contribution-asset">Contribution Asset</Label>
            <Input id="contribution-asset" className="bg-black/40 font-mono text-xs" value={contributionAssetId} onChange={(event) => setContributionAssetId(event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contribution-amount">Amount (base units)</Label>
            <Input id="contribution-amount" className="bg-black/40" value={contributionAmountBaseUnits} onChange={(event) => setContributionAmountBaseUnits(event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contribution-tx">Contribution Tx (optional)</Label>
            <Input id="contribution-tx" className="bg-black/40 font-mono text-xs" value={contributionTxHash} onChange={(event) => setContributionTxHash(event.target.value)} />
          </div>
        </div>
        <Button
          disabled={!activeCampaignId || !isCampaignOpen || contributing}
          onClick={async () => {
            try {
              if (!activeCampaignId) throw new Error("No active campaign.");
              setContributing(true);
              await postMutation(
                "contribute",
                {
                  campaignId: activeCampaignId,
                  networkId: contributionNetworkId.trim(),
                  assetId: contributionAssetId.trim() || "native",
                  amountBaseUnits: contributionAmountBaseUnits.trim(),
                  txHash: contributionTxHash.trim() || undefined,
                  idempotencyKey: crypto.randomUUID(),
                  riskAcknowledged: true,
                },
                "Contribution failed",
              );
              toast.success("Contribution submitted", { description: "Your investor position has been updated." });
              await loadStatus();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Failed to contribute.");
            } finally {
              setContributing(false);
            }
          }}
        >
          {contributing ? "Contributing…" : "Contribute"}
        </Button>

        <div className="grid gap-3 sm:grid-cols-4">
          <div className="grid gap-2">
            <Label htmlFor="claim-network">Claim Network</Label>
            <Input id="claim-network" className="bg-black/40 font-mono text-xs" value={claimNetworkId} onChange={(event) => setClaimNetworkId(event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="claim-asset">Claim Asset</Label>
            <Input id="claim-asset" className="bg-black/40 font-mono text-xs" value={claimAssetId} onChange={(event) => setClaimAssetId(event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="claim-amount">Claim Amount (optional)</Label>
            <Input id="claim-amount" className="bg-black/40" value={claimBaseUnits} onChange={(event) => setClaimBaseUnits(event.target.value)} placeholder="leave empty to claim all" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="claim-tx">Claim Tx (optional)</Label>
            <Input id="claim-tx" className="bg-black/40 font-mono text-xs" value={claimTxHash} onChange={(event) => setClaimTxHash(event.target.value)} />
          </div>
        </div>
        <Button
          variant="outline"
          disabled={!activeCampaignId || claiming || claimable === "0"}
          onClick={async () => {
            try {
              if (!activeCampaignId) throw new Error("No active campaign.");
              setClaiming(true);
              const payload = await postMutation<
                Record<string, unknown>,
                { claim?: { amountBaseUnits?: string } }
              >(
                "claim",
                {
                  campaignId: activeCampaignId,
                  networkId: claimNetworkId.trim(),
                  assetId: claimAssetId.trim() || "native",
                  claimBaseUnits: claimBaseUnits.trim() || undefined,
                  txHash: claimTxHash.trim() || undefined,
                  idempotencyKey: crypto.randomUUID(),
                },
                "Claim failed",
              );
              toast.success("Claim completed", { description: `Claimed ${payload?.claim?.amountBaseUnits ?? "funds"}.` });
              await loadStatus();
              await loadReceipts();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Failed to claim revenue.");
            } finally {
              setClaiming(false);
            }
          }}
        >
          {claiming ? "Claiming…" : "Claim Revenue"}
        </Button>
      </div>

      {canManage ? (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-4">
          <h3 className="text-sm font-medium text-white">Manager controls</h3>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="campaign-chain">Chain</Label>
              <Select value={chainRef} onValueChange={setChainRef}>
                <SelectTrigger id="campaign-chain" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CAMPAIGN_CHAIN_OPTIONS.map((option) => (
                    <SelectItem key={option.chainRef} value={option.chainRef}>{option.label} ({option.chainRef})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="campaign-token-standard">Token Standard</Label>
              <Select value={tokenStandard} onValueChange={(value: TokenStandard) => setTokenStandard(value)}>
                <SelectTrigger id="campaign-token-standard" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="erc404">ERC-404 Hybrid</SelectItem>
                  <SelectItem value="erc20">ERC-20</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="campaign-assets">Accepted Assets (comma-separated)</Label>
              <Textarea id="campaign-assets" rows={2} className="bg-black/40 font-mono text-xs" value={acceptedAssetsRaw} onChange={(event) => setAcceptedAssetsRaw(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="campaign-whitelist-users">Whitelist Users (comma-separated UUIDs)</Label>
              <Textarea id="campaign-whitelist-users" rows={2} className="bg-black/40 font-mono text-xs" value={whitelistUsersRaw} onChange={(event) => setWhitelistUsersRaw(event.target.value)} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2"><Label htmlFor="campaign-target">Target (base units)</Label><Input id="campaign-target" className="bg-black/40" value={targetBaseUnits} onChange={(event) => setTargetBaseUnits(event.target.value)} /></div>
              <div className="grid gap-2"><Label htmlFor="campaign-min">Min Contribution (base units)</Label><Input id="campaign-min" className="bg-black/40" value={minContributionBaseUnits} onChange={(event) => setMinContributionBaseUnits(event.target.value)} /></div>
              <div className="grid gap-2"><Label htmlFor="campaign-max">Max Contribution (base units)</Label><Input id="campaign-max" className="bg-black/40" value={maxContributionBaseUnits} onChange={(event) => setMaxContributionBaseUnits(event.target.value)} /></div>
              <div className="grid gap-2"><Label htmlFor="campaign-valuation">Valuation Cap (base units)</Label><Input id="campaign-valuation" className="bg-black/40" value={valuationCapBaseUnits} onChange={(event) => setValuationCapBaseUnits(event.target.value)} /></div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="campaign-treasury">Treasury Address (EVM)</Label>
              <Input id="campaign-treasury" className="bg-black/40 font-mono text-xs" placeholder="0x..." value={treasuryAddress} onChange={(event) => setTreasuryAddress(event.target.value)} />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-2"><Label htmlFor="campaign-creator-bps">Creator BPS</Label><Input id="campaign-creator-bps" className="bg-black/40" type="number" min={0} max={10000} value={creatorBps} onChange={(event) => setCreatorBps(Math.max(0, Math.min(10000, Number(event.target.value) || 0)))} /></div>
              <div className="grid gap-2"><Label htmlFor="campaign-operator-bps">Operator BPS</Label><Input id="campaign-operator-bps" className="bg-black/40" type="number" min={0} max={10000} value={operatorBps} onChange={(event) => setOperatorBps(Math.max(0, Math.min(10000, Number(event.target.value) || 0)))} /></div>
              <div className="grid gap-2"><Label htmlFor="campaign-investor-bps">Investor BPS</Label><Input id="campaign-investor-bps" className="bg-black/40" type="number" value={investorBps} readOnly /></div>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <div className="grid gap-2"><Label htmlFor="whitelist-enabled">Whitelist Enabled (1/0)</Label><Input id="whitelist-enabled" className="bg-black/40" value={whitelistEnabled ? "1" : "0"} onChange={(event) => setWhitelistEnabled(event.target.value === "1")} /></div>
              <div className="grid gap-2"><Label htmlFor="whitelist-until">Whitelist Until ISO TS</Label><Input id="whitelist-until" className="bg-black/40 font-mono text-xs" value={whitelistOnlyUntilTs} onChange={(event) => setWhitelistOnlyUntilTs(event.target.value)} /></div>
              <div className="grid gap-2"><Label htmlFor="bonding-enabled">Bonding Curve (1/0)</Label><Input id="bonding-enabled" className="bg-black/40" value={bondingCurveEnabled ? "1" : "0"} onChange={(event) => setBondingCurveEnabled(event.target.value === "1")} /></div>
              <div className="grid gap-2"><Label htmlFor="bonding-slope">Bonding Slope BPS</Label><Input id="bonding-slope" className="bg-black/40" type="number" value={bondingCurveSlopeBps} onChange={(event) => setBondingCurveSlopeBps(Number(event.target.value) || 0)} /></div>
              <div className="grid gap-2"><Label htmlFor="wallet-cooldown">Wallet Cooldown (s)</Label><Input id="wallet-cooldown" className="bg-black/40" type="number" value={perWalletCooldownSeconds} onChange={(event) => setPerWalletCooldownSeconds(Number(event.target.value) || 0)} /></div>
              <div className="grid gap-2"><Label htmlFor="max-contributors">Max Contributors (0=disabled)</Label><Input id="max-contributors" className="bg-black/40" type="number" value={maxContributors} onChange={(event) => setMaxContributors(Number(event.target.value) || 0)} /></div>
              <div className="grid gap-2"><Label htmlFor="policy-verified-wallet">Require Verified Wallet (1/0)</Label><Input id="policy-verified-wallet" className="bg-black/40" value={requireVerifiedWallet ? "1" : "0"} onChange={(event) => setRequireVerifiedWallet(event.target.value === "1")} /></div>
              <div className="grid gap-2"><Label htmlFor="policy-sanction-block">Block Sanctioned Jurisdictions (1/0)</Label><Input id="policy-sanction-block" className="bg-black/40" value={blockSanctionedJurisdictions ? "1" : "0"} onChange={(event) => setBlockSanctionedJurisdictions(event.target.value === "1")} /></div>
              <div className="grid gap-2"><Label htmlFor="policy-risk-ack">Require Risk Ack (1/0)</Label><Input id="policy-risk-ack" className="bg-black/40" value={requireAcknowledgedRisk ? "1" : "0"} onChange={(event) => setRequireAcknowledgedRisk(event.target.value === "1")} /></div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2"><Label htmlFor="campaign-address">Campaign Address (optional)</Label><Input id="campaign-address" className="bg-black/40 font-mono text-xs" value={campaignAddress} onChange={(event) => setCampaignAddress(event.target.value)} /></div>
            <div className="grid gap-2"><Label htmlFor="share-token-address">Share Token Address (optional)</Label><Input id="share-token-address" className="bg-black/40 font-mono text-xs" value={shareTokenAddress} onChange={(event) => setShareTokenAddress(event.target.value)} /></div>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="grid gap-2"><Label htmlFor="distribution-network">Distribution Network</Label><Input id="distribution-network" className="bg-black/40 font-mono text-xs" value={distributionNetworkId} onChange={(event) => setDistributionNetworkId(event.target.value)} /></div>
            <div className="grid gap-2"><Label htmlFor="distribution-asset">Distribution Asset</Label><Input id="distribution-asset" className="bg-black/40 font-mono text-xs" value={distributionAssetId} onChange={(event) => setDistributionAssetId(event.target.value)} /></div>
            <div className="grid gap-2"><Label htmlFor="distribution-gross">Distribution Gross (base units)</Label><Input id="distribution-gross" className="bg-black/40" value={distributionGrossBaseUnits} onChange={(event) => setDistributionGrossBaseUnits(event.target.value)} /></div>
            <div className="grid gap-2"><Label htmlFor="distribution-tx">Distribution Tx (optional)</Label><Input id="distribution-tx" className="bg-black/40 font-mono text-xs" value={distributionTxHash} onChange={(event) => setDistributionTxHash(event.target.value)} /></div>
            <div className="grid gap-2"><Label htmlFor="distribution-execute">Execute On-Chain Payout (1/0)</Label><Input id="distribution-execute" className="bg-black/40" value={executeOnChainPayout ? "1" : "0"} onChange={(event) => setExecuteOnChainPayout(event.target.value === "1")} /></div>
            <div className="grid gap-2"><Label htmlFor="investor-treasury">Investor Treasury</Label><Input id="investor-treasury" className="bg-black/40 font-mono text-xs" value={investorTreasuryAddress} onChange={(event) => setInvestorTreasuryAddress(event.target.value)} /></div>
          </div>

          <div className="flex flex-wrap gap-2">
	            <Button
	              disabled={loading || !treasuryAddress.trim()}
	              onClick={async () => {
	                try {
	                  setLoading(true);
	                  const acceptedAssets = acceptedAssetsRaw.split(",").map((item) => item.trim()).filter(Boolean);
	                  if (acceptedAssets.length === 0) throw new Error("Provide at least one accepted asset.");
	                  if (creatorBps + operatorBps > 10_000) throw new Error("Creator + operator BPS cannot exceed 10000.");

	                  await postMutation(
	                    "create",
	                    {
	                      chainFamily: chainRef.startsWith("solana:") ? "solana" : "evm",
	                      chainRef,
	                      tokenStandard,
	                      acceptedAssets,
                      targetBaseUnits: targetBaseUnits.trim(),
                      minContributionBaseUnits: minContributionBaseUnits.trim(),
                      maxContributionBaseUnits: maxContributionBaseUnits.trim() || null,
                      valuationCapBaseUnits: valuationCapBaseUnits.trim() || null,
                      treasuryAddress: treasuryAddress.trim(),
                      launchControls: {
                        whitelistEnabled,
                        whitelistOnlyUntilTs: whitelistOnlyUntilTs.trim() || null,
                        bondingCurveEnabled,
                        bondingCurveSlopeBps,
                        perWalletCooldownSeconds,
                        maxContributors,
                      },
                      compliancePolicy: {
                        requireVerifiedWallet,
                        blockSanctionedJurisdictions,
                        requireAcknowledgedRisk,
                      },
                      whitelistUsers: whitelistUsersRaw.split(",").map((item) => item.trim()).filter(Boolean),
                      revenuePolicy: {
                        creatorBps,
                        operatorBps,
                        investorBps,
	                        creatorTreasury: treasuryAddress.trim(),
	                        operatorTreasury: treasuryAddress.trim(),
	                      },
	                    },
	                    "Campaign creation failed",
	                  );
	                  toast.success("Campaign created", { description: "Campaign is now active and ready for deployment." });
	                  await loadStatus();
	                } catch (error) {
	                  toast.error(error instanceof Error ? error.message : "Failed to create campaign.");
                } finally {
                  setLoading(false);
                }
              }}
            >
              {loading ? "Creating…" : "Create Campaign"}
            </Button>

            <Button
              variant="outline"
              disabled={deploying || !activeCampaignId}
	              onClick={async () => {
	                try {
	                  if (!activeCampaignId) throw new Error("No active campaign to deploy.");
	                  setDeploying(true);
	                  const payload = await postMutation<
	                    Record<string, unknown>,
	                    { campaign?: { share_token_address?: string | null } }
	                  >(
	                    "deploy",
	                    { campaignId: activeCampaignId, tokenStandard, idempotencyKey: crypto.randomUUID() },
	                    "Deploy failed",
	                  );
	                  toast.success("Campaign contracts deployed", { description: `Share token: ${payload?.campaign?.share_token_address ?? "deployed"}` });
	                  await loadStatus();
	                } catch (error) {
	                  toast.error(error instanceof Error ? error.message : "Failed to deploy campaign contracts.");
                } finally {
                  setDeploying(false);
                }
              }}
            >
              {deploying ? "Deploying…" : "Deploy Contracts"}
            </Button>

            <Select value={finalizeStatus} onValueChange={(value: "finalized" | "cancelled") => setFinalizeStatus(value)}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="finalized">Finalize</SelectItem>
                <SelectItem value="cancelled">Cancel</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              disabled={finalizing || !activeCampaignId || !["active", "draft"].includes(activeCampaign?.status ?? "")}
	              onClick={async () => {
	                try {
	                  if (!activeCampaignId) throw new Error("No active campaign to finalize.");
	                  setFinalizing(true);
	                  await postMutation(
	                    "finalize",
	                    {
	                      campaignId: activeCampaignId,
	                      finalStatus: finalizeStatus,
	                      campaignAddress: campaignAddress.trim() || null,
	                      shareTokenAddress: shareTokenAddress.trim() || null,
	                      treasuryAddress: treasuryAddress.trim() || null,
	                    },
	                    "Finalize failed",
	                  );
	                  toast.success(`Campaign ${finalizeStatus}`, { description: "Campaign status has been updated." });
	                  await loadStatus();
	                } catch (error) {
	                  toast.error(error instanceof Error ? error.message : "Failed to finalize campaign.");
                } finally {
                  setFinalizing(false);
                }
              }}
            >
              {finalizing ? "Finalizing…" : finalizeStatus === "cancelled" ? "Cancel Campaign" : "Finalize Campaign"}
            </Button>

            <Button
              variant="secondary"
              disabled={distributing || !activeCampaignId}
	              onClick={async () => {
	                try {
	                  if (!activeCampaignId) throw new Error("No campaign selected for distribution.");
	                  setDistributing(true);
	                  const payload = await postMutation<
	                    Record<string, unknown>,
	                    { distribution?: { investor_base_units?: string | null } }
	                  >(
	                    "distribute",
	                    {
	                      campaignId: activeCampaignId,
	                      networkId: distributionNetworkId.trim(),
	                      assetId: distributionAssetId.trim() || "native",
	                      grossBaseUnits: distributionGrossBaseUnits.trim(),
                      txHash: distributionTxHash.trim() || undefined,
	                      executeOnChain: executeOnChainPayout,
	                      investorTreasury: investorTreasuryAddress.trim() || undefined,
	                      idempotencyKey: crypto.randomUUID(),
	                    },
	                    "Distribution failed",
	                  );
	                  toast.success("Revenue distributed", { description: `Investor tranche: ${payload?.distribution?.investor_base_units ?? "updated"}` });
	                  await Promise.all([loadStatus(), loadReceipts()]);
	                } catch (error) {
	                  toast.error(error instanceof Error ? error.message : "Failed to distribute revenue.");
                } finally {
                  setDistributing(false);
                }
              }}
            >
              {distributing ? "Distributing…" : "Distribute Revenue"}
            </Button>

            <Button variant="ghost" onClick={() => void Promise.all([loadStatus(), loadReceipts()])}>Refresh</Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
