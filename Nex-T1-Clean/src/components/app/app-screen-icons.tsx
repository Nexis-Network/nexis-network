import type { CSSProperties } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

type AppScreenIconProps = {
  className?: string;
  size?: number;
  alt?: string;
  style?: CSSProperties;
  tone?: "light" | "dark";
};

type InternalIconProps = AppScreenIconProps & {
  src: string | Record<"light" | "dark", string>;
  fallbackAlt: string;
};

function AppScreenIcon({
  src,
  fallbackAlt,
  className,
  size = 16,
  alt,
  style,
  tone = "light",
}: InternalIconProps) {
  const resolvedSrc = typeof src === "string" ? src : src[tone];

  return (
    <Image
      src={resolvedSrc}
      alt={alt ?? fallbackAlt}
      width={size}
      height={size}
      className={cn("shrink-0 object-contain", className)}
      style={style}
    />
  );
}

export function NewMessageIcon(props: AppScreenIconProps) {
  return (
    <AppScreenIcon
      src="/assets/interface/new-message.svg"
      fallbackAlt="New message"
      {...props}
    />
  );
}

export function ChatHistoryIcon(props: AppScreenIconProps) {
  return (
    <AppScreenIcon
      src="/assets/interface/Messages.svg"
      fallbackAlt="Chat history"
      {...props}
    />
  );
}

export function TasksIcon(props: AppScreenIconProps) {
  return (
    <AppScreenIcon
      src="/assets/interface/time.svg"
      fallbackAlt="Tasks"
      {...props}
    />
  );
}

export function DiscordIcon(props: AppScreenIconProps) {
  return (
    <AppScreenIcon
      src={{
        light: "/assets/social-icons/Discord-light.svg",
        dark: "/assets/social-icons/Discord-dark.svg",
      }}
      fallbackAlt="Discord"
      {...props}
    />
  );
}

export function XIcon(props: AppScreenIconProps) {
  return (
    <AppScreenIcon
      src="/assets/social-icons/x-light.svg"
      fallbackAlt="X"
      {...props}
    />
  );
}

export function YoutubeIcon(props: AppScreenIconProps) {
  return (
    <AppScreenIcon
      src={{
        light: "/assets/social-icons/Youtube-light.svg",
        dark: "/assets/social-icons/Youtube-dark.svg",
      }}
      fallbackAlt="YouTube"
      {...props}
    />
  );
}

export function GitHubIcon(props: AppScreenIconProps) {
  return (
    <AppScreenIcon
      src="/assets/social-icons/github-light.svg"
      fallbackAlt="GitHub"
      {...props}
    />
  );
}

export function AppleAppStoreIcon(props: AppScreenIconProps) {
  return (
    <AppScreenIcon
      src={{
        light: "/assets/social-icons/Apple-Appstore-light.svg",
        dark: "/assets/social-icons/Apple-Appstore-dark.svg",
      }}
      fallbackAlt="Apple App Store"
      {...props}
    />
  );
}

export function GooglePlayIcon(props: AppScreenIconProps) {
  return (
    <AppScreenIcon
      src={{
        light: "/assets/social-icons/Google-Play-light.svg",
        dark: "/assets/social-icons/Google-Play-dark.svg",
      }}
      fallbackAlt="Google Play"
      {...props}
    />
  );
}
