/**
 * Shared types for the Streamdown integration layer.
 *
 * Uses hast's `Element` type for the `node` prop that Streamdown passes
 * to component overrides (via react-markdown's ExtraProps).
 */

import type { ComponentPropsWithoutRef } from "react";
import type { Element } from "hast";

export type StreamdownPProps = ComponentPropsWithoutRef<"p"> & {
  node?: Element | undefined;
};

export type StreamdownLiProps = ComponentPropsWithoutRef<"li"> & {
  node?: Element | undefined;
};

export type StreamdownTdProps = ComponentPropsWithoutRef<"td"> & {
  node?: Element | undefined;
};

export type StreamdownThProps = ComponentPropsWithoutRef<"th"> & {
  node?: Element | undefined;
};

export type StreamdownBlockquoteProps =
  ComponentPropsWithoutRef<"blockquote"> & {
    node?: Element | undefined;
  };

export type StreamdownTableProps = ComponentPropsWithoutRef<"table"> & {
  node?: Element | undefined;
};

export type StreamdownPreProps = ComponentPropsWithoutRef<"pre"> & {
  node?: Element | undefined;
};

export type StreamdownAProps = ComponentPropsWithoutRef<"a"> & {
  node?: Element | undefined;
};

/**
 * Props for the StreamdownRenderer wrapper component.
 */
export type StreamdownRendererProps = {
  /** Raw markdown content (NOT pre-sanitized) */
  content: string;
  /** Whether the message is actively streaming */
  isStreaming: boolean;
  /** Citation sources attached to the message */
  sources: Array<{
    title: string;
    url: string;
    snippet?: string;
  }>;
  /** Unique message ID for keying */
  messageId: string;
  /** Additional CSS class for the container */
  className?: string;
};
