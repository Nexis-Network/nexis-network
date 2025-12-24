import { cn } from "@/lib/utils";
import React, { ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

const buttonBaseClasses =
  "inline-flex items-center justify-center rounded-button font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-sky focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

const buttonVariants = {
  primary: "bg-accent-sky hover:bg-accent-cyan text-white shadow-lg shadow-accent-sky/20 border-transparent",
  secondary: "bg-background-card hover:bg-zinc-800 text-text-primary border-border-default hover:border-border-highlight border",
  outline: "bg-transparent border border-border-default hover:border-text-primary text-text-primary",
  ghost: "bg-transparent text-text-secondary hover:text-text-primary hover:bg-white/5",
  danger: "bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20 border",
} satisfies Record<NonNullable<ButtonProps["variant"]>, string>;

const buttonSizes = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-8 text-base",
  icon: "h-10 w-10 flex items-center justify-center p-0",
} satisfies Record<NonNullable<ButtonProps["size"]>, string>;

type ButtonClassNameOptions = {
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
};

export function buttonClassName({
  variant = "primary",
  size = "md",
  className,
}: ButtonClassNameOptions = {}) {
  return cn(buttonBaseClasses, buttonVariants[variant], buttonSizes[size], className);
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={buttonClassName({ variant, size, className })}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
);
Button.displayName = "Button";

export { Button };
