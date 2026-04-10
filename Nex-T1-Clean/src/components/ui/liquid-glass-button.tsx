import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

import { cn } from "@/lib/utils";

import styles from "./liquid-glass-button.module.css";

export type LiquidGlassButtonVariant =
  | "announcement"
  | "cta"
  | "header"
  | "icon"
  | "default";

type LiquidGlassButtonBaseProps = {
  animate?: boolean;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  shadowClassName?: string;
  surfaceClassName?: string;
  variant?: LiquidGlassButtonVariant;
};

type LiquidGlassButtonLinkProps = LiquidGlassButtonBaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "className"> & {
    disabled?: boolean;
    href: string;
  };

type LiquidGlassButtonActionProps = LiquidGlassButtonBaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> & {
    href?: undefined;
  };

type LiquidGlassButtonProps =
  | LiquidGlassButtonActionProps
  | LiquidGlassButtonLinkProps;

const VARIANT_CLASS_NAMES: Record<LiquidGlassButtonVariant, string | undefined> = {
  announcement: styles.variantAnnouncement,
  cta: styles.variantCta,
  default: undefined,
  header: styles.variantHeader,
  icon: styles.variantIcon,
};

export function LiquidGlassButton(props: LiquidGlassButtonProps) {
  const {
    animate = false,
    children,
    className,
    contentClassName,
    shadowClassName,
    surfaceClassName,
    variant = "default",
    ...elementProps
  } = props;

  const variantClassName = VARIANT_CLASS_NAMES[variant];
  const rootClassName = cn(
    styles.buttonRoot,
    variantClassName,
    animate && styles.enter,
    className,
  );
  const surfaceClass = cn(styles.buttonSurface, surfaceClassName);
  const content = (
    <span className={cn(styles.buttonContent, contentClassName)}>
      {children}
    </span>
  );

  if (typeof props.href === "string") {
    const {
      disabled = false,
      href,
      rel,
      target,
      ...anchorProps
    }: LiquidGlassButtonLinkProps = elementProps as LiquidGlassButtonLinkProps;
    const resolvedRel =
      rel ?? (target === "_blank" ? "noopener noreferrer" : undefined);

    return (
      <div className={rootClassName}>
        <a
          {...anchorProps}
          aria-disabled={disabled || undefined}
          className={surfaceClass}
          href={disabled ? undefined : href}
          rel={resolvedRel}
          tabIndex={disabled ? -1 : anchorProps.tabIndex}
          target={target}
        >
          {content}
        </a>
        <div aria-hidden="true" className={cn(styles.buttonShadow, shadowClassName)} />
      </div>
    );
  }

  const { type = "button", ...buttonProps }: LiquidGlassButtonActionProps =
    elementProps as LiquidGlassButtonActionProps;

  return (
    <div className={rootClassName}>
      <button
        {...buttonProps}
        className={surfaceClass}
        type={type}
      >
        {content}
      </button>
      <div aria-hidden="true" className={cn(styles.buttonShadow, shadowClassName)} />
    </div>
  );
}
