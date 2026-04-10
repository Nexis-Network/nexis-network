"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";

gsap.registerPlugin(ScrollTrigger);

const chains = [
    { name: "Ethereum", logo: "https://cryptologos.cc/logos/ethereum-eth-logo.png?v=026" },
    { name: "Arbitrum", logo: "https://cryptologos.cc/logos/arbitrum-arb-logo.png?v=026" },
    { name: "Optimism", logo: "https://cryptologos.cc/logos/optimism-ethereum-op-logo.png?v=026" },
    { name: "Polygon", logo: "https://cryptologos.cc/logos/polygon-matic-logo.png?v=026" },
    { name: "Base", logo: "https://raw.githubusercontent.com/base-org/brand-kit/master/logo/symbol/Base_Symbol_Blue.png" },
    { name: "Avalanche", logo: "https://cryptologos.cc/logos/avalanche-avax-logo.png?v=026" },
    { name: "BNB Chain", logo: "https://cryptologos.cc/logos/bnb-bnb-logo.png?v=026" },
    { name: "Solana", logo: "https://cryptologos.cc/logos/solana-sol-logo.png?v=026" },
    { name: "Gnosis", logo: "https://cryptologos.cc/logos/gnosis-gno-logo.png?v=026" },
    { name: "Fantom", logo: "https://cryptologos.cc/logos/fantom-ftm-logo.png?v=026" },
    { name: "Celo", logo: "https://cryptologos.cc/logos/celo-celo-logo.png?v=026" },
    { name: "Moonbeam", logo: "https://cryptologos.cc/logos/moonbeam-glmr-logo.png?v=026" }
];

export function Ecosystem() {
    const containerRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo(
                ".chain-logo",
                { scale: 0, opacity: 0 },
                {
                    scale: 1,
                    opacity: 1,
                    duration: 0.8,
                    stagger: {
                        amount: 1,
                        grid: "auto",
                        from: "center"
                    },
                    ease: "back.out(1.7)",
                    scrollTrigger: {
                        trigger: gridRef.current,
                        start: "top 80%",
                    }
                }
            );
        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <section ref={containerRef} className="relative w-full min-h-screen flex flex-col items-center justify-center bg-[#050505] py-24 overflow-hidden">
            <div className="container relative z-10 px-6 text-center">
                <h2 className="text-5xl md:text-7xl font-bold text-white mb-16 tracking-tighter">
                    Connected to <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">
                        Everything
                    </span>
                </h2>

                <div ref={gridRef} className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8 md:gap-12 max-w-5xl mx-auto">
                    {chains.map((chain, i) => (
                        <div
                            key={i}
                            className="chain-logo flex flex-col items-center gap-4 group"
                        >
                            <div className="relative w-20 h-20 md:w-24 md:h-24 flex items-center justify-center bg-white/5 rounded-full border border-white/10 group-hover:border-white/30 group-hover:bg-white/10 transition-all duration-300">
                                <Image
                                    src={chain.logo}
                                    alt={chain.name}
                                    width={48}
                                    height={48}
                                    className="object-contain w-12 h-12 md:w-14 md:h-14 group-hover:scale-110 transition-transform duration-300"
                                    unoptimized
                                />
                            </div>
                            <span className="text-gray-500 font-mono text-sm uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                {chain.name}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
