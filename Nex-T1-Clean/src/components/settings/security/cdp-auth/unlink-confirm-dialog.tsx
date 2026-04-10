"use client";

import { Loader2 } from "lucide-react";
import type { LinkedAuthMethod } from "@/lib/hooks/cdp/use-cdp-auth-linking";
import { Button } from "@/components/settings/shared/settings-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UnlinkConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  method: LinkedAuthMethod | null;
  onConfirm: () => void;
  isUnlinking: boolean;
}

export function UnlinkConfirmDialog({ open, onOpenChange, method, onConfirm, isUnlinking }: UnlinkConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Remove Linked Method</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove{" "}
            <strong className="text-[var(--bento-text-primary)]">{method?.identifier ?? "this method"}</strong>{" "}
            from your account? You can re-link it later.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isUnlinking}>
            {isUnlinking ? (<><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Removing...</>) : "Remove"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
