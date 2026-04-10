import { memo } from "react";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { LazyOrb } from "@/components/ui/lazy-orb";
import { AgentMarketplaceItem } from "@/lib/marketplace/types";
import { getOrbColors } from "@/lib/marketplace/utils";
import Image from "next/image";
import Link from "next/link";

interface AgentCardProps {
  agent: AgentMarketplaceItem;
  /** Only show the verified badge when explicitly true */
  isVerified?: boolean;
}

export const AgentCard = memo(function AgentCard({ agent, isVerified = false }: AgentCardProps) {
  if (!agent) return null;

  const isOrb = agent.imageUrl?.startsWith("orb:");
  const orbColors = getOrbColors(agent.imageUrl) ?? ["hsl(var(--primary))", "hsl(var(--primary) / 0.7)"];

  return (
    <Link href={`/agents/${agent.id}`} className="group relative flex flex-col h-full min-h-[280px] bg-marketplace-card border border-marketplace-border-subtle rounded-2xl overflow-hidden hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
       {/* Card header with avatar/gradient */}
       <div className="h-32 w-full relative overflow-visible bg-gradient-to-br from-marketplace-card-hover to-marketplace-card">
          {/* Background Gradient/Pattern */}
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-foreground/10 via-transparent to-transparent" />
          
          <div className="absolute -bottom-6 left-6 z-10">
             <div className="h-14 w-14 rounded-full bg-marketplace-card border-[3px] border-marketplace-card flex items-center justify-center overflow-hidden shadow-lg relative">
                {isOrb ? (
                  <div className="w-full h-full transform scale-150">
                     <LazyOrb colors={orbColors} variant="agent" />
                  </div>
                ) : (
                  <Image 
                    src={agent.imageUrl || "/placeholder-user.jpg"} 
                    alt={agent.name}
                    width={56}
                    height={56}
                    className="object-cover h-full w-full" 
                  />
                )}
                {/* Verified Badge on Avatar — only shown when explicitly verified */}
                {isVerified && <VerifiedBadge className="absolute -bottom-1 -right-1 z-20 scale-75" />}
             </div>
          </div>

          {/* Top right badges */}
          <div className="absolute top-4 right-4 flex gap-2">
             <div className="px-2 py-0.5 rounded-full bg-background/70 backdrop-blur-md border border-border/60 text-[10px] font-medium text-marketplace-text-secondary uppercase tracking-wider">
               {agent.category}
             </div>
          </div>
       </div>

       {/* Content */}
       <div className="flex-1 p-6 pt-10 flex flex-col gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
               <h3 className="font-semibold text-marketplace-text-primary text-lg group-hover:text-primary transition-colors">
                 {agent.name}
               </h3>
            </div>
            <p className="text-xs text-marketplace-text-secondary line-clamp-2 min-h-[2.5em]">
               {agent.tagline || agent.description}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2 mt-auto pt-4 border-t border-marketplace-border-subtle/50">
             <div className="flex flex-col">
                <span className="text-[10px] text-marketplace-text-muted uppercase">Usage</span>
                <span className="text-sm font-medium text-marketplace-text-primary">{agent.stats.users || "0"}</span>
             </div>
             <div className="flex flex-col">
                <span className="text-[10px] text-marketplace-text-muted uppercase">Uptime</span>
                <span className="text-sm font-medium text-marketplace-text-primary">
                  {agent.stats.uptime != null ? `${agent.stats.uptime}%` : "N/A"}
                </span>
             </div>
          </div>
       </div>
    </Link>
  );
});
