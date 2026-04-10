"use client";

import clsx from "clsx";
import { createElement, isValidElement } from "react";
import type { ElementType, HTMLAttributes, ReactNode, SVGProps } from "react";

import { useCopyToClipboard } from "@/lib/hooks/use-copy-to-clipboard";

const CheckIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M1 6L5.28571 11L13 2"
      stroke="currentColor"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CopyIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M10.0909 9.72727H7.45455V12.3636H10.0909V9.72727ZM9.13636 1H3.90909C3.37364 1 2.86364 1.22727 2.5 1.59091C2.13636 1.95455 1.90909 2.46455 1.90909 3V8.22727H3.90909V3H9.13636V1ZM12.2727 3.90909V11.5455C12.2727 12.6 11.4182 13.4545 10.3636 13.4545H6C4.94545 13.4545 4.09091 12.6 4.09091 11.5455V3.90909C4.09091 2.85455 4.94545 2 6 2H10.3636C11.4182 2 12.2727 2.85455 12.2727 3.90909Z"
      fill="currentColor"
    />
  </svg>
);

function extractTextFromNode(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (node == null || typeof node === "boolean") {
    return "";
  }

  if (Array.isArray(node)) {
    return node.map(extractTextFromNode).join("");
  }

  if (!isValidElement(node)) {
    return "";
  }

  const props = node.props as {
    children?: ReactNode;
    className?: string;
  };

  if (props.className?.includes("remove")) {
    return "__line_removed_in_code__";
  }

  return extractTextFromNode(props.children);
}

type CodeBlockWrapperProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  children?: ReactNode;
  copyButtonClassName?: string;
};

export default function CodeBlockWrapper({
  className = "",
  copyButtonClassName = "",
  children,
  as: Tag = "figure",
  ...otherProps
}: CodeBlockWrapperProps) {
  const { isCopied, copy } = useCopyToClipboard(3000);

  const code = extractTextFromNode(children).replace(/(\n)?__line_removed_in_code__(\n)?/g, "");

  return createElement(
    Tag,
    {
      className: clsx("code-block group relative flex [&_pre]:min-w-full", className),
      ...otherProps,
    },
    <>
      {children}
      <button
        className={clsx(
          "invisible absolute right-2 top-2 rounded border border-gray-7 bg-gray-9 p-1.5  text-gray-new-80 opacity-0 transition-[background-color,opacity,visibility] duration-200 hover:bg-white group-hover:visible group-hover:opacity-100 dark:border-gray-3 dark:bg-gray-new-10 dark:text-gray-8 dark:hover:bg-gray-new-8 lg:visible lg:opacity-100",
          copyButtonClassName,
        )}
        type="button"
        aria-label={isCopied ? "Copied" : "Copy"}
        disabled={isCopied}
        onClick={() => void copy(code)}
      >
        {isCopied ? (
          <CheckIcon className="h-4 w-4 text-current" />
        ) : (
          <CopyIcon className="text-current" />
        )}
      </button>
    </>,
  );
}
