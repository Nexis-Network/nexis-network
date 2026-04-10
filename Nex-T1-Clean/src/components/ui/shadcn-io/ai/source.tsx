'use client';

import type { ComponentProps } from 'react';

export type SourceProps = ComponentProps<'a'>;

export const Source = ({ href, title, children, ...props }: SourceProps) => (
  <a
    className="flex items-center gap-2"
    href={href}
    rel="noreferrer"
    target="_blank"
    {...(props)}
  >
    {children ?? (
      <>
        <div className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
          1
        </div>
        <div className="flex max-w-[200px] flex-col overflow-hidden">
          <span className="truncate text-xs font-medium text-foreground">
            {title}
          </span>
          <span className="truncate text-[10px] text-muted-foreground">
            {href}
          </span>
        </div>
      </>
    )}
  </a>
);
