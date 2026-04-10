import { Metadata } from "next";
import { ScreenerRoot } from "@/components/screener/screener-root";


export const metadata: Metadata = {
  title: "Nexis AI Crypto Screener | Real-Time DeFi & Memecoin Scanner",
  description: "The world's most intelligent AI crypto screener. Find 100x memecoins, analyze DeFi volume in real-time, and detect rugs on Solana, Base, and Ethereum before they happen.",
  keywords: ["AI Crypto Screener", "Memecoin Scanner", "DeFi Analytics", "Solana Gem Finder", "Base Token Sniffer", "Real-time Crypto Data", "Nexis AI"],
  openGraph: {
    title: "Nexis AI Crypto Screener | Find the Next 100x",
    description: "Multi-chain AI intelligence for professional traders. Scan Solana, Base, and ETH in real-time.",
    type: "website",
  }
};

export default function ScreenerPage() {
  return <ScreenerRoot />;
}
