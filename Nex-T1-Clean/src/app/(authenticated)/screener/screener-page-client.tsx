"use client";

import { useState } from "react";
import { AssetsTable } from "./_components/assets-table";
import { FloatingChatInput } from "./_components/floating-chat-input";
import { ScreenerAiPanel } from "./_components/screener-ai-panel";
import { ScreenerFilters } from "./_components/screener-filters";
import { SwapWidget } from "./_components/swap-widget";
import { ScreenerProvider, useScreener } from "./_context/screener-context";
import { useScreenerChatIntents } from "./_hooks/use-screener-chat-intents";
import { useChatController } from "@/components/dashboard/chat-shell/hooks/use-chat-controller";
import { SettingsSurfaceShell } from "@/components/settings-v2/shell/settings-surface-shell";

function ScreenerContent() {
  const { selectedChain, setSelectedChain, setNarrativeFilter, setSafetyFilter } = useScreener();
  const [isSwapOpen, setIsSwapOpen] = useState(false);
  const [selectedAssetForSwap, setSelectedAssetForSwap] = useState<UntypedJson>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { messages } = useChatController();

  useScreenerChatIntents({
    messages,
    selectedChain,
    setSelectedChain,
    setNarrativeFilter,
    setSafetyFilter,
  });

  return (
    <div className="flex h-full min-h-0 w-full overflow-auto">
      <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-auto transition-all duration-300">
        <div className="flex flex-col gap-4 border-b border-border bg-card p-4 pb-4 sm:p-6">
          <div className="flex flex-col gap-2">
            <div>
              <h1 className="settings-page-title text-[2rem]">AI Screener</h1>
              <p className="settings-shell-subtitle mt-2">
                Simplify your research with AI-driven token search and analysis across all networks.
              </p>
            </div>
          </div>
          <ScreenerFilters />
        </div>

        <div className="relative flex-1 min-h-0 min-w-0 overflow-y-auto bg-background">
          <AssetsTable
            onSwap={(asset) => {
              setSelectedAssetForSwap(asset);
              setIsSwapOpen(true);
            }}
          />
        </div>

        <FloatingChatInput
          isPanelOpen={isChatOpen}
          onExpand={() => setIsChatOpen(true)}
        />
      </div>

      <ScreenerAiPanel
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />

      {isSwapOpen ? (
        <SwapWidget
          isOpen={isSwapOpen}
          onClose={() => setIsSwapOpen(false)}
          initialInputToken={selectedAssetForSwap}
        />
      ) : null}
    </div>
  );
}

export function ScreenerPageClient() {
  return (
    <ScreenerProvider>
      <SettingsSurfaceShell
        width="wide"
        className="min-h-0"
        canvasClassName="overflow-y-auto"
        stackClassName="h-full !max-w-none !px-0 !pt-0"
        includeFooterSpacer={false}
      >
        <ScreenerContent />
      </SettingsSurfaceShell>
    </ScreenerProvider>
  );
}
