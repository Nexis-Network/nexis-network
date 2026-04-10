"use client";

import { memo, useMemo } from "react";
import { Streamdown } from "streamdown";
import { mermaidConfig, shikiTheme } from "./plugins";
import { streamdownControls } from "./controls";
import { createStreamdownComponents } from "./components";
import type { StreamdownRendererProps } from "./types";
import { isTrustedUrl } from "./security";

/**
 * StreamdownRenderer
 *
 * Production-hardened Streamdown wrapper that wires:
 * - Custom component overrides (citations, artifacts, link safety)
 * - Dark-themed Shiki syntax highlighting
 * - Mermaid diagram rendering with dark theme
 * - Interactive controls (copy, download, fullscreen)
 * - Streaming animation (isAnimating + parseIncompleteMarkdown)
 *
 * Security: Streamdown v1.6.11's default pipeline already includes
 * rehype-sanitize + rehype-harden. The custom `a` component override
 * adds defense-in-depth URL filtering via safeUrlTransform.
 *
 * IMPORTANT: Pass raw markdown content — do NOT pre-sanitize with
 * DOMPurify. DOMPurify corrupts markdown syntax (e.g. mangling `>` in
 * blockquotes, stripping `[](url)` links). Streamdown sanitizes at the
 * AST level after markdown parsing, which is both safer and lossless.
 */
export const StreamdownRenderer = memo(function StreamdownRenderer({
  content,
  isStreaming,
  sources,
  messageId,
  className,
}: StreamdownRendererProps) {
  const components = useMemo(
    () => createStreamdownComponents(sources, messageId),
    [sources, messageId],
  );

  return (
    <Streamdown
      className={className}
      isAnimating={isStreaming}
      // @ts-expect-error Streamdown's types are out of sync with its docs for `animated`
      animated={{ animation: "slideUp" }}
      mode={isStreaming ? "streaming" : "static"}
      parseIncompleteMarkdown
      components={components}
      shikiTheme={shikiTheme}
      mermaid={mermaidConfig}
      controls={streamdownControls}
      linkSafety={{
        enabled: true,
        onLinkCheck: (url: string) => isTrustedUrl(url), // Safelist trusted domains
      }}
    >
      {content}
    </Streamdown>
  );
});
