"use client";

import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { AgentAvatar } from "@/components/marketplace/agent-avatar";
import dynamic from "next/dynamic";
import Link from "next/link";

const Spline = dynamic(() => import("@splinetool/react-spline"), {
  ssr: false,
});

type HeroThumbnail = {
  src: string;
  alt: string;
  href: string;
};

interface MarketHeroProps {
  title: string;
  author: string;
  href: string;
  backgroundImage: string;
  splineScene?: string;
  stats: {
    entryPrice: string;
    owners: string;
    weeklyVolume: string;
    adoption: string;
  };
  thumbnails: HeroThumbnail[];
}

export function MarketHero({
  title = "Featured Agent",
  author = "Nex-T1 Marketplace",
  href = "/marketplace",
  backgroundImage = "https://images.unsplash.com/photo-1635322966219-b75ed372eb01?q=80&w=2000&auto=format&fit=crop",
  splineScene,
  stats = {
    entryPrice: "Custom",
    owners: "0",
    weeklyVolume: "$0",
    adoption: "0.0%",
  },
  thumbnails = [],
}: Partial<MarketHeroProps>) {
  const defaultBg = "https://images.unsplash.com/photo-1635322966219-b75ed372eb01?q=80&w=2000&auto=format&fit=crop";
  const safeBackgroundImage = (!backgroundImage || backgroundImage.startsWith("orb:")) ? defaultBg : backgroundImage;
  const safeThumbnails = Array.isArray(thumbnails) ? thumbnails : [];

  return (
    <div className="relative w-full group">
      {/* Main Hero Card */}
      <div className="relative w-full aspect-[4/5] sm:aspect-[21/9] md:aspect-[3/1] rounded-[24px] overflow-hidden border border-border/60 shadow-2xl">
        {/* Background Image/Scene with Overlay */}
        <div className="absolute inset-0">
          {splineScene ? (
            <div className="w-full h-full">
              <Spline
                scene={splineScene}
                className="w-full h-full"
              />
            </div>
          ) : (
            <AgentAvatar
              src={safeBackgroundImage}
              name={title}
              fill
              imageClassName="object-cover opacity-90 transition-transform duration-700 group-hover:scale-110"
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 100vw"
              enableOrb={true}
              orbClassName="scale-[3] opacity-60"
              className="w-full h-full bg-background/60"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-transparent to-transparent" />
        </div>

        {/* Content Overlay */}
        <div className="absolute inset-0 p-6 md:p-12 flex flex-col justify-end md:justify-between h-full">
            {/* Top Content (Desktop only or spaced) */}
            <div className="hidden md:block" />

          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl md:text-5xl font-bold text-foreground tracking-tight">
                  {title}
                </h1>
              </div>
              <p className="text-muted-foreground text-sm font-medium">
                By <span className="text-foreground/80 hover:underline cursor-pointer">{author}</span>
              </p>
              <Link
                href={href}
                className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-primary transition hover:text-primary/80"
              >
                Open agent
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Stats Grid */}
            <div className="flex flex-wrap items-center gap-3 md:gap-8 bg-background/70 backdrop-blur-md rounded-2xl p-3 md:p-4 border border-border/60 w-fit">
              <div className="space-y-0.5">
                <p className="text-[9px] md:text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Entry Price</p>
                <p className="text-xs md:text-base font-bold text-foreground">{stats.entryPrice}</p>
              </div>
              <div className="w-[1px] h-6 md:h-8 bg-border/60" />
              <div className="space-y-0.5">
                <p className="text-[9px] md:text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Owners</p>
                <p className="text-xs md:text-base font-bold text-foreground">{stats.owners}</p>
              </div>
              <div className="w-[1px] h-6 md:h-8 bg-border/60" />
              <div className="space-y-0.5">
                <p className="text-[9px] md:text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Weekly Vol</p>
                <p className="text-xs md:text-base font-bold text-foreground">{stats.weeklyVolume}</p>
              </div>
              <div className="w-[1px] h-6 md:h-8 bg-border/60" />
              <div className="space-y-0.5">
                <p className="text-[9px] md:text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Adoption</p>
                <p className="text-xs md:text-base font-bold text-foreground">{stats.adoption}</p>
              </div>
            </div>
          </div>

          {/* Right Thumbnails */}
          <div className="hidden lg:flex items-center gap-3">
            {safeThumbnails.map((thumbnail, i) => (
              <Link
                key={`${thumbnail.href}-${i}`}
                href={thumbnail.href}
                className="w-20 h-20 rounded-xl overflow-hidden border-2 border-border/60 shadow-lg hover:border-border transition-all cursor-pointer hover:-translate-y-1"
              >
                <Image
                  src={thumbnail.src}
                  alt={thumbnail.alt}
                  width={80}
                  height={80}
                  className="object-cover h-full w-full"
                  sizes="80px"
                />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
