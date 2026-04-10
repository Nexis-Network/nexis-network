import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

function flattenText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(flattenText).join("");
  }

  if (node && typeof node === "object" && "props" in node) {
    return flattenText((node as { props?: { children?: ReactNode } }).props?.children ?? "");
  }

  return "";
}

function headingId(children: ReactNode) {
  return flattenText(children)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function DocsMarkdown({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "prose max-w-none dark:prose-invert",
        "prose-p:text-muted-foreground prose-p:leading-7",
        "prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-foreground",
        "prose-h2:mt-10 prose-h2:scroll-mt-24 prose-h2:text-[1.18rem] sm:prose-h2:text-[1.28rem] md:prose-h2:text-[1.35rem]",
        "prose-h3:mt-8 prose-h3:text-lg",
        "prose-strong:text-foreground",
        "prose-a:text-foreground prose-a:decoration-foreground/20 prose-a:underline-offset-4 hover:prose-a:decoration-foreground/60",
        "prose-ul:my-4 prose-ol:my-4 prose-li:my-2 prose-li:text-muted-foreground",
        "prose-blockquote:rounded-lg prose-blockquote:border prose-blockquote:border-border/60 prose-blockquote:bg-muted/40 prose-blockquote:px-4 prose-blockquote:py-3 prose-blockquote:text-muted-foreground",
        "prose-hr:border-border/60",
        "prose-code:rounded prose-code:bg-muted/40 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[0.9em] prose-code:text-foreground prose-code:before:content-none prose-code:after:content-none",
        "prose-pre:overflow-x-auto prose-pre:rounded-lg prose-pre:border prose-pre:border-border/60 prose-pre:bg-muted/50 prose-pre:px-4 prose-pre:py-4 prose-pre:text-foreground",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children, ...props }) => (
            <h2 id={headingId(children)} {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 id={headingId(children)} {...props}>
              {children}
            </h3>
          ),
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto rounded-lg border border-border/60 bg-muted/40">
              <table className="min-w-full border-collapse text-sm" {...props}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children, ...props }) => (
            <thead className="bg-muted/40 text-left text-muted-foreground" {...props}>
              {children}
            </thead>
          ),
          tbody: ({ children, ...props }) => (
            <tbody className="[&_tr:last-child]:border-b-0" {...props}>
              {children}
            </tbody>
          ),
          tr: ({ children, ...props }) => (
            <tr className="border-b border-border/60 align-top" {...props}>
              {children}
            </tr>
          ),
          th: ({ children, ...props }) => (
            <th className="px-4 py-3 font-medium" {...props}>
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="px-4 py-3 text-foreground/80" {...props}>
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
