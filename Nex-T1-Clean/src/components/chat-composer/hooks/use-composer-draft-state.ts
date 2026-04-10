"use client";

import { useState } from "react";

import { useAttachments } from "@/components/chat-composer/use-attachments";
import type {
  ComposerDraftState,
  ComposerPendingModelWarning,
} from "@/components/chat-composer/types";

export function useComposerDraftState(): ComposerDraftState {
  const attachmentsState = useAttachments();
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [tokenSearchOpen, setTokenSearchOpen] = useState(false);
  const [tokenSearchQuery, setTokenSearchQuery] = useState("");
  const [tokenSearchInsertionIndex, setTokenSearchInsertionIndex] = useState<number | null>(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [pendingModelWarning, setPendingModelWarning] =
    useState<ComposerPendingModelWarning | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  return {
    ...attachmentsState,
    commandOpen,
    setCommandOpen,
    commandQuery,
    setCommandQuery,
    tokenSearchOpen,
    setTokenSearchOpen,
    tokenSearchQuery,
    setTokenSearchQuery,
    tokenSearchInsertionIndex,
    setTokenSearchInsertionIndex,
    authDialogOpen,
    setAuthDialogOpen,
    pendingModelWarning,
    setPendingModelWarning,
    isExpanded,
    setIsExpanded,
  };
}
