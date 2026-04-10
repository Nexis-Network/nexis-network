/**
 * Streamdown Custom Component Overrides
 *
 * Provides custom rendering for markdown elements, specifically:
 * - Inline citation detection and rendering in p, li, td, th, blockquote
 * - Artifact detection in pre/code blocks (tokens, research, transactions, etc.)
 * - Incomplete link handling during streaming
 *
 * Extracted from assistant-message.tsx for reuse and testability.
 */

import {
  Fragment,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { tryParseArtifact } from "@/components/chat/message/artifact-parser";
import { TokenArtifact } from "@/components/artifacts/features/trading/token-artifact";
import { ResearchArtifact } from "@/components/artifacts/features/general/research-artifact";
import { TransactionSimulationArtifact } from "@/components/artifacts/features/trading/transaction-simulation-artifact";
import { PortfolioAnalysisArtifact } from "@/components/artifacts/features/analysis/portfolio-analysis-artifact";
import { StakingPositionsArtifact } from "@/components/artifacts/features/analysis/staking-positions-artifact";
import { CombinedHoldingsArtifact } from "@/components/artifacts/features/analysis/combined-holdings-artifact";
import { AgentDaosArtifact } from "@/components/artifacts/features/analysis/agent-daos-artifact";
import { PumpFunArtifact } from "@/components/artifacts/features/trading/pump-fun-artifact";
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
import {
  Artifact,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactContent,
  ArtifactActions,
} from "@/components/ai-elements/artifact";
import {
  CodeBlock,
  CodeBlockCopyButton,
} from "@/components/ai-elements/code-block";
import { TerminalIcon, ExternalLinkIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CoinGeckoMentionLink } from "@/components/ai-elements/token-mention";
import { extractCoinGeckoIdFromHref } from "@/components/chat-composer/token-mentions";
import { SourceCard } from "@/components/sources/source-card";
import { getSourceDisplayName } from "@/components/sources/source-metadata";
import { cn } from "@/lib/utils";
import { isTrustedUrl } from "./security";
import {
  parseTextWithInlineCitations,
  type ConversationSource,
} from "./citation-parser";


import type {
  StreamdownAProps,
  StreamdownPProps,
  StreamdownLiProps,
  StreamdownTdProps,
  StreamdownThProps,
  StreamdownBlockquoteProps,
  StreamdownTableProps,
  StreamdownPreProps,
} from "./types";

// ---------------------------------------------------------------------------
// Citation rendering helpers
// ---------------------------------------------------------------------------

const PROVENANCE_LINE_REGEX = /^_?\s*sources?\s*:\s*(.+?)\s*_?\.?$/i;

const normalizeComparableText = (value: string | undefined): string =>
  (value ?? "")
    .toLowerCase()
    .replace(/[*_`]+/g, " ")
    .replace(/[()[\]{}]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const resolveProvenanceSources = (
  rawText: string,
  sources: ConversationSource[],
): ConversationSource[] => {
  const normalizedText = normalizeComparableText(rawText);
  if (!normalizedText) {
    return [];
  }

  const matched = sources.filter((source) => {
    const candidates = [
      source.title,
      getSourceDisplayName({ title: source.title, url: source.url }),
      source.url,
    ];

    return candidates.some((candidate) => {
      const normalizedCandidate = normalizeComparableText(candidate);
      return (
        normalizedCandidate.length > 0 &&
        (normalizedText.includes(normalizedCandidate) ||
          normalizedCandidate.includes(normalizedText))
      );
    });
  });

  if (matched.length > 0) {
    return matched;
  }

  return sources.length > 0 ? sources.slice(0, 1) : [];
};

const renderProvenanceBlock = (
  text: string,
  sources: ConversationSource[],
): ReactNode | null => {
  const match = text.match(PROVENANCE_LINE_REGEX);
  if (!match) {
    return null;
  }

  const provenanceSources = resolveProvenanceSources(match[1], sources);
  if (provenanceSources.length === 0) {
    return null;
  }

  return (
    <div className="my-3 flex max-w-xl flex-col gap-2">
      {provenanceSources.map((source, index) => (
        <SourceCard
          key={`${source.url}-${index}`}
          description={source.snippet}
          href={source.url}
          title={source.title}
        />
      ))}
    </div>
  );
};

const renderTextWithInlineCitations = (
  text: string,
  sources: ConversationSource[],
  keyPrefix: string,
): ReactNode[] => {
  const parts: ReactNode[] = [];
  let key = 0;

  for (const segment of parseTextWithInlineCitations(text, sources)) {
    if (segment.type === "text") {
      if (segment.value.length > 0) {
        parts.push(segment.value);
      }
      continue;
    }

    if (segment.sources.length > 0) {
      parts.push(
        <InlineCitation
          key={`${keyPrefix}-cite-${key++}`}
          className="ml-1 inline-flex items-center align-super text-xs"
        >
          <InlineCitationCard>
            <InlineCitationCardTrigger
              sources={segment.sources.map((source) => source.url)}
            />
            <InlineCitationCardBody>
              <InlineCitationCarousel>
                <InlineCitationCarouselHeader>
                  <InlineCitationCarouselPrev />
                  <InlineCitationCarouselIndex />
                  <InlineCitationCarouselNext />
                </InlineCitationCarouselHeader>
                <InlineCitationCarouselContent>
                  {segment.sources.map((source, index) => (
                    <InlineCitationCarouselItem
                      key={`${source.url}-${index}`}
                    >
                      <InlineCitationSource
                        title={source.title}
                        url={source.url}
                        description={source.snippet}
                      />
                    </InlineCitationCarouselItem>
                  ))}
                </InlineCitationCarouselContent>
              </InlineCitationCarousel>
            </InlineCitationCardBody>
          </InlineCitationCard>
          <InlineCitationText className="ml-1">
            [{segment.sources.map((_, i) => i + 1).join(", ")}]
          </InlineCitationText>
        </InlineCitation>,
      );
    }
  }

  return parts;
};

const getTextContent = (children: ReactNode): string => {
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }

  if (Array.isArray(children)) {
    return children.map((child) => getTextContent(child)).join("");
  }

  if (isValidElement(children)) {
    return getTextContent(
      (children as ReactElement<{ children?: ReactNode }>).props.children,
    );
  }

  return "";
};

const renderNodeWithInlineCitations = (
  node: ReactNode,
  sources: ConversationSource[],
  keyPrefix: string,
): ReactNode => {
  if (typeof node === "string") {
    return renderTextWithInlineCitations(node, sources, keyPrefix);
  }

  if (Array.isArray(node)) {
    return node.map((child, index) => (
      <Fragment key={`${keyPrefix}-${index}`}>
        {renderNodeWithInlineCitations(
          child,
          sources,
          `${keyPrefix}-${index}`,
        )}
      </Fragment>
    ));
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    const childProps = node.props;
    if (!childProps?.children) {
      return node;
    }

    return cloneElement(node as ReactElement<{ children?: ReactNode }>, {
      children: renderNodeWithInlineCitations(
        childProps.children,
        sources,
        keyPrefix,
      ),
    });
  }

  return node;
};

// ---------------------------------------------------------------------------
// Artifact rendering (code block to rich component)
// ---------------------------------------------------------------------------

function renderArtifactFromCode(code: string, language: string): ReactNode {
  if (language === "json" || language === "plaintext") {
    const artifact = tryParseArtifact(code);
    if (artifact) {
      switch (artifact.type) {
        case "token":
          return (
            <div className="my-4 max-w-md">
              <TokenArtifact data={artifact.data} />
            </div>
          );
        case "research":
          return (
            <div className="my-4 max-w-2xl">
              <ResearchArtifact data={artifact.data} />
            </div>
          );
        case "transaction":
          return (
            <div className="my-4 max-w-xl">
              <TransactionSimulationArtifact data={artifact.data} />
            </div>
          );
        case "burn_rate":
          return (
            <div className="my-2 flex items-center gap-2 rounded-md border border-border/50 bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                Burn Rate Analysis generated in side panel
              </span>
            </div>
          );
        case "portfolio":
          return (
            <div className="my-4 max-w-xl">
              <PortfolioAnalysisArtifact data={artifact.data} />
            </div>
          );
        case "staking":
          return (
            <div className="my-4 max-w-2xl">
              <StakingPositionsArtifact data={artifact.data} />
            </div>
          );
        case "holdings":
          return (
            <div className="my-4 max-w-xl">
              <CombinedHoldingsArtifact data={artifact.data} />
            </div>
          );
        case "daos":
          return (
            <div className="my-4 max-w-3xl">
              <AgentDaosArtifact data={artifact.data} />
            </div>
          );
        case "pump_fun":
          return (
            <div className="my-4 max-w-xl">
              <PumpFunArtifact data={artifact.data} />
            </div>
          );
        case "table":
          return (
            <div className="my-2 flex items-center gap-2 rounded-md border border-border/50 bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                Spreadsheet Editor opened in side panel
              </span>
            </div>
          );
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Component factory
// ---------------------------------------------------------------------------

/**
 * Creates the Streamdown custom component overrides for a message.
 * Memoize the result keyed on [sources, messageId].
 */
export const createStreamdownComponents = (
  sources: ConversationSource[],
  messageId: string,
) => ({
  // Inline citation support for text elements
  p: ({ children, node: _node, className, ...props }: StreamdownPProps) => {
    const textContent = getTextContent(children).trim();
    const provenanceBlock = renderProvenanceBlock(textContent, sources);
    if (provenanceBlock) {
      return (
        <div {...props} className={className}>
          {provenanceBlock}
        </div>
      );
    }

    return (
      <div {...props} className={className}>
        {renderNodeWithInlineCitations(children, sources, `${messageId}-p`)}
      </div>
    );
  },
  li: ({ children, node: _node, ...props }: StreamdownLiProps) => (
    <li {...props}>
      {renderNodeWithInlineCitations(children, sources, `${messageId}-li`)}
    </li>
  ),
  td: ({ children, node: _node, ...props }: StreamdownTdProps) => (
    <td {...props}>
      {renderNodeWithInlineCitations(children, sources, `${messageId}-td`)}
    </td>
  ),
  th: ({ children, node: _node, ...props }: StreamdownThProps) => (
    <th {...props}>
      {renderNodeWithInlineCitations(children, sources, `${messageId}-th`)}
    </th>
  ),
  blockquote: ({
    children,
    node: _node,
    ...props
  }: StreamdownBlockquoteProps) => (
    <blockquote {...props}>
      {renderNodeWithInlineCitations(
        children,
        sources,
        `${messageId}-blockquote`,
      )}
    </blockquote>
  ),
  table: ({
    children,
    node: _node,
    className,
    ...props
  }: StreamdownTableProps) => (
    <div className="max-w-full overflow-x-auto">
      <table {...props} className={className}>
        {children}
      </table>
    </div>
  ),

  // Code blocks: detect artifacts, otherwise render with CodeBlock component
  pre: ({ children, ...props }: StreamdownPreProps) => {
    const childArray = Array.isArray(children)
      ? children
      : children !== undefined
        ? [children]
        : [];
    const child = childArray[0];

    if (
      isValidElement<{ className?: string; children?: ReactNode }>(child) &&
      (child.type === "code" || child.props.className?.includes("language-"))
    ) {
      const { className, children: codeContent } = child.props;
      const language =
        typeof className === "string"
          ? className.replace("language-", "")
          : "plaintext";
      const code = String(codeContent).replace(/\n$/, "");

      // Try artifact detection first
      const artifactEl = renderArtifactFromCode(code, language);
      if (artifactEl) return artifactEl;

      // Render as code block with our Artifact chrome
      return (
        <Artifact className="my-4">
          <ArtifactHeader>
            <div className="flex items-center gap-2">
              <TerminalIcon className="size-4 text-muted-foreground" />
              <ArtifactTitle>{language}</ArtifactTitle>
            </div>
            <ArtifactActions />
          </ArtifactHeader>
          <ArtifactContent className="p-0">
            <CodeBlock
              code={code}
              language={language}
              className="border-none rounded-none"
            >
              <CodeBlockCopyButton />
            </CodeBlock>
          </ArtifactContent>
        </Artifact>
      );
    }

    return (
      <pre
        {...props}
        className="my-3 overflow-x-auto rounded-lg border border-[rgba(232,232,227,0.10)] bg-[rgba(87,101,96,0.10)] p-3"
      >
        {children}
      </pre>
    );
  },

  // Link safety override
  a: ({ children, href, node: _node, ...props }: StreamdownAProps) => {
    // 1) Link generated while streaming (href is purely text content temporarily)
    if (!href) {
      return (
        <span className="text-muted-foreground opacity-50 cursor-progress">
          {children}
        </span>
      );
    }

    const coinGeckoId = extractCoinGeckoIdFromHref(href);
    if (coinGeckoId) {
      const label = getTextContent(children).trim() || coinGeckoId;
      return <CoinGeckoMentionLink id={coinGeckoId} label={label} />;
    }

    const isExternal = /^https?:\/\//i.test(href);
    const linkClasses =
      "text-blue-400 hover:text-blue-300 transition-colors underline decoration-blue-400/30 hover:decoration-blue-400";

    // 2) Internal links
    if (!isExternal) {
      return (
        <a href={href} className={linkClasses} {...props}>
          {children}
        </a>
      );
    }

    // 3) External links (safety check)
    // We remove safeUrlTransform as Streamdown sanitizes the AST already.
    const trusted = isTrustedUrl(href);

    if (trusted) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClasses}
          {...props}
        >
          {children}
        </a>
      );
    }

    // Unsafe external: Warn user via AlertDialog
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            type="button"
            className={cn(
              linkClasses,
              "inline-flex items-center gap-1 cursor-pointer",
            )}
            title={`External link: ${href}`}
          >
            {children}
            <ExternalLinkIcon className="inline size-3" />
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>External Link Warning</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to leave the application and visit an external
              website. Please verify the link is safe before proceeding.
            </AlertDialogDescription>
            <div className="mt-4 rounded-md bg-muted p-3">
              <code className="text-xs break-all text-muted-foreground">
                {href}
              </code>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <a href={href} target="_blank" rel="noopener noreferrer">
                Continue to Site
              </a>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  },
});
