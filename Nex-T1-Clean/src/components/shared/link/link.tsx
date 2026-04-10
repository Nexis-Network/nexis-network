"use client";

import clsx from "clsx";
import NextLink from "next/link";
import { forwardRef } from "react";
import type { AnchorHTMLAttributes, MouseEvent, ReactNode, SVGProps } from "react";

import getNodeText from "utils/get-node-text";
import sendGtagEvent from "utils/send-gtag-event";

const ArrowRightIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg width="16" height="8" viewBox="0 0 16 8" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M1 4H15M15 4L12 1M15 4L12 7"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ExternalIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <rect width="12" height="12" rx="2" fill="currentColor" opacity="0.2" />
    <path d="M8.49891 7.61585V3.49609H4.37915" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8.25034 3.75006L3.5 8.5004" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const GlossaryIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M6.00031 10.4599C6.12542 10.4599 6.2498 10.4268 6.36388 10.3613C6.8371 10.0882 7.63856 9.73792 8.67554 9.73939C9.33717 9.74013 9.90239 9.88437 10.3462 10.0595C10.8231 10.2472 11.3353 9.8829 11.3353 9.36994V2.68518C11.3353 2.42465 11.2021 2.18472 10.9776 2.05225C10.5088 1.77553 9.70736 1.41711 8.6667 1.41711C7.27573 1.41711 6.31309 2.05887 5.99957 2.28702"
      stroke="currentColor"
      strokeWidth="0.883156"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6.00016 10.4598C5.87505 10.4598 5.75067 10.4267 5.63659 10.3612C5.16337 10.0881 4.36191 9.73779 3.32493 9.73926C2.6633 9.74 2.09808 9.88425 1.6543 10.0594C1.17739 10.2471 0.665161 9.88498 0.665161 9.37275C0.665161 7.4644 0.665161 3.87363 0.665161 2.68285C0.665161 2.42231 0.79837 2.18533 1.02284 2.05286C1.49165 1.77614 2.29311 1.41772 3.33376 1.41772C4.72474 1.41772 5.68738 2.05948 6.0009 2.28763V10.4598H6.00016Z"
      stroke="currentColor"
      strokeWidth="0.883156"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const underlineCommonStyles =
  "relative cursor-pointer transition-colors duration-500 before:absolute before:-bottom-1.5 before:left-0 before:h-1.5 before:w-full before:transition-all before:duration-500 hover:before:bottom-full hover:before:opacity-0 before:pointer-events-none";

const styles = {
  base: "inline-flex !leading-none items-center",
  size: {
    lg: "t-2xl font-semibold",
    md: "t-xl font-semibold",
    sm: "t-lg",
    xs: "t-base",
    "2xs": "t-sm",
  },
  theme: {
    black:
      "text-black transition-colors duration-200 hover:text-primary-2 dark:text-white dark:hover:text-primary-2",
    "black-no-hover": "text-black",
    white: "text-white transition-colors duration-200 hover:text-primary-2",
    "black-primary-1": `${underlineCommonStyles} before:bg-primary-1 hover:text-primary-1 dark:before:bg-primary-1 dark:text-white dark:hover:text-primary-1`,
    "black-secondary-3": `${underlineCommonStyles} before:bg-secondary-3 hover:text-secondary-3`,
    "black-secondary-5": `${underlineCommonStyles} before:bg-secondary-5 hover:text-secondary-5`,
    "underline-primary-1":
      "text-primary-1 border-b-2 border-primary-1 transition-colors duration-200 hover:border-transparent",
    blue: "text-blue-80 transition-colors duration-200 hover:text-[#C6EAF1]",
    green: "text-green-45 transition-colors duration-200 hover:text-[#00FFAA]",
    "blue-green":
      "text-secondary-8 transition-colors duration-200 hover:text-secondary-7 dark:text-green-45 dark:hover:text-[#00FFAA]",
    "green-underlined":
      "underline decoration-green-45/40 hover:decoration-green-45/100 text-green-45 transition-colors duration-500",
    "gray-30": "text-gray-new-30 transition-colors duration-200 hover:text-green-45",
    "white-underlined":
      "underline decoration-white/40 hover:decoration-white/100 text-white transition-colors duration-500",
    "gray-50": "text-gray-new-50 transition-colors duration-200 hover:text-green-45",
    "gray-70":
      "text-gray-new-70 dark:text-gray-new-70 transition-colors duration-200 hover:text-green-45",
    "grey-70-underlined":
      "underline underline-offset-4 decoration-gray-new-70/40 hover:decoration-gray-new-70/100 text-gray-new-70 transition-colors duration-500",
    "gray-80": "text-gray-new-80 transition-colors duration-200 hover:text-green-45",
    "gray-90": "text-gray-new-90 transition-colors duration-200 hover:text-green-45",
  },
} as const;

const icons = {
  external: ExternalIcon,
  glossary: GlossaryIcon,
} as const;

type LinkSize = keyof typeof styles.size;
type LinkTheme = keyof typeof styles.theme;
type LinkIcon = keyof typeof icons;

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "href"> & {
  children: ReactNode;
  className?: string;
  to?: string | null;
  size?: LinkSize | null;
  theme?: LinkTheme | null;
  withArrow?: boolean;
  icon?: LinkIcon | null;
  tagName?: string | null;
  tagText?: string | null;
  prefetch?: boolean;
  isExternal?: boolean;
};

const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  {
    className: additionalClassName,
    size = null,
    theme = null,
    to = null,
    withArrow = false,
    icon = null,
    tagName = null,
    tagText = null,
    children,
    prefetch,
    isExternal = false,
    onClick,
    ...props
  },
  ref,
) {
  const className = clsx(
    size && theme && styles.base,
    size ? styles.size[size] : undefined,
    theme ? styles.theme[theme] : undefined,
    additionalClassName,
    (withArrow || icon) && "group inline-flex w-fit items-center gap-1",
  );

  const Icon = icon ? icons[icon] : null;

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || !tagName) {
      return;
    }

    sendGtagEvent("Link clicked", {
      style: theme,
      text: tagText || getNodeText(children),
      tag_name: tagName,
    });
  };

  const content = (
    <>
      {withArrow ? <span>{children}</span> : children}
      {withArrow && (
        <ArrowRightIcon className="-mb-px shrink-0 transition-transform duration-200 group-hover:translate-x-[3px]" />
      )}
      {Icon && <Icon className="-mb-px shrink-0" />}
    </>
  );

  if (to?.includes("#")) {
    return (
      <a className={className} href={to} ref={ref} onClick={handleClick} {...props}>
        {content}
      </a>
    );
  }

  if (to?.startsWith("/")) {
    return (
      <NextLink
        className={className}
        href={to}
        ref={ref}
        prefetch={prefetch}
        onClick={handleClick}
        {...props}
      >
        {content}
      </NextLink>
    );
  }

  return (
    <a
      className={className}
      href={to ?? undefined}
      ref={ref}
      onClick={handleClick}
      {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : undefined)}
      {...props}
    >
      {content}
    </a>
  );
});

export default Link;
