"use client";

import dynamic from "next/dynamic";

import { withChunkRetry } from "@/components/dashboard/chunk-load-retry";

const conversationHistoryOverlayModule = withChunkRetry(
  () => import("@/components/chat/sidebar/conversation-history-overlay"),
);
const tasksSidebarOverlayModule = withChunkRetry(
  () => import("@/components/sidebar/tasks/tasks-sidebar-overlay"),
);
const walletsSidebarFlyoutModule = withChunkRetry(
  () => import("@/components/sidebar/wallets/wallets-sidebar-flyout"),
);

export const ConversationHistoryOverlayLazy = dynamic(
  () =>
    conversationHistoryOverlayModule().then((m) => ({
      default: m.ConversationHistoryOverlay,
    })),
  { ssr: false },
);

export const TasksSidebarOverlayLazy = dynamic(
  () =>
    tasksSidebarOverlayModule().then((m) => ({
      default: m.TasksSidebarOverlay,
    })),
  { ssr: false },
);

export const WalletsSidebarFlyoutLazy = dynamic(
  () =>
    walletsSidebarFlyoutModule().then((m) => ({
      default: m.WalletsSidebarFlyout,
    })),
  { ssr: false },
);
