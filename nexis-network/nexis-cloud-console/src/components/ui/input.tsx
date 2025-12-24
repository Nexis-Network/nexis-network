import { cn } from "@/lib/utils";
import React, { InputHTMLAttributes, forwardRef } from "react";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-border-default bg-background-surface px-3 py-2 text-sm text-text-primary ring-offset-background placeholder:text-text-placeholder focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-sky disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
