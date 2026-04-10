export const appShellClasses = {
  frame:
    "relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[var(--auth-app-bg)] text-[var(--auth-text-primary)] selection:bg-primary/20 selection:text-primary-foreground",
  header:
    "relative z-[60] flex h-[var(--auth-header-height)] w-full items-center bg-[var(--auth-header-bg)] text-[var(--auth-nav-text)]",
  headerInner:
    "flex h-full w-full items-center gap-4",
  headerLogoSlot:
    "flex h-[var(--auth-header-height)] w-[var(--auth-header-height)] items-center justify-center",
  headerActions:
    "ml-auto flex items-center gap-2",
  sidebarShell:
    "relative z-20 hidden h-full flex-col items-center overflow-hidden md:flex",
  sidebarRail:
    "flex h-full w-[var(--auth-sidebar-shell-width)] flex-col items-center justify-center py-4 md:py-0",
  sidebarStack:
    "flex w-[var(--auth-sidebar-pill-width)] flex-col items-center gap-2 p-1",
  sidebarButton:
    "flex size-[var(--auth-sidebar-button-size)] items-center justify-center rounded-full border border-transparent bg-transparent text-[var(--auth-sidebar-button-fg)] transition-[color,transform] duration-200 ease-out hover:text-[var(--auth-sidebar-button-hover-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-focus)] aria-pressed:text-[var(--auth-sidebar-button-hover-fg)]",
  workspaceWrap:
    "relative flex min-w-0 flex-1 flex-col overflow-hidden px-[var(--auth-shell-padding-x)] pb-0 md:pb-1.5",
  workspaceRailGap: "md:gap-1.5",
  workspaceSurface:
    "relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[var(--auth-radius-xl)] bg-glass-white backdrop-blur-xl glass-edge shadow-liquid-soft dark:bg-[var(--auth-card-bg)] dark:backdrop-blur-none dark:border dark:border-[var(--auth-workspace-border)] dark:shadow-none",
  footerShell:
    "hidden h-9 w-full items-center justify-center px-2 md:flex",
  footerInner: "relative flex w-full items-center justify-between gap-4",
  footerLink:
    "pt-0.5 text-xs leading-none text-[var(--auth-footer-text)] transition-colors hover:text-[var(--auth-text-primary)]",
  footerText:
    "pt-0.5 text-xs leading-none text-[var(--auth-footer-text)]",
  footerPill:
    "h-6 rounded-full border border-[var(--auth-footer-divider)] bg-[var(--auth-elevated-bg)] px-2 text-xs leading-none text-[var(--auth-footer-meta)] shadow-none transition-colors hover:bg-[var(--auth-card-bg)] hover:text-[var(--auth-text-primary)] focus-visible:border-[var(--auth-border-strong)] focus-visible:ring-1 focus-visible:ring-[var(--auth-focus)]",
  footerDivider: "h-4 w-px bg-[var(--auth-footer-divider)]",
  themeSwitcherShell:
    "inline-flex items-center gap-1 rounded-full border border-[var(--auth-user-chip-border)] bg-[var(--auth-user-chip-bg)] p-1 shadow-sm backdrop-blur-xl",
  themeSwitcherButton:
    "relative inline-flex h-8 min-w-[2.5rem] items-center justify-center overflow-hidden rounded-full px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-focus)]",
  themeSwitcherButtonActive:
    "text-[var(--auth-user-chip-fg)] shadow-sm",
  themeSwitcherButtonInactive:
    "text-[var(--auth-nav-text)] hover:bg-[var(--auth-sidebar-button-hover-bg)] hover:text-[var(--auth-nav-text-active)]",
  themeSwitcherIndicator:
    "absolute inset-0 rounded-full bg-[var(--auth-elevated-bg)] shadow-sm",
  themeSwitcherLabel:
    "relative z-10 flex items-center gap-1.5",
  themeSwitcherIcon:
    "size-3.5 shrink-0",
  mobileNavTrigger:
    "flex items-center justify-center px-1 text-[var(--auth-nav-text-active)] transition-opacity active:opacity-70",
  mobileMenuBackdrop:
    "absolute inset-0 bg-[color-mix(in_oklab,var(--auth-app-bg)_62%,transparent)] backdrop-blur-lg",
  mobileMenuPanel:
    "relative flex w-full flex-col items-start gap-[var(--auth-shell-gap)] rounded-b-[var(--auth-radius-xl)] border-b border-[var(--auth-border-subtle)] bg-[var(--auth-elevated-bg)] px-[calc(var(--auth-shell-frame-padding-x)*2)] py-[calc(var(--auth-shell-padding-x)*2)] text-[var(--auth-text-primary)] shadow-lg backdrop-blur-xl",
  mobileMenuCloseButton:
    "flex size-6 items-center justify-center rounded-[var(--auth-radius-sm)] bg-[var(--auth-accent)] text-[var(--auth-text-primary)] transition-opacity active:opacity-70",
} as const;
