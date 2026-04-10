"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { ModelWarning } from "@/modules/chat/model-warnings";

type ModelWarningDialogProps = {
  open: boolean;
  warning: ModelWarning | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ModelWarningDialog({
  open,
  warning,
  onCancel,
  onConfirm,
}: ModelWarningDialogProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (!open) {
      setAcknowledged(false);
      return;
    }
    setAcknowledged(false);
  }, [open, warning?.title, warning?.description]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onCancel();
        }
      }}
    >
      <DialogContent
        className="sm:max-w-md bg-orange-700/10 border border-orange-700/20 backdrop-blur-md text-orange-600"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>{warning?.title}</DialogTitle>
          <DialogDescription className="text-orange-800">
            {warning?.description}
          </DialogDescription>
          <div className="flex items-center space-x-2 pt-4">
            <Checkbox
              id="terms"
              checked={acknowledged}
              onCheckedChange={(checked) => setAcknowledged(checked as boolean)}
              className="border-orange-600/50 data-[state=checked]:bg-orange-600 data-[state=checked]:text-white"
            />
            <Label
              htmlFor="terms"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-orange-800"
            >
              I acknowledge and agree to the terms
            </Label>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="ghost"
            className="border border-transparent bg-transparent ring-0 ring-transparent hover:bg-transparent hover:text-orange-50"
            onClick={onCancel}
          >
            {warning?.cancelLabel ?? "Stay on current model"}
          </Button>
          <Button
            className="border border-orange-700/20 bg-orange-700/10 text-orange-600/80 ring-0 ring-transparent hover:bg-orange-700/20 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onConfirm}
            disabled={!acknowledged}
          >
            {warning?.confirmLabel ?? "Proceed"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
