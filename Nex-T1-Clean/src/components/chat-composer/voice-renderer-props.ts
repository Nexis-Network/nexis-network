"use client";

import type { ReactNode } from "react";

export type ComposerVoiceRendererProps = {
  isPanelOpen: boolean;
  panel: ReactNode | null;
  badge: ReactNode | null;
  muteButton: ReactNode | null;
  toggleButton: ReactNode | null;
  voiceError: string | null;
};
