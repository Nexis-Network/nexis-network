"use client";

import { Provider as ChatStoreProvider } from "@ai-sdk-tools/store";
import { createContext, useContext, useMemo } from "react";
import { toast } from "sonner";
import type { UseNexChatReturn } from "@/modules/chat/hooks/use-ai-chat";
import { useNexChat } from "@/modules/chat/hooks/use-ai-chat";
import { handleRateLimitError, isRateLimitError } from "@/lib/table-editor/error-handler";
import { logger } from "@/lib/logger";
import { useTableEditorArtifact } from "../../../hooks/table-editor/use-table-editor-artifact";

type TableEditorChatContextValue = UseNexChatReturn & {
  tableArtifact: ReturnType<typeof useTableEditorArtifact>;
};

const TableEditorChatContext = createContext<TableEditorChatContextValue | null>(null);

export function TableEditorChatProvider({ children }: { children: React.ReactNode }) {
  return (
    <ChatStoreProvider>
      <TableEditorChatProviderInner>{children}</TableEditorChatProviderInner>
    </ChatStoreProvider>
  );
}

function TableEditorChatProviderInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const chat = useNexChat({
    api: "/api/artifact-table",
    onError: (error) => {
      logger.error("Table editor chat error:", error);

      if (isRateLimitError(error)) {
        handleRateLimitError(error);
        return;
      }

      const errorMessage = error?.message || "An unexpected error occurred";
      toast.error(`Request failed: ${errorMessage}`, {
        id: "table-editor-chat-error",
        duration: 5000,
      });
    },
  });

  const tableArtifact = useTableEditorArtifact(chat.messages);

  const value = useMemo(
    () => ({
      ...chat,
      tableArtifact,
    }),
    [chat, tableArtifact],
  );

  return (
    <TableEditorChatContext.Provider value={value}>
      {children}
    </TableEditorChatContext.Provider>
  );
}

export function useTableEditorChat() {
  const context = useContext(TableEditorChatContext);

  if (!context) {
    throw new Error("useTableEditorChat must be used within a TableEditorChatProvider");
  }

  return context;
}
