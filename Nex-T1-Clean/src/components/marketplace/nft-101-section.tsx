"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

interface GuideCardProps {
  title: string;
  description: string;
  href: string;
  image: string;
  gradient: string;
}

const CARDS: GuideCardProps[] = [
  {
    title: "Design Strategy Logic",
    description: "Build and publish reusable strategy drafts with the visual strategy lab.",
    href: "/agents/strategy-lab",
    image: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=400",
    gradient: "from-primary/80 to-primary",
  },
  {
    title: "Create & Launch an Agent",
    description: "Use the production wizard to configure tools, pricing, secrets, and deployment.",
    href: "/agents/new",
    image: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=400",
    gradient: "from-secondary/80 to-secondary",
  },
  {
    title: "Configure Spend Policies",
    description: "Apply operational guardrails before deploying or invoking value-moving tools.",
    href: "/settings/agent-spend",
    image: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=400",
    gradient: "from-accent/80 to-accent",
  },
  {
    title: "Manage Published Agents",
    description: "Review versions, update listings, and monitor deployments from one dashboard.",
    href: "/settings/agents",
    image: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=400",
    gradient: "from-muted/80 to-muted",
  },
];

export function AgentGuidesSection() {
  return (
    <section className="space-y-4">
      <div className="flex flex-col">
        <h2 className="text-xl font-bold text-foreground tracking-tight">Agent Guides</h2>
        <p className="text-[13px] text-muted-foreground">Operational playbooks for building, deploying, and managing agents.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {CARDS.map((card, i) => (
          <Link key={i} href={card.href} className="group cursor-pointer">
            <div
              className={cn(
                "relative aspect-video rounded-2xl overflow-hidden bg-gradient-to-br flex items-center justify-center",
                card.gradient,
              )}
            >
              <div className="absolute inset-0 bg-foreground/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative w-3/4 h-3/4">
                <Image
                  src={card.image}
                  alt={card.title}
                  fill
                  className="object-contain drop-shadow-2xl transition-transform duration-500 group-hover:scale-110"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
              </div>

              <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-background/70 backdrop-blur-md flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4 text-foreground" />
              </div>
            </div>
            <h4 className="mt-3 text-[14px] font-bold text-foreground group-hover:text-primary transition-colors">
              {card.title}
            </h4>
            <p className="mt-1 text-[12px] text-muted-foreground line-clamp-2">{card.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export const NFT101Section = AgentGuidesSection;
