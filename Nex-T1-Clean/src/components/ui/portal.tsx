"use client";

import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

interface PortalProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export function Portal({ children, className, id }: PortalProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div id={id} className={cn("fixed inset-x-0 bottom-0 z-[60]", className)}>
      {children}
    </div>,
    document.body
  );
}

export function PortalBackdrop({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label="Close navigation overlay"
      className={cn(
        "absolute inset-0 bg-background/60 backdrop-blur-[2px]",
        className,
      )}
      {...props}
    />
  );
}
