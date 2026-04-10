"use client";

import dynamic from "next/dynamic";
import { MotionConfig } from "motion/react";
import type { ReactNode, RefObject } from "react";

import { ComposerDialogs } from "@/components/chat-composer/composer-dialogs";
import { ComposerOverlays } from "@/components/chat-composer/composer-overlays";
import type { CommandInventoryFilter } from "@/components/chat-composer/command-inventory";
import type {
  CommandPaletteItem,
  ComposerDraftState,
  ComposerPendingModelWarning,
} from "@/components/chat-composer/types";
import type { TokenMentionSearchResult } from "@/components/chat-composer/token-mentions";
import type { ComposerVoiceRendererProps } from "@/components/chat-composer/voice-renderer-props";
import type { AuthView } from "@/components/chat-composer/auth-required-dialog";

const VoiceModule = dynamic(
  () => import("./voice/voice-module").then((mod) => mod.VoiceModule),
  {
    ssr: false,
    loading: () => (
      <div className="relative mx-auto h-[84px] w-full max-w-full rounded-[22px] border border-dashed border-border/40 bg-muted/10" />
    ),
  },
);

type ComposerRuntimeShellProps = {
  authDialogOpen: boolean;
  commandFilters: CommandInventoryFilter[];
  commandInputRef: RefObject<HTMLInputElement | null>;
  commandItems: CommandPaletteItem[];
  commandOpen: boolean;
  commandQuery: string;
  compactSuggestions?: boolean;
  containerClassName: string;
  draftState: ComposerDraftState;
  onAuthNavigation: (view: AuthView) => void;
  onCommandClose: () => void;
  onModelWarningCancel: () => void;
  onModelWarningConfirm: () => void;
  onPromptClick: (prompt: string) => void;
  onTokenSearchClose: () => void;
  onTokenSelect: (token: TokenMentionSearchResult) => void;
  pendingModelWarning: ComposerPendingModelWarning | null;
  renderSurface: (voiceUi?: ComposerVoiceRendererProps) => ReactNode;
  showSuggestions: boolean;
  tokenSearchInputRef: RefObject<HTMLInputElement | null>;
  voiceAgentId?: string;
};

export function ComposerRuntimeShell({
  authDialogOpen,
  commandFilters,
  commandInputRef,
  commandItems,
  commandOpen,
  commandQuery,
  compactSuggestions = false,
  containerClassName,
  draftState,
  onAuthNavigation,
  onCommandClose,
  onModelWarningCancel,
  onModelWarningConfirm,
  onPromptClick,
  onTokenSearchClose,
  onTokenSelect,
  pendingModelWarning,
  renderSurface,
  showSuggestions,
  tokenSearchInputRef,
  voiceAgentId,
}: ComposerRuntimeShellProps) {
  return (
    <MotionConfig
      transition={{
        type: "spring",
        stiffness: 320,
        damping: 32,
      }}
    >
      <div className={containerClassName}>
        <ComposerOverlays
          commandFilters={commandFilters}
          commandInputRef={commandInputRef}
          commandItems={commandItems}
          commandOpen={commandOpen}
          commandQuery={commandQuery}
          compactSuggestions={compactSuggestions}
          draftState={draftState}
          onCommandClose={onCommandClose}
          onPromptClick={onPromptClick}
          onTokenSearchClose={onTokenSearchClose}
          onTokenSelect={onTokenSelect}
          showSuggestions={showSuggestions}
          tokenSearchInputRef={tokenSearchInputRef}
        />

        {voiceAgentId ? (
          <VoiceModule voiceAgentId={voiceAgentId}>
            {(voiceUi: ComposerVoiceRendererProps) => renderSurface(voiceUi)}
          </VoiceModule>
        ) : (
          renderSurface()
        )}

        <ComposerDialogs
          authDialogOpen={authDialogOpen}
          onAuthNavigation={onAuthNavigation}
          onAuthOpenChange={draftState.setAuthDialogOpen}
          onModelWarningCancel={onModelWarningCancel}
          onModelWarningConfirm={onModelWarningConfirm}
          pendingModelWarning={pendingModelWarning}
        />
      </div>
    </MotionConfig>
  );
}
