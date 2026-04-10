"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";
import { AgentAvatar } from "@/components/marketplace/agent-avatar";
import Link from "next/link";

export type CollectionCardType = "collection" | "drop" | "mover" | "simple";

interface CollectionCardProps {
  type?: CollectionCardType;
  title: string;
  subtitle?: string;
  value?: string;     // Replaces floorPrice
  valueLabel?: string; // e.g. "Floor Price", "Win Rate", "Total Vol"
  change?: string;
  isPositive?: boolean;
  image: string;
  verified?: boolean;
  className?: string;
  orbColors?: [string, string];
  href?: string;
}

export function CollectionCard({
  type = "collection",
  title,
  subtitle,
  value,
  valueLabel = "Price",
  change,
  isPositive,
  image,
  verified = false,
  className,
  orbColors: _orbColors,
  href,
}: CollectionCardProps) {
  /* Simplified logic using AgentAvatar inside render */

  if (type === "mover") {
    const moverContent = (
      <div className={cn("flex items-center gap-3 p-3 rounded-xl bg-card border border-border/60 hover:bg-accent transition-all group cursor-pointer", className)}>
        <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-border/60 relative">
          <AgentAvatar
            src={image}
            name={title}
            fill
            imageClassName="object-cover w-full h-full"
            sizes="48px"
            enableOrb={false}
          />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-[13px] font-bold text-foreground truncate group-hover:text-primary transition-colors flex items-center gap-1">
            {title}
            {verified && <CheckCircle2 className="w-3.5 h-3.5 text-primary fill-primary/10" />}
          </h4>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-[11px] text-muted-foreground">{value}</span>
            {change && (
              <span className={cn("text-[11px] font-bold", isPositive ? "text-emerald-500" : "text-rose-500")}>
                {change}
              </span>
            )}
          </div>
        </div>
      </div>
    );
    return href ? <Link href={href}>{moverContent}</Link> : moverContent;
  }

  const defaultContent = (
    <div className={cn("group cursor-pointer", className)}>
      <div className={cn(
        "relative rounded-xl overflow-hidden border border-border/60 bg-card mb-3",
        type === "drop" ? "aspect-[1.5/1]" : "aspect-square"
      )}>
        <AgentAvatar
          src={image}
          name={title}
          fill
          imageClassName="object-cover transition-transform duration-500 group-hover:scale-110"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          enableOrb={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      
      <div className="space-y-0.5">
        <h4 className="text-[14px] font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
          {title}
          {verified && <CheckCircle2 className="w-3.5 h-3.5 text-primary fill-primary/10" />}
        </h4>
        <div className="flex items-center gap-2">
          {subtitle && <p className="text-[12px] text-muted-foreground truncate max-w-[150px]">{subtitle}</p>}
          {value && (
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-[10px] text-muted-foreground uppercase">{valueLabel}</span>
              <span className="text-[12px] font-bold text-foreground/80">{value}</span>
              {change && (
                <span className={cn("text-[11px] font-medium ml-1", isPositive ? "text-emerald-500" : "text-rose-500")}>
                  {change}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
  return href ? <Link href={href}>{defaultContent}</Link> : defaultContent;
}

interface CollectionSectionProps {
  title: string;
  subtitle?: string;
  type?: CollectionCardType;
  items: UntypedJson[];
  gridCols?: string;
}

export function CollectionSection({
  title,
  subtitle,
  items,
  type = "collection",
  gridCols = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
}: CollectionSectionProps) {
  const safeItems = Array.isArray(items) ? items : [];

  return (
    <section className="space-y-4">
      <div className="flex flex-col">
        <h2 className="text-xl font-bold text-foreground tracking-tight">{title}</h2>
        {subtitle && <p className="text-[13px] text-muted-foreground">{subtitle}</p>}
      </div>
      
      <div className={cn("grid gap-4", gridCols)}>
        {safeItems.map((item, i) => (
          <CollectionCard key={i} type={type} {...item} />
        ))}
      </div>
    </section>
  );
}
