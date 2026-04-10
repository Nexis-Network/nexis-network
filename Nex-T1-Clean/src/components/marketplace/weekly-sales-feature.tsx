import { AgentAvatar } from "@/components/marketplace/agent-avatar";
import { cn } from "@/lib/utils";
import { TrendingUp } from "lucide-react";
import Link from "next/link";

interface VolumeItemProps {
  image: string;
  name: string;
  price: string;
  href?: string;
}

function MiniVolumeCard({ image, name, price, href }: VolumeItemProps) {
  const card = (
    <div className="bg-background/70 backdrop-blur-md rounded-xl p-3 border border-border/60 w-full group/mini cursor-pointer hover:bg-accent/60 transition-all">
      <div className="aspect-square rounded-lg overflow-hidden mb-2 bg-muted/40 relative">
        <AgentAvatar
          src={image}
          name={name}
          fill
          imageClassName="object-cover w-full h-full group-hover/mini:scale-110 transition-transform"
          sizes="200px"
          enableOrb={true}
        />
      </div>
      <p className="text-[11px] font-bold text-foreground truncate">{name}</p>
      <p className="text-[10px] text-muted-foreground">Entry {price}</p>
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

interface WeeklySalesProps {
  topAgent?: {
    name: string;
    image: string;
    volume: string;
    change: string;
    description: string;
    href?: string;
  };
  relatedAgents?: Array<{
    name: string;
    price: string;
    image: string;
    href?: string;
  }>;
}

export function WeeklySalesFeature({ topAgent, relatedAgents = [] }: WeeklySalesProps) {
  if (!topAgent) return null;
  const safeRelatedAgents = Array.isArray(relatedAgents) ? relatedAgents : [];

  return (
    <section className="space-y-4">
      <div className="flex flex-col">
        <h2 className="text-xl font-bold text-foreground tracking-tight">Highest Weekly Volume</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Feature Card */}
        <Link
          href={topAgent.href ?? "#"}
          className={cn(
            "lg:col-span-2 relative aspect-[16/9] lg:aspect-auto h-full rounded-2xl overflow-hidden border border-border/60 group min-h-[400px]",
            !topAgent.href ? "pointer-events-none" : "",
          )}
        >
          <AgentAvatar
            src={topAgent.image}
            name={topAgent.name}
            fill
            imageClassName="object-cover transition-transform duration-700 group-hover:scale-105 opacity-60"
            sizes="(max-width: 1024px) 100vw, 66vw"
            enableOrb={true}
            orbClassName="scale-[2.5] opacity-80 group-hover:scale-[2.7] transition-transform duration-700"
            className="absolute inset-0 bg-transparent"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          
          <div className="absolute inset-0 p-8 flex flex-col justify-end gap-6">
            <div className="space-y-2 max-w-md">
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-border/60 shrink-0 bg-muted/40 relative">
                    <AgentAvatar 
                      src={topAgent.image} 
                      name={topAgent.name} 
                      fill 
                      imageClassName="w-full h-full object-cover" 
                      enableOrb={true}
                    />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    {topAgent.name} <TrendingUp className="w-5 h-5 text-primary" />
                  </h3>
                  <p className="text-xs font-bold text-muted-foreground">
                    {topAgent.volume} routed volume{" "}
                    <span className={cn("ml-1", topAgent.change.startsWith("-") ? "text-rose-500" : "text-emerald-500")}>
                      {topAgent.change}
                    </span>
                  </p>
                </div>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3">
                {topAgent.description}
              </p>
            </div>
            
            <div className="flex gap-4 w-full max-w-sm overflow-x-auto no-scrollbar">
               {safeRelatedAgents.map((agent, i) => (
                 <MiniVolumeCard key={i} {...agent} />
               ))}
            </div>
          </div>
        </Link>

        {/* Side Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
           {safeRelatedAgents.slice(0, 2).map((agent, i) => (
                 <Link
                   key={i}
                   href={agent.href ?? "#"}
                   className={cn(
                   "relative aspect-square rounded-2xl overflow-hidden border border-border/60 group bg-card",
                   !agent.href ? "pointer-events-none" : "",
                 )}
               >
                  <AgentAvatar
                     src={agent.image}
                     name={agent.name}
                     fill
                     imageClassName="object-cover group-hover:scale-110 transition-transform"
                     sizes="(max-width: 1024px) 50vw, 33vw"
                     enableOrb={true}
                     orbClassName="scale-150 transform group-hover:scale-[1.7] transition-transform duration-500"
                  />
                  <div className="absolute bottom-4 left-4 right-4 p-3 bg-background/70 backdrop-blur-md rounded-xl border border-border/60">
                     <p className="text-xs font-bold text-foreground truncate">{agent.name}</p>
                     <p className="text-[10px] text-muted-foreground">Entry {agent.price}</p>
                  </div>
               </Link>
           ))}
        </div>
      </div>
    </section>
  );
}
