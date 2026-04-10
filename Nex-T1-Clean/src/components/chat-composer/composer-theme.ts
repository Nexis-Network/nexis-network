import { cn } from "@/lib/utils";

export const COMPOSER_FONT_CLASS = "font-[family-name:var(--font-inter)]";

export const COMPOSER_STACK_CLASS = cn(
  COMPOSER_FONT_CLASS,
  "flex flex-col items-center gap-2",
);

export const COMPOSER_FRAME_RADIUS_CLASS =
  "rounded-[var(--auth-composer-radius)]";
export const COMPOSER_INNER_RADIUS_CLASS =
  "rounded-[var(--auth-composer-inner-radius,var(--auth-composer-radius))]";

export const COMPOSER_CARD_MIN_HEIGHT_CLASS = "min-h-[188px]";
export const COMPOSER_CARD_INNER_MIN_HEIGHT_CLASS = "min-h-[101px]";
export const COMPOSER_CARD_INPUT_MIN_HEIGHT_CLASS = "min-h-[62px]";
export const COMPOSER_CARD_INPUT_MIN_HEIGHT_COMPACT_CLASS = "min-h-[56px]";
export const COMPOSER_CARD_VOICE_MIN_HEIGHT_CLASS = "min-h-[56px]";
export const COMPOSER_CARD_VOICE_MIN_HEIGHT_COMPACT_CLASS = "min-h-[50px]";

export const COMPOSER_FRAME_CLASS = cn(
  COMPOSER_FRAME_RADIUS_CLASS,
  "overflow-hidden border border-[var(--auth-composer-frame-border,var(--border))] bg-[var(--auth-composer-frame-bg,var(--card))] p-[var(--auth-composer-frame-padding)] shadow-[var(--auth-composer-frame-shadow)] backdrop-blur-[var(--auth-composer-frame-blur)]",
);

export const COMPOSER_FRAME_CONTENT_CLASS = cn(
  COMPOSER_FRAME_RADIUS_CLASS,
  "relative z-10 flex min-w-0 w-full flex-col items-start overflow-hidden bg-[var(--auth-composer-frame-content-bg,var(--card))]",
);

export const COMPOSER_INNER_SURFACE_CLASS = cn(
  COMPOSER_INNER_RADIUS_CLASS,
  "relative z-10 flex w-full flex-col items-start border border-[var(--auth-composer-surface-border,var(--border))] bg-[var(--auth-composer-surface-bg,var(--background))] shadow-[var(--auth-composer-surface-shadow)]",
);

export const COMPOSER_INPUT_TEXT_CLASS = cn(
  COMPOSER_FONT_CLASS,
  "text-[length:var(--auth-composer-input-size)] font-normal leading-[var(--auth-composer-input-line-height)] text-[var(--auth-composer-text,var(--foreground))]",
);

export const COMPOSER_PLACEHOLDER_TEXT_CLASS = cn(
  COMPOSER_FONT_CLASS,
  "text-[var(--auth-composer-placeholder,var(--muted-foreground))]",
);

export const COMPOSER_DISCLAIMER_CLASS = cn(
  COMPOSER_FONT_CLASS,
  "text-[11px] leading-[11px] text-[var(--auth-composer-disclaimer,var(--muted-foreground))]",
);

export const COMPOSER_MENU_SURFACE_CLASS = "";

export const COMPOSER_MENU_CONTENT_CLASS = cn(
  COMPOSER_MENU_SURFACE_CLASS,
  "w-72 space-y-2 p-2",
);

export const COMPOSER_MENU_SUBCONTENT_CLASS = cn(
  COMPOSER_MENU_SURFACE_CLASS,
  "p-1.5",
);

export const COMPOSER_MENU_LABEL_CLASS = "px-2 text-xs font-medium";

export const COMPOSER_MENU_SEPARATOR_CLASS = "my-1";

export const COMPOSER_MENU_ITEM_CLASS =
  "flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-xs";

export const COMPOSER_STATUS_BADGE_CLASS =
  "flex items-center justify-center rounded-full border border-[var(--auth-composer-badge-border,rgba(59,130,246,0.24))] bg-[var(--auth-composer-badge-bg,rgba(59,130,246,0.12))] px-1.5 py-0.5 text-[10px] font-medium text-[var(--auth-composer-badge-fg,#3b82f6)]";

export const COMPOSER_ICON_CLASS =
  "size-[var(--auth-composer-control-icon-size)] shrink-0";
export const COMPOSER_ICON_COMPACT_CLASS =
  "size-[var(--auth-composer-control-icon-size-compact)] shrink-0";
export const COMPOSER_GLASS_CONTROL_ICON_COLOR_CLASS = "text-[var(--auth-composer-control-fg)]";
export const COMPOSER_CONTROL_Y_AXIS_NUDGE_CLASS = "translate-y-[1px]";

export function getComposerControlButtonClassName(options?: {
  compact?: boolean;
  emphasized?: boolean;
  active?: boolean;
  transparent?: boolean;
}) {
  const compact = options?.compact ?? false;
  const emphasized = options?.emphasized ?? false;
  const active = options?.active ?? false;
  const transparent = options?.transparent ?? false;
  const sizeClass = compact
    ? emphasized
      ? "size-[var(--auth-composer-control-size-emphasized-compact)]"
      : "size-[var(--auth-composer-control-size-compact)]"
    : emphasized
      ? "size-[var(--auth-composer-control-size-emphasized)]"
      : "size-[var(--auth-composer-control-size)]";

  return cn(
    "inline-flex items-center justify-center rounded-full border border-transparent outline-none ring-0 ring-transparent focus:outline-none focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-transparent",
    COMPOSER_CONTROL_Y_AXIS_NUDGE_CLASS,
    sizeClass,
    "hover:opacity-80 active:scale-95 transition-all duration-150",
    transparent
      ? "bg-transparent text-[var(--auth-composer-control-fg,var(--muted-foreground))]"
      : "bg-[var(--auth-composer-control-bg)] text-[var(--auth-composer-control-fg)]",
    active && "opacity-80",
  );
}

export const COMPOSER_TEXT_TRIGGER_CLASS = cn(
  COMPOSER_FONT_CLASS,
  "relative inline-flex h-[var(--auth-composer-control-size)] items-center gap-1.5 rounded-full border border-transparent bg-transparent px-[var(--auth-composer-control-inline-padding)] text-[var(--auth-composer-control-fg,var(--muted-foreground))] shadow-none outline-none ring-0 ring-transparent transition-all duration-150 hover:opacity-80 active:scale-95 focus:outline-none focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-transparent",
);

export const COMPOSER_MODEL_TRIGGER_CLASS = cn(
  COMPOSER_FONT_CLASS,
  "group !h-[var(--auth-composer-control-size-emphasized)] w-auto min-w-0 items-center justify-center gap-1.5 rounded-full border border-transparent px-[var(--auth-composer-control-inline-padding)] outline-none ring-0 ring-transparent focus:outline-none focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-transparent",
  COMPOSER_CONTROL_Y_AXIS_NUDGE_CLASS,
  "bg-[var(--auth-composer-control-bg)] text-[var(--auth-composer-control-fg)] hover:opacity-80 active:scale-95 transition-all duration-150",
);

export const COMPOSER_MODEL_MENU_CLASS = cn(
  COMPOSER_MENU_SURFACE_CLASS,
  "w-64 px-1.5 py-2",
);

export const COMPOSER_POPUP_SHELL_SURFACE_CLASS =
  "overflow-hidden rounded-xl border border-[var(--auth-composer-menu-border)] bg-[var(--auth-menu-bg)] shadow-[var(--auth-menu-shadow)] backdrop-blur-lg";

export const COMPOSER_MODEL_ITEM_CLASS =
  "gap-2 rounded-lg border-0 px-1.5 py-1.5 text-xs hover:bg-[var(--auth-composer-menu-hover-bg,var(--accent))] focus:bg-[var(--auth-composer-menu-hover-bg,var(--accent))] cursor-pointer";

export const COMPOSER_MENTION_CHIP_CLASS =
  "inline-flex max-w-full items-center gap-1.5 overflow-hidden rounded-full border border-[var(--auth-composer-mention-border,rgba(59,130,246,0.2))] bg-[var(--auth-composer-mention-bg,rgba(59,130,246,0.12))] px-2 py-0.5 text-[inherit] leading-none text-[var(--auth-composer-mention-fg,var(--foreground))]";

export const COMPOSER_MENTION_SECONDARY_CLASS =
  "truncate text-[var(--auth-composer-mention-muted,var(--muted-foreground))]";

export const COMPOSER_MENTION_ACCENT_CLASS =
  "shrink-0 font-medium text-[var(--auth-composer-mention-accent,#3b82f6)]";

export const COMPOSER_ICON_BUTTON_CLASS = getComposerControlButtonClassName();
export const COMPOSER_EMPHASIZED_ICON_BUTTON_CLASS =
  getComposerControlButtonClassName({ emphasized: true });
export const COMPOSER_ICON_BUTTON_COMPACT_CLASS =
  getComposerControlButtonClassName({ compact: true });
