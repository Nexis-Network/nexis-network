import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({
  content,
  className,
}: MarkdownRendererProps) {
  return (
    <div
      className={cn(
        "prose prose-neutral max-w-none prose-headings:font-normal text-xs leading-relaxed prose-headings:tracking-tight",
        "prose-h1:font-medium prose-h2:font-medium prose-h3:font-medium prose-h1:text-base prose-h2:text-sm prose-h3:text-xs prose-h4:text-xs",
        "prose-p:my-2.5 prose-a:font-normal prose-a:text-foreground prose-a:decoration-border/60 prose-a:underline-offset-4 hover:prose-a:decoration-border",
        "prose-strong:font-medium prose-strong:text-foreground",
        "prose-li:my-0.5 prose-ol:my-2.5 prose-ul:my-2.5",
        "prose-code:rounded-sm prose-code:bg-muted/40 prose-code:px-1 prose-code:py-0.5 prose-code:text-[10px] prose-code:text-foreground prose-code:before:content-none prose-code:after:content-none",
        "prose-pre:rounded-md prose-pre:bg-muted/30 prose-pre:px-3 prose-pre:py-2 prose-pre:text-foreground",
        "prose-blockquote:border-l prose-blockquote:border-l-border/40 prose-blockquote:pl-3 prose-blockquote:font-normal prose-blockquote:text-muted-foreground prose-blockquote:italic prose-blockquote:not-italic",
        "prose-hr:my-4 prose-hr:border-border/40",
        "prose-img:rounded-md",
        "prose-table:border prose-table:border-border/40 prose-table:text-[10px]",
        "prose-th:border prose-th:border-border/40 prose-th:bg-muted/20 prose-th:p-2",
        "prose-td:border prose-td:border-border/40 prose-td:p-2",
        className
      )}
    >
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
