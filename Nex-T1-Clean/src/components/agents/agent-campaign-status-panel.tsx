import type {
  CampaignStatusResponse,
  ReceiptTimelineResponse,
} from "@/components/agents/agent-campaign-manager.types";

type AgentCampaignStatusPanelProps = {
  campaignStatus: CampaignStatusResponse | null;
  receipts: ReceiptTimelineResponse["receipts"];
};

export function AgentCampaignStatusPanel({
  campaignStatus,
  receipts,
}: AgentCampaignStatusPanelProps) {
  const activeCampaign = campaignStatus?.campaign ?? null;

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-muted-foreground">
      {activeCampaign ? (
        <div className="space-y-1">
          <p><span className="text-white">Campaign:</span> {activeCampaign.id}</p>
          <p><span className="text-white">Chain:</span> {activeCampaign.chainRef} ({activeCampaign.chainFamily})</p>
          <p><span className="text-white">Raised:</span> {activeCampaign.raisedBaseUnits} / {activeCampaign.targetBaseUnits}</p>
          <p><span className="text-white">Status:</span> {activeCampaign.status}</p>
          <p><span className="text-white">Token Standard:</span> {activeCampaign.tokenStandard ?? "erc20"}</p>
          <p><span className="text-white">Risk:</span> {activeCampaign.riskScore ?? 0}/100</p>
          {(activeCampaign.riskFlags?.length ?? 0) > 0 ? (
            <p><span className="text-white">Risk Flags:</span> {activeCampaign.riskFlags?.join(", ")}</p>
          ) : null}
          {campaignStatus?.position ? (
            <p>
              <span className="text-white">Your Position:</span> {campaignStatus.position.sharesOwnedBaseUnits} shares, claimable{" "}
              {campaignStatus.position.claimableBaseUnits}
            </p>
          ) : null}
        </div>
      ) : (
        <p>No active campaign found for this agent yet.</p>
      )}

      {(campaignStatus?.distributions?.length ?? 0) > 0 ? (
        <div className="space-y-1 border-t border-white/10 pt-3">
          <p className="text-white">Recent distributions</p>
          {campaignStatus?.distributions?.slice(0, 3).map((distribution) => (
            <p key={distribution.id} className="truncate">
              Epoch {distribution.epochIndex}: gross {distribution.grossBaseUnits}, investor share {distribution.investorBaseUnits}
            </p>
          ))}
        </div>
      ) : null}

      {(receipts?.length ?? 0) > 0 ? (
        <div className="space-y-1 border-t border-white/10 pt-3">
          <p className="text-white">Signed receipt timeline</p>
          {receipts?.slice(0, 5).map((receipt) => (
            <p key={receipt.id} className="truncate">
              {receipt.amountBaseUnits} • {receipt.txHash ? `${receipt.txHash.slice(0, 12)}…` : "off-chain"} • sig {receipt.signature.slice(0, 10)}…
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
