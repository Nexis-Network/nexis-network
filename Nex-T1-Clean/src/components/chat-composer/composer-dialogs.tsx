"use client";

import { AuthRequiredDialog } from "@/components/chat-composer/auth-required-dialog";
import { ModelWarningDialog } from "@/components/chat-composer/model-warning-dialog";
import type {
  ComposerPendingModelWarning,
} from "@/components/chat-composer/types";
import type { AuthView } from "@/components/chat-composer/auth-required-dialog";

type ComposerDialogsProps = {
  authDialogOpen: boolean;
  onAuthNavigation: (view: AuthView) => void;
  onAuthOpenChange: (open: boolean) => void;
  onModelWarningCancel: () => void;
  onModelWarningConfirm: () => void;
  pendingModelWarning: ComposerPendingModelWarning | null;
};

export function ComposerDialogs({
  authDialogOpen,
  onAuthNavigation,
  onAuthOpenChange,
  onModelWarningCancel,
  onModelWarningConfirm,
  pendingModelWarning,
}: ComposerDialogsProps) {
  return (
    <>
      <ModelWarningDialog
        open={Boolean(pendingModelWarning)}
        warning={pendingModelWarning?.warning ?? null}
        onCancel={onModelWarningCancel}
        onConfirm={onModelWarningConfirm}
      />

      <AuthRequiredDialog
        open={authDialogOpen}
        onOpenChange={onAuthOpenChange}
        onNavigate={onAuthNavigation}
      />
    </>
  );
}
