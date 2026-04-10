"use client";

import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";
import type { Plugin } from "unified";
import type { Components } from "react-markdown";

import { MarkdownRenderer } from "@/components/shared/markdown/markdown-renderer";
import {
  InlineCitation,
  InlineCitationCard,
  InlineCitationCardBody,
  InlineCitationCardTrigger,
  InlineCitationCarousel,
  InlineCitationCarouselContent,
  InlineCitationCarouselHeader,
  InlineCitationCarouselIndex,
  InlineCitationCarouselItem,
  InlineCitationCarouselNext,
  InlineCitationCarouselPrev,
  InlineCitationSource,
  InlineCitationText,
} from "@/components/dashboard/lazy-components";
import type { Source } from "@/lib/schema";
import { cn } from "@/lib/utils";

export const createKeyGenerator = (prefix = "fragment") => {
  let counter = 0;
  return () => {
    return `${prefix}-${counter++}`;
  };
};

const createInlineCitationPlugin = (): Plugin => {
  return () => (tree: UntypedJson) => {
    visit(
      tree as UntypedJson as { type: string; value?: string; children?: UntypedJson[] },
      "text",
      (node: { value?: string }, index: number | null, parent: { children?: UntypedJson[] }) => {
        if (!parent?.children || typeof index !== "number") {
          return;
        }

        const value = node.value ?? "";
        if (!value || !value.includes("[s")) {
          return;
        }

        const regex = /\[s(\d+)\]/gi;
        const newChildren: UntypedJson[] = [];
        let lastIndex = 0;
        let match: RegExpExecArray | null;
        regex.lastIndex = 0;

        while ((match = regex.exec(value)) !== null) {
          const matchIndex = match.index ?? 0;
          if (matchIndex > lastIndex) {
            newChildren.push({
              type: "text",
              value: value.slice(lastIndex, matchIndex),
            });
          }

          const citationNumber = match[1];
          newChildren.push({
            type: "link",
            url: `citation:${citationNumber}`,
            children: [
              {
                type: "text",
                value: `[s${citationNumber}]`,
              },
            ],
          });

          lastIndex = regex.lastIndex;
        }

        if (newChildren.length > 0) {
          if (lastIndex < value.length) {
            newChildren.push({
              type: "text",
              value: value.slice(lastIndex),
            });
          }
          parent.children.splice(index, 1, ...newChildren);
          return index + newChildren.length;
        }
      },
    );
  };
};

const findSourceByIndex = (sources: Source[], index: number): Source | undefined => {
  if (!Number.isFinite(index) || index <= 0) {
    return undefined;
  }
  const sourceId = `s${index}`;
  return sources.find((source) => source.id === sourceId) ?? sources[index - 1];
};

const createMarkdownComponents = (sources: Source[]): Components => ({
  a: ({ href, children, ...props }) => {
    if (href?.startsWith("citation:")) {
      const citationIndex = Number(href.replace("citation:", ""));
      const source = findSourceByIndex(sources, citationIndex);
      if (!source) {
        return <span className="align-super text-[11px] text-muted-foreground">[{`s${citationIndex}`}]</span>;
      }

      return (
        <InlineCitation>
          <InlineCitationText>[{source.id ?? `s${citationIndex}`}]</InlineCitationText>
          <InlineCitationCard>
            <InlineCitationCardTrigger sources={[source.url]} className="ml-1" />
            <InlineCitationCardBody>
              <InlineCitationCarousel>
                <InlineCitationCarouselHeader>
                  <InlineCitationCarouselPrev />
                  <InlineCitationCarouselIndex />
                  <InlineCitationCarouselNext />
                </InlineCitationCarouselHeader>
                <InlineCitationCarouselContent>
                  <InlineCitationCarouselItem>
                    <InlineCitationSource
                      title={source.title}
                      url={source.url}
                      description={source.snippet}
                    />
                  </InlineCitationCarouselItem>
                </InlineCitationCarouselContent>
              </InlineCitationCarousel>
            </InlineCitationCardBody>
          </InlineCitationCard>
        </InlineCitation>
      );
    }

    return (
      <a
        {...props}
        href={href}
        className="text-primary underline decoration-dotted underline-offset-4 hover:text-primary/80"
        rel="noreferrer"
        target="_blank"
      >
        {children}
      </a>
    );
  },
  table: ({ children, ...props }) => (
    <div className="overflow-hidden rounded-lg border border-border/40 bg-background/70">
      <table
        {...props}
        className="w-full min-w-full table-auto text-sm text-muted-foreground [&_th]:text-left"
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead
      {...props}
      className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground/80"
    >
      {children}
    </thead>
  ),
  tbody: ({ children, ...props }) => (
    <tbody {...props} className="divide-y divide-border/30 text-sm">
      {children}
    </tbody>
  ),
  th: ({ children, ...props }) => (
    <th {...props} className="px-3 py-2 font-regular">
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td {...props} className="px-3 py-2 align-top">
      {children}
    </td>
  ),
});

export const renderContentWithCitations = (
  content: string | undefined,
  sources: Source[],
) => {
  if (!content) {
    return null;
  }

  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return null;
  }

  return (
    <MarkdownRenderer
      className={cn(
        "space-y-3 text-sm leading-relaxed text-muted-foreground",
        "[&_p]:mb-2 [&_p]:mt-0",
        "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal",
      )}
      remarkPlugins={[remarkGfm, createInlineCitationPlugin()]}
      components={createMarkdownComponents(sources)}
    >
      {normalized}
    </MarkdownRenderer>
  );
};
