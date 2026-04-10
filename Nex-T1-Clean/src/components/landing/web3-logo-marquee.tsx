"use client";

import type { CSSProperties, ComponentType } from "react";
import {
  NetworkEthereum,
  NetworkSolana,
  NetworkPolygon,
  NetworkArbitrumOne,
  NetworkBase,
  NetworkOptimism,
  NetworkAvalanche,
  NetworkBinanceSmartChain,
} from "@web3icons/react";

import { InfiniteSlider } from "@/components/motion-primitives/infinite-slider";
import { ProgressiveBlur } from "@/components/motion-primitives/progressive-blur";

type LogoItem = {
  name: string;
  color: string;
  Icon: ComponentType<UntypedJson>;
};

const logos: LogoItem[] = [
  { name: "Ethereum", color: "#627EEA", Icon: NetworkEthereum },
  { name: "Solana", color: "#14F195", Icon: NetworkSolana },
  { name: "Polygon", color: "#8247E5", Icon: NetworkPolygon },
  { name: "Arbitrum", color: "#28A0F0", Icon: NetworkArbitrumOne },
  { name: "Base", color: "#0052FF", Icon: NetworkBase },
  { name: "Optimism", color: "#FF0420", Icon: NetworkOptimism },
  { name: "Avalanche", color: "#E84142", Icon: NetworkAvalanche },
  { name: "BNB Chain", color: "#F3BA2F", Icon: NetworkBinanceSmartChain },
];

export function Web3LogoMarquee() {
  return (
    <section className="overflow-hidden bg-transparent pt-10 md:pt-12">
      <div className="group relative m-auto w-full px-6">
        <div className="flex flex-col items-center md:flex-row">
          <div className="md:max-w-44 md:border-r md:border-white/10 md:pr-6">
            <p className="text-end text-sm text-[#c4c4c4]/70">
              Powering the best teams
            </p>
          </div>
          <div className="relative py-2 md:w-[calc(100%-11rem)]">
            <InfiniteSlider speedOnHover={20} speed={40} gap={72}>
              {logos.map((logo) => (
                <div key={logo.name} className="flex w-44 justify-center">
                  <LogoPill logo={logo} />
                </div>
              ))}
            </InfiniteSlider>

            <div className="bg-linear-to-r from-[#000] absolute inset-y-0 left-0 w-20" />
            <div className="bg-linear-to-l from-[#000] absolute inset-y-0 right-0 w-20" />
            <ProgressiveBlur
              className="pointer-events-none absolute left-0 top-0 h-full w-20"
              direction="left"
              blurIntensity={1}
            />
            <ProgressiveBlur
              className="pointer-events-none absolute right-0 top-0 h-full w-20"
              direction="right"
              blurIntensity={1}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function LogoPill({ logo }: { logo: LogoItem }) {
  const Icon = logo.Icon;
  return (
    <div
      className="group flex items-center gap-3 px-2 py-1 text-xs uppercase tracking-[0.14em] text-[#c4c4c4] transition-colors duration-200"
      style={
        {
          "--logo-color": logo.color,
        } as CSSProperties
      }
    >
      <span className="relative h-6 w-6">
        <Icon
          variant="mono"
          size={24}
          color="#c4c4c4"
          className="absolute inset-0 text-[#c4c4c4] opacity-100 transition-opacity duration-200 group-hover:opacity-0"
        />
        <Icon
          variant="branded"
          size={24}
          className="absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        />
      </span>
      <span className="transition-colors duration-200 group-hover:text-[color:var(--logo-color)]">
        {logo.name}
      </span>
    </div>
  );
}
