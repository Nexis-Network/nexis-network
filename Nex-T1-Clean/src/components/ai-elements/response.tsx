"use client";

import { memo, type ComponentProps } from "react";
import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";

type ResponseProps = ComponentProps<typeof Streamdown>;

export const Response = memo(function Response({ className, children, components, ...props }: ResponseProps) {
  const wrapperClassName = cn(
    "size-full no-scrollbar [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose prose-invert max-w-none",
    className,
  );

  // If there's no content, return null (unless it's empty string which implies blank message)
  if (!children && children !== "") return null;

  return (
    <div className={wrapperClassName}>
      <Streamdown components={components} {...props}>
        {children}
      </Streamdown>
    </div>
  );
}, (prevProps, nextProps) => prevProps.children === nextProps.children);
