"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Suggestion({
  suggestion,
  onClick,
  className,
  children,
}: {
  suggestion: string;
  onClick: () => void;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Button
      className={cn("h-auto whitespace-normal text-left", className)}
      onClick={onClick}
      size="sm"
      variant="outline"
    >
      {children || suggestion}
    </Button>
  );
}

export function Suggestions({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap gap-2", className)}>{children}</div>;
}
