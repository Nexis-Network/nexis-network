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

export type RiskWarning = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type RiskWarningDialogProps = {
  open: boolean;
  warning: RiskWarning | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function RiskWarningDialog({
  open,
  warning,
  onCancel,
  onConfirm,
}: RiskWarningDialogProps) {
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
          <div className="flex items-start space-x-2 pt-4">
            <Checkbox
              id="terms"
              checked={acknowledged}
              onCheckedChange={(checked) => setAcknowledged(checked as boolean)}
              className="mt-1 border-orange-600/50 data-[state=checked]:bg-orange-600 data-[state=checked]:text-white"
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="terms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-orange-800"
              >
                I acknowledge the risks
              </Label>
              <p className="text-xs text-orange-800/90 text-justify leading-relaxed">
                I explicitly acknowledge that this software is experimental and
                provided &quot;as is&quot; without warranty. I understand that
                nothing in this application constitutes financial, investment,
                or legal advice. I assume full responsibility for all
                transactions and hold Nexis Labs harmless for any loss of funds.
              </p>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="ghost"
            className="border border-transparent bg-transparent ring-0 ring-transparent hover:bg-transparent hover:text-orange-50"
            onClick={onCancel}
          >
            {warning?.cancelLabel ?? "Cancel"}
          </Button>
          <Button
            className="border border-orange-700/20 bg-orange-700/10 text-orange-600/80 ring-0 ring-transparent hover:bg-orange-700/20 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onConfirm}
            disabled={!acknowledged}
          >
            {warning?.confirmLabel ?? "Confirm & Proceed"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
