"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
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

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
  isPending?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  isPending,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bento-card border-[var(--settings-border)] bg-[var(--settings-card-bg)]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[var(--settings-foreground-strong)]">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-[var(--settings-foreground-muted)]">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isPending}
            className="border-[var(--settings-border)] bg-transparent text-[var(--settings-foreground-muted)] hover:bg-[var(--settings-elevated)] hover:text-[var(--settings-foreground-strong)]"
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className={cn(
              "min-w-[80px]",
              variant === "destructive"
                ? "border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20"
                : "bg-[var(--settings-foreground-strong)] text-[var(--settings-card-bg)] hover:bg-[var(--settings-foreground-strong)]/90",
            )}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
