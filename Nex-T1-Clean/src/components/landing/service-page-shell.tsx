import type { ReactNode } from "react";

import { LandingHeaderV2 } from "@/components/landing/landing-header-v2";
import { SiteFooter } from "@/components/marketing/site-footer";
import { cn } from "@/lib/utils";

const SECTION_VARIANTS = {
  dark: "bg-[#0f0f10] text-white",
  muted: "bg-[#0f0f10] text-white",
  gradient: "bg-[linear-gradient(180deg,#0f0f10_0%,#141414_100%)] text-white",
  light: "bg-white text-[#080808]",
  paper: "bg-[#F4F4F4] text-[#080808]",
} as const;

type SectionVariant = keyof typeof SECTION_VARIANTS;

type ServicePageShellProps = {
  children: ReactNode;
  className?: string;
};

export function ServicePageShell({ children, className }: ServicePageShellProps) {
  return (
    <main className={cn("relative w-full flex flex-col items-center overflow-x-clip bg-[#0f0f10]", className)}>
      <div className="w-full relative z-50">
        <LandingHeaderV2 />
      </div>
      {children}
      <SiteFooter className="w-full" />
    </main>
  );
}

type ServiceSectionProps = {
  id?: string;
  variant?: SectionVariant;
  className?: string;
  containerClassName?: string;
  children: ReactNode;
};

export function ServiceSection({
  id,
  variant = "dark",
  className,
  containerClassName,
  children,
}: ServiceSectionProps) {
  return (
    <section id={id} className={cn("w-full flex justify-center", SECTION_VARIANTS[variant], className)}>
      <div className={cn("w-full max-w-[1200px] px-4 md:px-[120px]", containerClassName)}>{children}</div>
    </section>
  );
}

type ServiceEyebrowProps = {
  children: ReactNode;
  className?: string;
};

export function ServiceEyebrow({ children, className }: ServiceEyebrowProps) {
  return (
    <span
      className={cn(
        "text-[11px] font-semibold uppercase tracking-[0.32em] text-white/60",
        className,
      )}
    >
      {children}
    </span>
  );
}

type CardVariant = "dark" | "light" | "glass";

const CARD_VARIANTS: Record<CardVariant, string> = {
  dark: "bg-[#0A0A0A] text-white border border-white/5",
  light: "bg-white text-[#080808] border border-black/10 shadow-[0px_0.6px_3px_rgba(0,0,0,0.05),0px_8px_32px_rgba(0,0,0,0.08)]",
  glass: "bg-white/5 text-white border border-white/10 backdrop-blur-xl",
};

type ServiceCardProps = {
  title: string;
  description: string;
  eyebrow?: string;
  icon?: ReactNode;
  variant?: CardVariant;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
};

export function ServiceCard({
  title,
  description,
  eyebrow,
  icon,
  variant = "dark",
  className,
  titleClassName,
  descriptionClassName,
}: ServiceCardProps) {
  const eyebrowClass = variant === "light" ? "text-black/50" : "text-white/50";
  const descriptionBaseClass =
    variant === "light" ? "text-black/60" : "text-white/60";
  return (
    <div
      className={cn(
        "flex h-full flex-col gap-4 rounded-[30px] px-6 py-6 shadow-[0px_0.6px_3px_rgba(0,0,0,0.01),0px_2.3px_11.4px_rgba(0,0,0,0.03)]",
        CARD_VARIANTS[variant],
        className,
      )}
    >
      {eyebrow ? (
        <span className={cn("text-[11px] font-semibold uppercase tracking-[0.28em]", eyebrowClass)}>
          {eyebrow}
        </span>
      ) : null}
      {icon ? <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">{icon}</div> : null}
      <h3 className={cn("font-sans text-[17px] leading-[24px] tracking-[-0.2px]", titleClassName)}>
        {title}
      </h3>
      <p className={cn("font-sans text-[12px] leading-[18px]", descriptionBaseClass, descriptionClassName)}>
        {description}
      </p>
    </div>
  );
}
