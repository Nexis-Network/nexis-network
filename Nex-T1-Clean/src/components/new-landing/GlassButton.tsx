'use client';
import React from 'react';

type Variant = 'announcement' | 'cta' | 'header';

interface GlassButtonProps {
  variant: Variant;
  href?: string;
  children: React.ReactNode;
  className?: string;
}

const glassBase =
  'relative inline-flex items-center justify-center rounded-[999px] border-[1.5px] border-white shadow-[0_4px_30px_rgba(0,0,0,0.1)] backdrop-blur-[12.5px] cursor-pointer select-none transition-transform hover:scale-[1.02] active:scale-[0.98]';

const glassStyle = { background: 'rgba(240, 240, 240, 0.75)' } as const;

export function GlassButton({ variant, href, children, className = '' }: GlassButtonProps) {
  const target = href?.startsWith('http') ? '_blank' : undefined;
  const rel = href?.startsWith('http') ? 'noopener noreferrer' : undefined;
  const Tag = href ? 'a' : 'button';

  if (variant === 'header') {
    return (
      <Tag
        href={href as string}
        target={target}
        rel={rel}
        className={`${glassBase} h-[28px] w-[88px] md:h-[32px] md:w-[102px] shrink-0 ${className}`}
        style={glassStyle}
      >
        <span className="text-[10px] md:text-[11px] leading-none font-medium tracking-[-0.18px] text-[#323232] text-center whitespace-nowrap">
          {children}
        </span>
      </Tag>
    );
  }

  if (variant === 'cta') {
    return (
      <Tag
        href={href as string}
        target={target}
        rel={rel}
        className={`${glassBase} h-[48px] w-[240px] md:w-[180px] shrink-0 ${className}`}
        style={glassStyle}
      >
        <span className="text-[15px] leading-none font-medium tracking-[-0.18px] text-[#323232] text-center whitespace-nowrap">
          {children}
        </span>
      </Tag>
    );
  }

  // announcement pill
  return (
    <Tag
      href={href as string}
      target={target}
      rel={rel}
      className={`${glassBase} h-[32px] px-6 shrink-0 ${className}`}
      style={glassStyle}
    >
      <span className="text-[12px] leading-none font-medium text-[#323232] whitespace-nowrap">
        {children}
      </span>
    </Tag>
  );
}
