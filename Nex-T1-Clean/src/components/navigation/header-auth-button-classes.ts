const headerAuthButtonTypographyClass =
  "text-[15px] font-normal leading-5 tracking-[-0.23px] [font-family:'SF_Pro',-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif]";

const headerAuthButtonFocusClass =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--header-auth-button-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";

export const headerAuthButtonBaseClass = [
  "inline-flex items-center justify-center gap-[3px] whitespace-nowrap rounded-full",
  "h-7 min-w-[67px] px-[10px] py-1",
  headerAuthButtonTypographyClass,
  headerAuthButtonFocusClass,
  "transition-[background-color,transform] duration-200 ease-out active:scale-[0.98]",
].join(" ");

export const headerAuthButtonPrimaryClass = [
  headerAuthButtonBaseClass,
  "bg-[var(--header-auth-button-bg)] text-[var(--header-auth-button-fg)]",
  "hover:bg-[var(--header-auth-button-bg-hover)]",
].join(" ");

export const appHeaderLoginButtonClass = [
  headerAuthButtonBaseClass,
  "app-header-login-btn",
  "bg-glass-white dark:bg-[var(--auth-menu-subtle-bg)]",
  "backdrop-blur-xl dark:backdrop-blur-none",
  "glass-edge dark:border dark:border-[var(--auth-menu-subtle-border)] dark:shadow-none",
  "shadow-liquid-soft dark:shadow-none text-black dark:text-[var(--auth-menu-fg)]",
  "hover:shadow-liquid-deep dark:hover:shadow-none hover:text-black dark:hover:text-[var(--auth-menu-hover-fg)]",
  "dark:hover:bg-[var(--auth-menu-hover-bg)]",
  "active:shadow-none"
].join(" ");
