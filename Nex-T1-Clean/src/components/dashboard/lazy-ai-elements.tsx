"use client";

import dynamic from "next/dynamic";

import { withChunkRetry } from "@/components/dashboard/chunk-load-retry";
import type { SearchResultsProps } from "@/components/search/search-results";

const inlineCitationModule = withChunkRetry(() => import("@/components/ai-elements/inline-citation"));
const conversationModule = withChunkRetry(() => import("@/components/ai-elements/conversation"));
const loaderModule = withChunkRetry(() => import("@/components/ai-elements/loader"));
const messageModule = withChunkRetry(() => import("@/components/ai-elements/message"));
const responseModule = withChunkRetry(() => import("@/components/ai-elements/response"));
const codeBlockModule = withChunkRetry(() => import("@/components/ai-elements/code-block"));
const webPreviewModule = withChunkRetry(() => import("@/components/ai-elements/web-preview"));
const searchResultsModule = withChunkRetry(() => import("@/components/search/search-results"));
const connectionModule = withChunkRetry(() => import("@/components/ai-elements/connection"));
const canvasModule = withChunkRetry(() => import("@/components/ai-elements/canvas"));
const confirmationModule = withChunkRetry(() => import("@/components/ai-elements/confirmation"));

const listFallback = (
  <div className="space-y-2">
    <div className="h-3 w-3/4 animate-pulse rounded bg-muted/40" />
    <div className="h-3 w-2/3 animate-pulse rounded bg-muted/40" />
    <div className="h-3 w-1/2 animate-pulse rounded bg-muted/40" />
  </div>
);

export const InlineCitation = dynamic(
  () =>
    inlineCitationModule().then((mod) => ({
      default: mod.InlineCitation,
    })),
  { ssr: false },
);

export const InlineCitationCard = dynamic(
  () =>
    inlineCitationModule().then((mod) => ({
      default: mod.InlineCitationCard,
    })),
  { ssr: false },
);

export const InlineCitationCardBody = dynamic(
  () =>
    inlineCitationModule().then((mod) => ({
      default: mod.InlineCitationCardBody,
    })),
  { ssr: false },
);

export const InlineCitationCardTrigger = dynamic(
  () =>
    inlineCitationModule().then((mod) => ({
      default: mod.InlineCitationCardTrigger,
    })),
  { ssr: false },
);

export const InlineCitationCarousel = dynamic(
  () =>
    inlineCitationModule().then((mod) => ({
      default: mod.InlineCitationCarousel,
    })),
  { ssr: false },
);

export const InlineCitationCarouselContent = dynamic(
  () =>
    inlineCitationModule().then((mod) => ({
      default: mod.InlineCitationCarouselContent,
    })),
  { ssr: false },
);

export const InlineCitationCarouselHeader = dynamic(
  () =>
    inlineCitationModule().then((mod) => ({
      default: mod.InlineCitationCarouselHeader,
    })),
  { ssr: false },
);

export const InlineCitationCarouselIndex = dynamic(
  () =>
    inlineCitationModule().then((mod) => ({
      default: mod.InlineCitationCarouselIndex,
    })),
  { ssr: false },
);

export const InlineCitationCarouselItem = dynamic(
  () =>
    inlineCitationModule().then((mod) => ({
      default: mod.InlineCitationCarouselItem,
    })),
  { ssr: false },
);

export const InlineCitationCarouselNext = dynamic(
  () =>
    inlineCitationModule().then((mod) => ({
      default: mod.InlineCitationCarouselNext,
    })),
  { ssr: false },
);

export const InlineCitationCarouselPrev = dynamic(
  () =>
    inlineCitationModule().then((mod) => ({
      default: mod.InlineCitationCarouselPrev,
    })),
  { ssr: false },
);

export const InlineCitationSource = dynamic(
  () =>
    inlineCitationModule().then((mod) => ({
      default: mod.InlineCitationSource,
    })),
  { ssr: false },
);

export const InlineCitationText = dynamic(
  () =>
    inlineCitationModule().then((mod) => ({
      default: mod.InlineCitationText,
    })),
  { ssr: false },
);

export const Conversation = dynamic(
  () =>
    conversationModule().then((mod) => ({
      default: mod.default ?? mod.Conversation,
    })),
  { ssr: false },
);

export const ConversationContent = dynamic(
  () =>
    conversationModule().then((mod) => ({
      default: mod.ConversationContent,
    })),
  { ssr: false },
);

export const ConversationEmptyState = dynamic(
  () =>
    conversationModule().then((mod) => ({
      default: mod.ConversationEmptyState,
    })),
  { ssr: false },
);

export const ConversationScrollButton = dynamic(
  () =>
    conversationModule().then((mod) => ({
      default: mod.ConversationScrollButton,
    })),
  { ssr: false },
);

export const ConversationAutoScroll = dynamic(
  () =>
    conversationModule().then((mod) => ({
      default: mod.ConversationAutoScroll,
    })),
  { ssr: false },
);

export const Loader = dynamic(
  () =>
    loaderModule().then((mod) => ({
      default: mod.Loader,
    })),
  { ssr: false },
);

export const Message = dynamic(
  () =>
    messageModule().then((mod) => ({
      default: mod.Message,
    })),
  { ssr: false },
);

export const MessageAvatar = dynamic(
  () =>
    messageModule().then((mod) => ({
      default: mod.MessageAvatar,
    })),
  { ssr: false },
);

export const MessageContent = dynamic(
  () =>
    messageModule().then((mod) => ({
      default: mod.MessageContent,
    })),
  { ssr: false },
);

export const AIResponse = dynamic(
  () =>
    responseModule().then((mod) => ({
      default: mod.Response,
    })),
  { ssr: false },
);

export const CodeBlock = dynamic(
  () =>
    codeBlockModule().then((mod) => ({
      default: mod.CodeBlock,
    })),
  { ssr: false },
);

export const CodeBlockCopyButton = dynamic(
  () =>
    codeBlockModule().then((mod) => ({
      default: mod.CodeBlockCopyButton,
    })),
  { ssr: false },
);

export const WebPreview = dynamic(
  () =>
    webPreviewModule().then((mod) => ({
      default: mod.WebPreview,
    })),
  { ssr: false },
);

export const WebPreviewBody = dynamic(
  () =>
    webPreviewModule().then((mod) => ({
      default: mod.WebPreviewBody,
    })),
  { ssr: false },
);

export const WebPreviewNavigation = dynamic(
  () =>
    webPreviewModule().then((mod) => ({
      default: mod.WebPreviewNavigation,
    })),
  { ssr: false },
);

export const WebPreviewNavigationButton = dynamic(
  () =>
    webPreviewModule().then((mod) => ({
      default: mod.WebPreviewNavigationButton,
    })),
  { ssr: false },
);

export const WebPreviewUrl = dynamic(
  () =>
    webPreviewModule().then((mod) => ({
      default: mod.WebPreviewUrl,
    })),
  { ssr: false },
);

export const Connection = dynamic(
  () =>
    connectionModule().then((mod) => ({
      default: mod.Connection,
    })),
  { ssr: false },
);

export const Canvas = dynamic(
  () =>
    canvasModule().then((mod) => ({
      default: mod.Canvas,
    })),
  { ssr: false },
);

export const Confirmation = dynamic(
  () =>
    confirmationModule().then((mod) => ({
      default: mod.Confirmation,
    })),
  { ssr: false },
);

export const SearchResults = dynamic<SearchResultsProps>(
  () =>
    searchResultsModule().then((mod) => ({
      default: mod.SearchResults,
    })),
  {
    ssr: false,
    loading: () => listFallback,
  },
);
