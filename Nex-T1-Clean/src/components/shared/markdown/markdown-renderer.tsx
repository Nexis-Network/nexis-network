import { type FC, memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import type { Plugin } from "unified";

import { cn } from "@/lib/utils";

interface MarkdownProps {
  children: string;
  className?: string;
  components?: Components;
  remarkPlugins?: Plugin[];
  rehypePlugins?: Plugin[];
}

const defaultComponents: Components = {
  pre: ({ children, ...props }) => (
    <pre
      {...props}
      className={cn(
        "overflow-x-auto rounded-lg p-4",
        "bg-muted/50 text-foreground",
        "font-mono text-sm",
        "border border-border/50",
        "w-full"
      )}
    >
      {children}
    </pre>
  ),

  code: ({ children, className, ...props }) => (
    <code
      className={cn(
        "relative rounded font-mono text-sm",
        "bg-muted/40 text-foreground",
        "px-[0.3rem] py-[0.2rem]",
        "whitespace-pre-wrap break-words",
        // If inside a pre (code block), use different styling
        "not-prose", // Disable prose styling for code blocks
        className?.includes("language-") ? "block" : "inline-block",
        className
      )}
      {...props}
    >
      {children}
    </code>
  ),
};

export const MarkdownRenderer: FC<MarkdownProps> = memo(
  ({ children, className, components, remarkPlugins = [], ...props }) => (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert",
        "max-w-none overflow-hidden break-words",
        "[&_pre]:bg-muted/50 [&_pre]:text-foreground", // Target pre elements specifically
        "[&_code]:text-foreground", // Ensure code text is always visible
        className
      )}
    >
      <ReactMarkdown
        components={{ ...defaultComponents, ...components }}
        remarkPlugins={remarkPlugins}
        {...props}
      >
        {children}
      </ReactMarkdown>
    </div>
  ),
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    prevProps.className === nextProps.className
);

MarkdownRenderer.displayName = "MarkdownRenderer";

// For backward compatibility
export const MemoizedReactMarkdown = MarkdownRenderer;
