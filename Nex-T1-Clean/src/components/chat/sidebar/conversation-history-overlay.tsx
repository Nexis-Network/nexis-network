"use client";

/**
 * Conversation History Drawer
 * Pop-out drawer with search and date-categorized chat history
 */

import {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ElementType,
} from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, MessageSquare, Trash2, Plus, X } from "lucide-react";


import {
  deleteConversation,
  listConversations,
  searchConversations,
} from "@/modules/chat/persistence/supabase-store";
import { NexAgentAvatar } from "@/components/agents/agent-avatar";
import { trackAgentEvent } from "@/modules/analytics/events";
import { truncateConversationTitle } from "@/lib/agents/agent-avatar";
import { resolveModelLabel } from "@/lib/ai/nex-models";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";


import { logger } from '@/lib/logger';
type Conversation = {
  id: string;
  title: string;
  model: string | null;
  created_at: string;
  updated_at: string;
};

type ConversationHistoryOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
};

type ConversationPage = {
  conversations: Conversation[];
  hasMore: boolean;
  nextOffset: number | null;
};

const SEARCH_DEBOUNCE_MS = 200;
const PAGE_SIZE = 20;
const REQUEST_TIMEOUT_MS = 5000;

function categorizeByDate(conversations: Conversation[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);
  const lastMonth = new Date(today);
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  const categories = {
    today: [] as Conversation[],
    yesterday: [] as Conversation[],
    lastWeek: [] as Conversation[],
    lastMonth: [] as Conversation[],
    older: [] as Conversation[],
  };

  conversations.forEach((conv) => {
    const date = new Date(conv.updated_at);
    if (date >= today) {
      categories.today.push(conv);
    } else if (date >= yesterday) {
      categories.yesterday.push(conv);
    } else if (date >= lastWeek) {
      categories.lastWeek.push(conv);
    } else if (date >= lastMonth) {
      categories.lastMonth.push(conv);
    } else {
      categories.older.push(conv);
    }
  });

  return categories;
}

function mapConversationSummary(item: UntypedJson): Conversation {
  return {
    id: String(item?.id ?? ""),
    title: String(item?.title ?? "Untitled conversation"),
    model: item?.model ?? null,
    created_at: String(item?.createdAt ?? item?.created_at ?? new Date().toISOString()),
    updated_at: String(
      item?.updatedAt ??
      item?.updated_at ??
      item?.createdAt ??
      item?.created_at ??
      new Date().toISOString(),
    ),
  };
}

function mergeConversationPages(
  existing: Conversation[],
  incoming: Conversation[],
): Conversation[] {
  if (existing.length === 0) {
    return incoming;
  }

  const seenConversationIds = new Set(existing.map((conversation) => conversation.id));
  const mergedConversations = [...existing];

  incoming.forEach((conversation) => {
    if (!seenConversationIds.has(conversation.id)) {
      seenConversationIds.add(conversation.id);
      mergedConversations.push(conversation);
    }
  });

  return mergedConversations;
}

export const ConversationHistoryOverlay = memo(function ConversationHistoryOverlay({
  isOpen,
  onClose,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
}: ConversationHistoryOverlayProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const { isMobile } = useSidebar();
  const conversationsRef = useRef<Conversation[]>([]);
  const latestRequestRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const fetchFallbackConversations = useCallback(
    async (query: string | undefined, offset: number, limit: number): Promise<ConversationPage> => {
      const search = query?.trim();
      const items = search
        ? await searchConversations(search, limit + 1, offset)
        : await listConversations(limit + 1, offset);
      const normalizedConversations = items
        .slice(0, limit)
        .map((item) => mapConversationSummary(item as UntypedJson));
      const moreAvailable = items.length > limit;

      return {
        conversations: normalizedConversations,
        hasMore: moreAvailable,
        nextOffset: moreAvailable ? offset + normalizedConversations.length : null,
      };
    },
    [],
  );

  const fetchConversations = useCallback(
    async ({
      query,
      offset,
      limit,
      signal,
    }: {
      query?: string;
      offset: number;
      limit: number;
      signal: AbortSignal;
    }): Promise<ConversationPage> => {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });

      if (query && query.trim()) {
        params.set("search", query.trim());
      }

      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = supabase
          ? await supabase.auth.getSession()
          : { data: { session: null } };
        const accessToken = data.session?.access_token ?? null;
        const headers = new Headers({ Accept: "application/json" });

        if (accessToken) {
          headers.set("Authorization", `Bearer ${accessToken}`);
        }

        const response = await fetch(`/api/conversations/summaries?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
          credentials: "include",
          headers,
          signal,
        });

        if (!response.ok) {
          return await fetchFallbackConversations(query, offset, limit);
        }

        const payload = await response.json();
        const items = Array.isArray(payload?.conversations) ? payload.conversations : null;

        if (!items) {
          return await fetchFallbackConversations(query, offset, limit);
        }

        const normalizedConversations = items.map((item: UntypedJson) => mapConversationSummary(item));
        const moreAvailable =
          typeof payload?.hasMore === "boolean"
            ? payload.hasMore
            : normalizedConversations.length === limit;
        const resolvedNextOffset =
          typeof payload?.nextOffset === "number"
            ? payload.nextOffset
            : moreAvailable
              ? offset + normalizedConversations.length
              : null;

        return {
          conversations: normalizedConversations,
          hasMore: moreAvailable,
          nextOffset: moreAvailable ? resolvedNextOffset : null,
        };
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw error;
        }
        return await fetchFallbackConversations(query, offset, limit);
      }
    },
    [fetchFallbackConversations],
  );

  const applyConversationPage = useCallback(
    (page: ConversationPage, mode: "replace" | "append") => {
      startTransition(() => {
        setConversations((previousConversations) =>
          mode === "append"
            ? mergeConversationPages(previousConversations, page.conversations)
            : page.conversations,
        );
        setHasMore(page.hasMore);
        setNextOffset(page.nextOffset);
      });
    },
    [],
  );

  const loadConversations = useCallback(
    async ({
      query,
      offset,
      mode,
    }: {
      query: string;
      offset: number;
      mode: "replace" | "append";
    }) => {
      const requestId = latestRequestRef.current + 1;
      latestRequestRef.current = requestId;

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      if (mode === "append") {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      try {
        const page = await fetchConversations({
          query,
          offset,
          limit: PAGE_SIZE,
          signal: controller.signal,
        });

        if (latestRequestRef.current !== requestId) {
          return;
        }

        applyConversationPage(page, mode);
      } catch (error) {
        if (latestRequestRef.current !== requestId) {
          return;
        }

        if (!(error instanceof Error && error.name === "AbortError")) {
          logger.error("conversation_history_search_failed", error);

          if (mode === "replace" && conversationsRef.current.length === 0) {
            startTransition(() => {
              setConversations([]);
              setHasMore(false);
              setNextOffset(null);
            });
          }
        }
      } finally {
        window.clearTimeout(timeoutId);

        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }

        if (latestRequestRef.current === requestId) {
          if (mode === "append") {
            setIsLoadingMore(false);
          } else {
            setIsLoading(false);
          }
        }
      }
    },
    [applyConversationPage, fetchConversations],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      await loadConversations({
        query: searchQuery.trim(),
        offset: 0,
        mode: "replace",
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen, loadConversations, searchQuery]);

  useEffect(() => {
    if (isOpen) {
      return;
    }

    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
    setIsLoadingMore(false);
  }, [isOpen]);

  const handleDelete = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setDeleteTarget(id);
  };

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const id = deleteTarget;
    setDeleteTarget(null);

    const success = await deleteConversation(id);
    if (success) {
      setConversations((prev) => prev.filter((conv) => conv.id !== id));
      if (currentConversationId === id) {
        onNewConversation();
      }
      trackAgentEvent("conversation_deleted", { conversationId: id });
    }
  }, [deleteTarget, currentConversationId, onNewConversation]);

  const handleSelectConversation = (conversation: Conversation) => {
    void (async () => {
      await onSelectConversation(conversation.id);
      trackAgentEvent("conversation_selected", {
        conversationId: conversation.id,
        model: conversation.model,
      });
      onClose();
    })();
  };

  const categorized = useMemo(
    () => categorizeByDate(conversations),
    [conversations],
  );
  const conversationSections = useMemo(
    () =>
      [
        { key: "today", title: "Today", items: categorized.today },
        { key: "yesterday", title: "Yesterday", items: categorized.yesterday },
        { key: "lastWeek", title: "Last 7 Days", items: categorized.lastWeek },
        { key: "lastMonth", title: "Last 30 Days", items: categorized.lastMonth },
        { key: "older", title: "Older", items: categorized.older },
      ].filter((section) => section.items.length > 0),
    [categorized],
  );
  const panelBaseClassName = cn(
    "rounded-lg border border-border p-0 text-muted-foreground outline-none",
  );
  const panelMobileClassName = cn(
    panelBaseClassName,
    "z-[120] h-[100dvh] w-full max-w-full rounded-none border-0 sm:m-[8px] sm:h-[calc(100vh-16px)] sm:w-[calc(100vw-16px)] sm:max-w-md sm:rounded-lg sm:border sm:border-border",
  );
  // panelDesktopClassName removed as it was unused and replaced by inline styles for static layout
  const panelStyle = undefined;
  const isInitialLoading = isLoading && conversations.length === 0;

  const renderPanelBody = (variant: "sheet" | "panel") => {
    const HeaderWrapper: ElementType = variant === "sheet" ? SheetHeader : "div";
    const TitleComponent: ElementType = variant === "sheet" ? SheetTitle : "h2";

    return (
      <div className="flex h-full flex-col">
        <HeaderWrapper className="border-b border-border px-4 pb-2 pt-7 sm:px-5 dark:border-white/15">
          <div className="flex items-center justify-between gap-2 pt-6">
            <TitleComponent className="text-sm font-normal uppercase tracking-wide text-muted-foreground/80">
              Chat History
            </TitleComponent>
            {variant === "sheet" ? (
              <SheetDescription className="sr-only">
                Search, revisit, and delete past chat conversations.
              </SheetDescription>
            ) : null}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 gap-1.5 rounded-full border border-border bg-muted text-[11px] font-regular uppercase tracking-wide text-muted-foreground transition hover:border-primary/30 hover:bg-primary/10 hover:text-foreground dark:border-transparent dark:bg-white/5 dark:hover:border-white/15 dark:hover:bg-white/10"
                onClick={() => {
                  onNewConversation();
                  onClose();
                }}
              >
                <Plus className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Close chat history"
                className="size-8 rounded-full border border-border bg-muted text-muted-foreground transition hover:border-primary/30 hover:bg-primary/10 hover:text-foreground dark:border-transparent dark:bg-white/5 dark:hover:border-white/10 dark:hover:bg-white/10"
                onClick={onClose}
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 rounded-none border-transparent bg-transparent pl-9 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:ring-0 dark:border-transparent dark:bg-transparent dark:text-foreground"
            />
          </div>
        </HeaderWrapper>

        {/* Conversation List */}
        <ScrollArea className="h-[calc(100vh-128px)]">
          {isInitialLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="size-6 animate-spin rounded-full border-2 border-border border-t-transparent" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <MessageSquare className="mb-2 size-8 text-muted-foreground" />
              <p className="text-xs text-muted-foreground/80">
                {searchQuery.trim() ? "No conversations found" : "No conversations yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-6 px-4 py-5 sm:px-5">
              {conversationSections.map((section) => (
                <div key={section.key} className="space-y-2">
                  <h3 className="px-2 text-[11px] font-regular uppercase tracking-[0.22em] text-muted-foreground/70">
                    {section.title}
                  </h3>
                  {section.items.map((conv) => (
                    <ConversationItem
                      key={conv.id}
                      conversation={conv}
                      isActive={currentConversationId === conv.id}
                      onSelect={() => handleSelectConversation(conv)}
                      onDelete={(e) => handleDelete(conv.id, e)}
                    />
                  ))}
                </div>
              ))}
              {hasMore ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 w-full rounded-[10px] border border-border bg-transparent text-xs font-medium text-muted-foreground transition hover:border-primary/30 hover:bg-primary/10 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:hover:border-white/15 dark:hover:bg-white/10"
                  disabled={isLoading || isLoadingMore || nextOffset === null}
                  onClick={() => {
                    if (nextOffset === null) {
                      return;
                    }

                    void loadConversations({
                      query: searchQuery.trim(),
                      offset: nextOffset,
                      mode: "append",
                    });
                  }}
                >
                  {isLoadingMore ? "Loading..." : "View more"}
                </Button>
              ) : null}
            </div>
          )}
        </ScrollArea>
      </div>
    );
  };

  const deleteConfirmDialog = (
    <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
          <AlertDialogDescription>
            This conversation will be permanently deleted. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (isMobile) {
    return (
      <>
        <Sheet open={isOpen} onOpenChange={(open) => (!open ? onClose() : undefined)}>
          <SheetContent
            side="left"
            className={cn(
              panelMobileClassName,
              "overflow-hidden sm:h-auto sm:max-h-none",
            )}
            style={panelStyle}
          >
            {renderPanelBody("sheet")}
          </SheetContent>
        </Sheet>
        {deleteConfirmDialog}
      </>
    );
  }

  if (!isOpen) {
    return deleteConfirmDialog;
  }

  // Desktop: Render as static panel in flex flow
  return (
    <>
      <div className="relative z-20 flex h-full max-w-[340px] shrink-0 flex-col overflow-hidden">
        <aside
          className={cn(
            "relative h-full w-[340px] max-w-[340px] overflow-hidden border-r border-transparent bg-transparent p-0 text-muted-foreground outline-none",
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Chat history"
        >
          {renderPanelBody("panel")}
        </aside>
      </div>
      {deleteConfirmDialog}
    </>
  );
});

// Conversation Item Component
type ConversationItemProps = {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
};

function ConversationItem({ conversation, isActive, onSelect, onDelete }: ConversationItemProps) {
  const displayTitle = truncateConversationTitle(conversation.title);
  const avatarLabel = resolveModelLabel(conversation.model, "Nex Agent");

  return (
    <div
      className={cn(
        "group relative flex w-full max-w-full cursor-pointer items-center gap-3 overflow-hidden rounded-[10px] border border-transparent px-3 py-2.5 transition-all",
        "bg-transparent hover:border-primary/20 hover:bg-primary/5 dark:hover:border-white/10 dark:hover:bg-white/10",
        isActive && "border-transparent bg-accent dark:bg-white/8",
        "focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-transparent dark:focus-visible:ring-transparent",
      )}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-label={`Open conversation ${conversation.title}`}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <NexAgentAvatar
        agentName={avatarLabel}
        model={conversation.model}
        conversationId={conversation.id}
        fallbackLabel={avatarLabel}
        className="size-8"
        size={32}
        animated={false}
      />
      <div className="min-w-0 flex-1 space-y-1 overflow-hidden">
        <p
          className="overflow-hidden text-[13px] font-medium leading-5 text-foreground/95 sm:text-sm"
          title={conversation.title}
        >
          {displayTitle}
        </p>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 sm:text-[11px]">
          {new Date(conversation.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="size-7 shrink-0 rounded-full border border-border bg-muted opacity-0 transition hover:border-primary/30 hover:bg-primary/10 group-hover:opacity-100 dark:border-transparent dark:bg-white/5 dark:hover:border-white/15 dark:hover:bg-white/10"
        onClick={onDelete}
      >
        <Trash2 className="size-3.5 text-muted-foreground/80" />
      </Button>
    </div>
  );
}
