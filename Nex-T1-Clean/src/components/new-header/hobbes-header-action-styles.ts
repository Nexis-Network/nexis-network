const hobbesHeaderActionBaseClassName =
  "inline-flex items-center justify-center border px-[9px] py-[6px] text-center text-[11px] font-semibold uppercase tracking-[0.3px] transition-colors duration-150";

export const hobbesHeaderOutlineActionClassName = `${hobbesHeaderActionBaseClassName} min-h-6 min-w-[95px] rounded-md border-border bg-background text-foreground hover:bg-muted hover:text-foreground`;

export const hobbesHeaderSolidActionClassName = `${hobbesHeaderActionBaseClassName} min-h-6 min-w-[93px] rounded-md border-foreground bg-foreground text-background hover:bg-foreground/90 hover:text-background`;

export const hobbesHeaderOutlinePillActionClassName = `${hobbesHeaderActionBaseClassName} min-h-6 min-w-[95px] rounded-full border-border bg-background text-foreground hover:bg-muted hover:text-foreground`;

export const hobbesHeaderSolidPillActionClassName = `${hobbesHeaderActionBaseClassName} min-h-6 min-w-[93px] rounded-full border-foreground bg-foreground text-background hover:bg-foreground/90 hover:text-background`;
