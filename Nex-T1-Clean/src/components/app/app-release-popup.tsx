"use client";

import type { ComponentType } from "react";
import { useEffect, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Blocks,
  BrainCircuit,
  ChevronRight,
  ChartNoAxesColumnIncreasing,
  type LucideIcon,
  WalletCards,
  X,
} from "lucide-react";

import { Logo } from "@/components/shared/branding/logo";
import {
  Dialog,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppReleasePopup } from "@/lib/hooks/user/use-app-release-popup";

type AppReleasePopupProps = {
  onVisibilityChange?: (visible: boolean) => void;
};

type ReleaseHighlight = {
  id: string;
  title: string;
  description: string;
  showChevron: boolean;
  dense?: boolean;
  icon: LucideIcon | ComponentType<{ className?: string; strokeWidth?: number }>;
};

const RELEASE_HIGHLIGHTS: ReleaseHighlight[] = [
  {
    id: "autonomous-trading",
    icon: WalletCards,
    showChevron: true,
    title:
      "24/7 On-chain autonomous trading capabilities with Nex Wallets",
    description:
      "Ultra users can deploy 24/7 on-chain agents to actively trade on axiom, Uniswap, Binance, ByBit, Coinbase using our most intelligent models yet.",
  },
  {
    id: "polymarket",
    icon: ChartNoAxesColumnIncreasing,
    showChevron: true,
    title: "Nex Copilot now supports Polymarket predictions",
    description:
      "Users can now automate and execute on Polymarket with the most advanced prediction market intelligence AI agent - Nex Copilot.",
  },
  {
    id: "developer-experience",
    icon: Blocks,
    showChevron: false,
    title: "Interactive developer experience",
    description:
      "You can now build, test and deploy dApps and Smart Contracts end to end within Nex-T1.",
    dense: true,
  },
  {
    id: "smarter-copilot",
    icon: BrainCircuit,
    showChevron: true,
    title: "Nex Copilot got smarter",
    description:
      "Nex Copilot now utilizes enhanced agentic memory, market intelligence, autonomous capabilities",
    dense: true,
  },
];

function ReleasePopupHero() {
  return (
    <div className="relative h-[280px] w-full overflow-hidden bg-[rgba(254,254,255,0.05)]">
      <div className="absolute inset-0 bg-[radial-gradient(88%_120%_at_100%_12%,rgba(244,160,84,0.26)_0%,transparent_42%),radial-gradient(74%_110%_at_0%_8%,rgba(90,132,201,0.16)_0%,transparent_44%),linear-gradient(180deg,#1a2129_0%,#0d0e10_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.06)_0%,rgba(0,0,0,0.26)_100%)]" />

      <div className="absolute inset-x-10 bottom-6 top-7 overflow-hidden rounded-[18px] border border-white/[0.06] bg-[#090a0d] shadow-[0_20px_64px_rgba(0,0,0,0.42)]">
        <div className="absolute inset-x-0 top-0 h-7 border-b border-white/[0.06] bg-[linear-gradient(180deg,rgba(52,59,68,0.96)_0%,rgba(30,35,41,0.96)_100%)]" />

        <div className="absolute left-4 top-[8px] flex items-center gap-2 text-[6px] uppercase tracking-[0.12em] text-white/40">
          <span className="flex size-[11px] items-center justify-center rounded-full border border-white/25">
            <span className="block size-[3px] rounded-full bg-white/80" />
          </span>
          <span>Model</span>
          <span>Tools</span>
          <span>History</span>
          <span>Agents</span>
          <span>Launches</span>
          <span>Profile</span>
        </div>

        <div className="absolute inset-x-0 bottom-0 top-7 bg-[linear-gradient(180deg,rgba(8,10,12,0.24)_0%,rgba(8,10,12,0.82)_100%)]">
          <div className="absolute inset-0 bg-[radial-gradient(58%_72%_at_50%_26%,rgba(28,34,40,0.68)_0%,rgba(8,9,11,0.98)_74%)]" />
          <div className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 opacity-25">
            <Logo width={44} height={44} className="size-11" />
          </div>

          <div className="absolute left-1/2 top-[58%] w-[160px] -translate-x-1/2 rounded-[8px] border border-[#4aa6ff]/35 bg-[linear-gradient(90deg,#01b3ff_0%,#1d5dff_100%)] px-2 py-[6px] shadow-[0_16px_36px_rgba(1,110,255,0.3)]">
            <div className="rounded-[5px] bg-black/14 px-2 py-1 text-[6px] font-medium uppercase tracking-[0.12em] text-white/70">
              AI command center · Nex-T1 Copilot
            </div>
            <div className="mt-1.5 text-[7px] leading-[1.45] text-white/92">
              Create and deploy a new autonomous prediction market agent.
            </div>
            <div className="mt-2 flex items-center justify-between text-[6px] text-white/58">
              <span className="rounded-full border border-white/15 px-1.5 py-0.5">
                Nex Market AI
              </span>
              <span>12s</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppReleasePopup({
  onVisibilityChange,
}: AppReleasePopupProps) {
  const { eligibleImpression, isReady, markDismissed, markShown, version } =
    useAppReleasePopup();

  const [isOpen, setIsOpen] = useState(false);
  const [activeImpression, setActiveImpression] = useState<1 | 2 | null>(null);
  const handledImpressionKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!eligibleImpression) {
      return;
    }

    const impressionKey = `${version}:${eligibleImpression}`;
    if (handledImpressionKeyRef.current === impressionKey) {
      return;
    }

    handledImpressionKeyRef.current = impressionKey;
    setActiveImpression(eligibleImpression);
    setIsOpen(true);
    void markShown(eligibleImpression);
  }, [eligibleImpression, markShown, version]);

  useEffect(() => {
    onVisibilityChange?.(isOpen);

    return () => {
      onVisibilityChange?.(false);
    };
  }, [isOpen, onVisibilityChange]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isOpen) {
      markDismissed(activeImpression);
    }

    setIsOpen(nextOpen);
  };

  if (!isReady) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogOverlay className="z-[140] bg-[rgba(37,37,37,0.3)] backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-[0.985] fixed left-1/2 top-1/2 z-[150] flex max-h-[calc(100vh-2rem)] w-[min(672px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[24px] bg-[#0F0F10] text-white shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_1px_-0.5px_rgba(0,0,0,0.06),0px_3px_3px_-1.5px_rgba(0,0,0,0.06),0px_6px_6px_-3px_rgba(0,0,0,0.06),0px_12px_12px_-6px_rgba(0,0,0,0.04),0px_24px_24px_-12px_rgba(0,0,0,0.04)] outline-none duration-200"
          style={{ fontFamily: "var(--font-geist-sans)" }}
        >
          <DialogTitle className="sr-only">What&apos;s new in Nex Copilot</DialogTitle>
          <DialogDescription className="sr-only">
            Release notes overlay for the latest Nex Copilot update.
          </DialogDescription>

          <button
            aria-label="Close release notes"
            className="absolute right-5 top-5 z-10 inline-flex size-4 cursor-pointer items-center justify-center rounded-[2px] text-white/70 transition-colors duration-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/25"
            onClick={() => handleOpenChange(false)}
            type="button"
          >
            <X className="size-4" strokeWidth={1.5} />
          </button>

          <ReleasePopupHero />

          <div className="px-3 pb-3 pt-6">
            <div className="px-4">
              <h3 className="text-[16.7px] font-medium leading-[26px] tracking-[-0.045px] text-white">
                What&apos;s new in Nex Copilot
              </h3>
            </div>

            <div className="mt-2 flex flex-col gap-2">
              {RELEASE_HIGHLIGHTS.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 rounded-[12px] px-4 py-4 ${
                      item.dense ? "min-h-[78px]" : "min-h-[82px]"
                    }`}
                  >
                    <div className="flex h-6 w-5 shrink-0 items-center justify-start text-[#ababab]">
                      <Icon className="size-5" strokeWidth={1.7} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-5 text-white">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-sm leading-5 text-[rgba(237,237,255,0.47)]">
                        {item.description}
                      </p>
                    </div>

                    {item.showChevron ? (
                      <div className="flex size-5 shrink-0 items-center justify-center text-white/78">
                        <ChevronRight className="size-4" strokeWidth={1.6} />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

export default AppReleasePopup;
