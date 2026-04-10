import type { ReactNode } from "react";

export function FooterPriceBlock({
  alt,
  icon,
  value,
}: {
  alt: string;
  icon: ReactNode;
  value: string;
}) {
  return (
    <div className="flex min-w-[70px] items-center gap-1.5" aria-label={alt}>
      {icon}
      <span className="pt-[2px] font-mono text-xs leading-[12px] text-[var(--auth-footer-meta)]">
        {value}
      </span>
    </div>
  );
}
