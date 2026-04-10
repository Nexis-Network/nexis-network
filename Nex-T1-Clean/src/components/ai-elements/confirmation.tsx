"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ShieldCheck, ShieldX } from "lucide-react";
import type { ComponentProps } from "react";

export type ConfirmationProps = Omit<ComponentProps<typeof Card>, "title"> & {
  title: string;
  description?: string;
  confirmLabel?: string;
  declineLabel?: string;
  onConfirm?: () => void;
  onDecline?: () => void;
  isPending?: boolean;
};

export const Confirmation = ({
  className,
  title,
  description,
  confirmLabel = "Allow",
  declineLabel = "Decline",
  onConfirm,
  onDecline,
  isPending = false,
  ...props
}: ConfirmationProps) => (
  <Card className={cn("border-border/70 bg-background/80 shadow-sm", className)} {...props}>
    <CardHeader className="space-y-1">
      <CardTitle className="text-sm font-semibold flex items-center gap-2">
        <ShieldCheck className="size-4 text-primary" />
        {title}
      </CardTitle>
      {description && <CardDescription className="text-muted-foreground text-sm">{description}</CardDescription>}
    </CardHeader>
    <CardContent />
    <CardFooter className="flex items-center gap-2">
      <Button size="sm" disabled={isPending} onClick={onConfirm}>
        {confirmLabel}
      </Button>
      <Button size="sm" variant="ghost" disabled={isPending} onClick={onDecline}>
        <ShieldX className="mr-1 size-4" />
        {declineLabel}
      </Button>
    </CardFooter>
  </Card>
);

Confirmation.displayName = "Confirmation";
