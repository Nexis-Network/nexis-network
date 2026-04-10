"use client";

import { cn } from "@/lib/utils";
import type { SVGProps } from "react";
import type { WorkbenchShellIconName } from "./types";

type WorkbenchIconProps = SVGProps<SVGSVGElement> & {
  name: WorkbenchShellIconName;
};

function BaseIcon({
  children,
  className,
  viewBox = "0 0 16 16",
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox={viewBox}
      className={cn("size-4 shrink-0", className)}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {children}
    </svg>
  );
}

export function WorkbenchIcon({ name, ...props }: WorkbenchIconProps) {
  switch (name) {
    case "panel":
    case "files":
      return (
        <BaseIcon {...props}>
          <path d="M2.5 3.25h4.25l1 1h5.75v8H2.5z" stroke="currentColor" strokeWidth="1.2" />
          <path d="M2.5 5.25h11" stroke="currentColor" strokeWidth="1.2" />
        </BaseIcon>
      );
    case "preview":
    case "web":
      return (
        <BaseIcon {...props}>
          <path d="M2.5 3.25h11v9.5h-11z" stroke="currentColor" strokeWidth="1.2" />
          <path d="M2.5 5.25h11" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="4.25" cy="4.25" r=".55" fill="currentColor" />
          <circle cx="6" cy="4.25" r=".55" fill="currentColor" />
        </BaseIcon>
      );
    case "code":
      return (
        <BaseIcon {...props}>
          <path
            d="M6.25 4.25L3.75 8l2.5 3.75M9.75 4.25L12.25 8l-2.5 3.75"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.2"
          />
        </BaseIcon>
      );
    case "terminal":
    case "logs":
      return (
        <BaseIcon {...props}>
          <path d="M2.5 3.5h11v9h-11z" stroke="currentColor" strokeWidth="1.2" />
          <path
            d="M4.25 6.25L5.9 8l-1.65 1.75M7.5 9.75h3.25"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.2"
          />
        </BaseIcon>
      );
    case "explorer":
      return (
        <BaseIcon {...props}>
          <path d="M3.25 3.5h4l1 1h4.5v8H3.25z" stroke="currentColor" strokeWidth="1.2" />
          <path d="M5.25 7.25h5.5M5.25 9.75h3.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
        </BaseIcon>
      );
    case "search":
      return (
        <BaseIcon {...props}>
          <circle cx="7" cy="7" r="3.25" stroke="currentColor" strokeWidth="1.2" />
          <path d="M9.6 9.6L12.5 12.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
        </BaseIcon>
      );
    case "extensions":
      return (
        <BaseIcon {...props}>
          <path
            d="M3 3.5h4v4H3zM9 3.5h4v4H9zM3 9.5h4v4H3zM9 9.5h4v4H9z"
            stroke="currentColor"
            strokeWidth="1.1"
          />
        </BaseIcon>
      );
    case "sparkles":
      return (
        <BaseIcon {...props}>
          <path
            d="M8 2.5l1.1 2.4L11.5 6 9.1 7.1 8 9.5 6.9 7.1 4.5 6l2.4-1.1L8 2.5zM12.25 10.25l.45 1 .95.45-.95.45-.45 1-.45-1-.95-.45.95-.45.45-1z"
            fill="currentColor"
          />
        </BaseIcon>
      );
    case "overflow":
      return (
        <BaseIcon {...props}>
          <circle cx="4" cy="8" r="1" fill="currentColor" />
          <circle cx="8" cy="8" r="1" fill="currentColor" />
          <circle cx="12" cy="8" r="1" fill="currentColor" />
        </BaseIcon>
      );
    case "tests":
      return (
        <BaseIcon {...props}>
          <path
            d="M5 3.25h6M6 3.25v2.1l-2.1 3.7A1.4 1.4 0 005.1 11.5h5.8a1.4 1.4 0 001.2-2.45L10 5.35v-2.1"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.2"
          />
        </BaseIcon>
      );
    case "contracts":
    case "pdf":
      return (
        <BaseIcon {...props}>
          <path d="M4 2.75h5l3 3v7.5H4z" stroke="currentColor" strokeWidth="1.2" />
          <path d="M9 2.75v3h3M5.5 8h5M5.5 10.25h4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
        </BaseIcon>
      );
    case "simulator":
      return (
        <BaseIcon {...props}>
          <path
            d="M3 4.25h2.5L7.5 6.5h2L11.5 8l1.5-1.25M11.5 3.5v3.25"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.2"
          />
          <circle cx="3" cy="4.25" r=".9" fill="currentColor" />
          <circle cx="7.5" cy="6.5" r=".9" fill="currentColor" />
          <circle cx="11.5" cy="8" r=".9" fill="currentColor" />
        </BaseIcon>
      );
    case "market":
      return (
        <BaseIcon {...props}>
          <path
            d="M3 11.5l3.2-3.2 2.1 2.1 4.2-4.2M9.75 6.25h2.75V9"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.2"
          />
        </BaseIcon>
      );
    case "status":
      return (
        <BaseIcon {...props}>
          <circle cx="5.25" cy="8" r="1.05" fill="currentColor" />
          <path d="M8.25 8h4.25M8.25 5.25h3M8.25 10.75h2.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
        </BaseIcon>
      );
    case "keyboard":
      return (
        <BaseIcon {...props}>
          <rect x="2.5" y="4" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M4.5 6.25h.8M6.25 6.25h.8M8 6.25h.8M9.75 6.25h.8M4.5 8.25h6.8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.1" />
        </BaseIcon>
      );
    case "bell":
      return (
        <BaseIcon {...props}>
          <path
            d="M8 3.25a2.2 2.2 0 00-2.2 2.2v1.1c0 .5-.14 1-.4 1.42L4.5 9.5h7l-.9-1.53c-.26-.42-.4-.92-.4-1.42v-1.1A2.2 2.2 0 008 3.25zM6.75 11.5a1.25 1.25 0 002.5 0"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.2"
          />
        </BaseIcon>
      );
    case "close":
      return (
        <BaseIcon {...props}>
          <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
        </BaseIcon>
      );
    default:
      return null;
  }
}

export function WorkbenchEmptyLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <BaseIcon viewBox="0 0 42 42" className="size-10" {...props}>
      <path
        d="M21 6.5c5.1 0 9.25 4.15 9.25 9.25 0 3.38-1.82 6.32-4.54 7.94-.36.22-.82-.09-.74-.5.15-.72.23-1.46.23-2.23 0-5.73-4.64-10.37-10.37-10.37-.77 0-1.51.08-2.22.23-.42.09-.73-.38-.51-.74A9.2 9.2 0 0121 6.5z"
        fill="currentColor"
        opacity=".85"
      />
      <path
        d="M21 35.5c-5.1 0-9.25-4.15-9.25-9.25 0-3.38 1.82-6.32 4.54-7.94.36-.22.82.09.74.5-.15.72-.23 1.46-.23 2.23 0 5.73 4.64 10.37 10.37 10.37.77 0 1.51-.08 2.22-.23.42-.09.73.38.51.74A9.2 9.2 0 0121 35.5z"
        fill="currentColor"
        opacity=".45"
      />
    </BaseIcon>
  );
}
