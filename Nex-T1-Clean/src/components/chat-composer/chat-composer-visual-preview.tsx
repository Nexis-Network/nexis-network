"use client";

import { useRef } from "react";
import { AudioLines } from "@/components/animate-ui/icons/audio-lines";

import { ActionMenuTrigger } from "@/components/chat-composer/composer-action-menu/action-menu-sections";
import { ComposerInputArea } from "@/components/chat-composer/composer-input-area";
import { MODELS } from "@/components/chat-composer/constants";
import { DefaultComposerFrame } from "@/components/chat-composer/default-composer-frame";
import { resolveDefaultComposerLayout } from "@/components/chat-composer/default-composer-layout";
import { DefaultComposerPlaceholder } from "@/components/chat-composer/default-composer-placeholder";
import { UpgradeBanner } from "@/components/chat-composer/upgrade-banner";
import {
  COMPOSER_FONT_CLASS,
  COMPOSER_ICON_BUTTON_CLASS,
  COMPOSER_ICON_CLASS,
  COMPOSER_INNER_SURFACE_CLASS,
} from "@/components/chat-composer/composer-theme";
import { normalizeAppTheme, type AppTheme } from "@/lib/theme/app-theme";
import { cn } from "@/lib/utils";

const PREVIEW_MODEL =
  MODELS.find((model) => model.value !== "nex-t1-free") ?? MODELS[0];

export function ChatComposerVisualPreview({ theme }: { theme: AppTheme }) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const {
    composerCardMinHeightClass,
    composerCardRadiusClass,
    composerInnerGapClass,
    composerInnerMinHeightClass,
    composerInnerPaddingClass,
    composerInputMinHeightClass,
    composerWidthClass,
    isComposerGradientActive,
    useNexInstantSurface,
  } = resolveDefaultComposerLayout({
    selectedModelValue: PREVIEW_MODEL.value,
    showStarsOverlay: true,
  });

  return (
    <main
      className="auth-theme-root flex min-h-screen w-full justify-center bg-transparent px-6 py-10 md:px-10"
      data-auth-theme={normalizeAppTheme(theme)}
    >
      <div className={COMPOSER_FONT_CLASS}>
        <DefaultComposerFrame
          composerCardMinHeightClass={composerCardMinHeightClass}
          composerCardRadiusClass={composerCardRadiusClass}
          composerWidthClass={composerWidthClass}
          useNexInstantSurface={useNexInstantSurface}
        >
          <UpgradeBanner
            isActive={isComposerGradientActive}
            messages={[]}
            modelValue={PREVIEW_MODEL.value}
            size="default"
            status="ready"
            variant={useNexInstantSurface ? "instant-muted" : "default"}
          />

          <div
            className={cn(
              COMPOSER_INNER_SURFACE_CLASS,
              composerInnerMinHeightClass,
              composerInnerPaddingClass,
              composerInnerGapClass,
            )}
          >
            <div className={cn("relative w-full", composerInputMinHeightClass)}>
              <ComposerInputArea
                ariaLabel="Message prompt"
                ref={inputRef}
                value=""
                onChange={() => {}}
                onSubmit={() => {}}
                isCommandOpen={false}
                onCommandClose={() => {}}
                onSlashCommand={() => {}}
                isTokenSearchOpen={false}
                onTokenSearchClose={() => {}}
                onTokenSearch={() => {}}
                placeholderSlot={
                  <DefaultComposerPlaceholder
                    useNexInstantSurface={useNexInstantSurface}
                  />
                }
                disabled={false}
                className="pl-[var(--auth-composer-input-padding-leading)]"
              />
            </div>

            <div className="flex h-[var(--auth-composer-footer-height)] w-full items-end justify-between gap-4 px-[var(--auth-composer-footer-padding-x)]">
              <ActionMenuTrigger className={COMPOSER_ICON_BUTTON_CLASS} />

              <div className="ml-auto flex items-center gap-[var(--auth-composer-footer-gap)]">
                <div className={COMPOSER_ICON_BUTTON_CLASS}>
                  <AudioLines className={COMPOSER_ICON_CLASS} />
                </div>
              </div>
            </div>
          </div>
        </DefaultComposerFrame>
      </div>
    </main>
  );
}
