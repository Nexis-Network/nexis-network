import Image from "next/image";

import {
  HOBBES_HERO_INTEGRATION_LOGOS,
  type HobbesHeroIntegrationLogo,
} from "@/app/(marketing)/hobbes/content";

const FALLBACK_HOBBES_HERO_INTEGRATION_LOGOS: readonly HobbesHeroIntegrationLogo[] = [
  {
    src: "/assets/integrations/aave-logo.svg",
    hoverSrc: "/assets/integrations/aave-logo-hover.svg",
    alt: "Aave",
  },
  {
    src: "/assets/integrations/axiom-logo.svg",
    hoverSrc: "/assets/integrations/axiom-logo-hover.svg",
    alt: "Axiom",
  },
  {
    src: "/assets/integrations/uniswap-logo.svg",
    hoverSrc: "/assets/integrations/uniswap-logo-hover.svg",
    alt: "Uniswap",
  },
  {
    src: "/assets/integrations/polymarket-logo.svg",
    hoverSrc: "/assets/integrations/polymarket-logo-hover.svg",
    alt: "Polymarket",
  },
  {
    src: "/assets/integrations/coinbase-logo.svg",
    hoverSrc: "/assets/integrations/coinbase-logo-hover.svg",
    alt: "Coinbase",
  },
  {
    src: "/assets/integrations/coinbase-wallet-logo.svg",
    hoverSrc: "/assets/integrations/coinbase-wallet-logo-hover.svg",
    alt: "Coinbase Wallet",
  },
  {
    src: "/assets/integrations/binance-logo.svg",
    hoverSrc: "/assets/integrations/binance-logo-hover.svg",
    alt: "Binance",
  },
  {
    src: "/assets/integrations/bybit-logo.svg",
    hoverSrc: "/assets/integrations/bybit-logo-hover.svg",
    alt: "Bybit",
  },
  {
    src: "/assets/integrations/OKX-logo.svg",
    hoverSrc: "/assets/integrations/OKX-logo-hover.svg",
    alt: "OKX",
  },
  {
    src: "/assets/integrations/kucoin-logo.svg",
    hoverSrc: "/assets/integrations/kucoin-logo-hover.svg",
    alt: "KuCoin",
  },
];

function resolveHeroIntegrationLogos(): readonly HobbesHeroIntegrationLogo[] {
  if (Array.isArray(HOBBES_HERO_INTEGRATION_LOGOS) && HOBBES_HERO_INTEGRATION_LOGOS.length > 0) {
    return HOBBES_HERO_INTEGRATION_LOGOS;
  }

  return FALLBACK_HOBBES_HERO_INTEGRATION_LOGOS;
}

export function HobbesIntegrationsCarousel() {
  const heroLogos = resolveHeroIntegrationLogos();
  const duplicatedHeroLogos = [...heroLogos, ...heroLogos];

  return (
    <section className="mx-auto w-full max-w-[1440px] px-6 pb-8 pt-0 md:px-20">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#03040c] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#03040c] to-transparent" />

        <div className="flex min-w-max animate-ticker-scroll items-center gap-8 hover:[animation-play-state:paused] motion-reduce:animate-none md:gap-10">
          {duplicatedHeroLogos.map((logo, index) => (
            <HobbesIntegrationCarouselItem key={`${logo.alt}-${index}`} logo={logo} />
          ))}
        </div>
      </div>
    </section>
  );
}

function HobbesIntegrationCarouselItem({ logo }: { logo: HobbesHeroIntegrationLogo }) {
  return (
    <div className="group flex w-[106px] shrink-0 items-center justify-center sm:w-[118px] lg:w-[131px]">
      <div className="relative h-[26px] w-full sm:h-[29px] lg:h-8">
        <Image
          src={logo.src}
          alt={logo.alt}
          fill
          className="object-contain opacity-90 transition-opacity duration-200 group-hover:opacity-0"
          sizes="(max-width: 640px) 106px, (max-width: 1024px) 118px, 131px"
        />
        <Image
          src={logo.hoverSrc}
          alt=""
          aria-hidden="true"
          fill
          className="object-contain opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          sizes="(max-width: 640px) 106px, (max-width: 1024px) 118px, 131px"
        />
      </div>
    </div>
  );
}
