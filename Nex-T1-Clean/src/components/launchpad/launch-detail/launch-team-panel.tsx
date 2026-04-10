import { Shield } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { LaunchpadCampaignDetail } from "@/lib/launchpad/types";

import { formatDateTime, truncateAddress } from "@/components/launchpad/launch-detail/utils";

type LaunchTeamPanelProps = {
  campaign: LaunchpadCampaignDetail;
};

export function LaunchTeamPanel({ campaign }: LaunchTeamPanelProps) {
  return (
    <article className="rounded-2xl border border-[#26272D] bg-[#141415] p-5">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="size-4 text-[#57B4FF]" />
          <h2 className="text-sm font-semibold text-white">Team</h2>
        </div>
        <Badge variant="outline" className="border-white/15 bg-[#17181b] text-white/70">
          {campaign.team.length} members
        </Badge>
      </header>

      <div className="space-y-2.5">
        {campaign.team.length === 0 ? (
          <div className="rounded-lg border border-[#26272D] bg-[#17181b] p-3 text-sm text-white/60">
            Team roster is currently unavailable.
          </div>
        ) : (
          campaign.team.map((member) => (
            <div key={member.userId} className="flex items-center justify-between gap-3 rounded-lg border border-[#26272D] bg-[#17181b] p-3">
              <div className="min-w-0">
                <p className="truncate text-sm text-white">{member.displayName}</p>
                <p className="truncate text-xs text-white/55">
                  {truncateAddress(member.walletAddress)} {member.walletNamespace ? `(${member.walletNamespace})` : ""}
                </p>
                <p className="mt-1 text-[11px] text-white/45">Joined {formatDateTime(member.joinedAt)}</p>
              </div>
              <Badge variant="outline" className="border-white/20 bg-black/30 text-[11px] uppercase text-white/80">
                {member.role}
              </Badge>
            </div>
          ))
        )}
      </div>
    </article>
  );
}
