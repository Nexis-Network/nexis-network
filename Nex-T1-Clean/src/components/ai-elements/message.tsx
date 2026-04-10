"use client";

import { NexAgentAvatar } from "@/components/agents/agent-avatar";
import type { AgentState } from "@/components/ui/orb";
import { cn } from "@/lib/utils";
import type { UIMessage } from "ai";
import { cva, type VariantProps } from "class-variance-authority";
import { type HTMLAttributes } from "react";
import { DynamicAvatar } from "@/components/ui/dynamic-avatar";
import { usePreferredAvatar } from "@/lib/hooks/user/use-preferred-avatar";

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage["role"];
};

export const Message = ({ className, from, ...props }: MessageProps) => (
  <div
    className={cn(
      "group flex w-full items-start gap-2 py-4",
      from === "user"
        ? "is-user flex-row-reverse justify-end"
        : "is-assistant justify-start",
      className
    )}
    {...props}
  />
);

const messageContentVariants = cva(
  "is-user:dark flex min-w-0 w-full flex-col gap-2 overflow-hidden rounded-lg text-sm no-scrollbar px-6",
  {
    variants: {
      variant: {
        contained: [
          "max-w-full px-4 py-3",
          "group-[.is-user]:sm:max-w-[100%] group-[.is-user]:md:max-w-[96%] group-[.is-user]:xl:max-w-[86%]",
          "group-[.is-assistant]:sm:max-w-[100%] group-[.is-assistant]:md:max-w-[96%] group-[.is-assistant]:xl:max-w-[86%]",
          "group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground",
          "group-[.is-assistant]:bg-transparent group-[.is-assistant]:text-foreground",
        ],
        flat: [
          "group-[.is-user]:w-full group-[.is-user]:max-w-full group-[.is-user]:bg-secondary group-[.is-user]:px-4 group-[.is-user]:py-3 group-[.is-user]:text-foreground",
          "group-[.is-assistant]:w-full group-[.is-assistant]:max-w-full group-[.is-assistant]:text-foreground",
          "group-[.is-user]:sm:max-w-[100%] group-[.is-user]:md:max-w-[96%] group-[.is-user]:xl:max-w-[86%]",
          "group-[.is-assistant]:sm:max-w-[100%] group-[.is-assistant]:md:max-w-[96%] group-[.is-assistant]:xl:max-w-[86%]",
          "group-[.is-assistant]:bg-transparent",
        ],
      },
    },
    defaultVariants: {
      variant: "contained",
    },
  }
);

export type MessageContentProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof messageContentVariants>;

export const MessageContent = ({
  children,
  className,
  variant,
  ...props
}: MessageContentProps) => (
  <div
    className={cn(messageContentVariants({ variant, className }))}
    {...props}
  >
    {children}
  </div>
);

export type MessageAvatarProps = {
  role: UIMessage["role"];
  colors?: [string, string];
  agentState?: AgentState;
  className?: string;
  variant?: MessageOrbVariant;
  agentId?: string | null;
  agentName?: string | null;
  model?: string | null;
  conversationId?: string | null;
  fallbackLabel?: string;
};

export const MessageAvatar = ({
  role: _role,
  agentState = null,
  className,
  agentId,
  agentName,
  model,
  conversationId,
  fallbackLabel,
}: MessageAvatarProps) => {
  const { avatarSeed } = usePreferredAvatar();

  if (_role === "user") {
    return (
      <DynamicAvatar
        address={avatarSeed}
        size={32}
        className={cn(
          "relative size-8 shrink-0 overflow-hidden rounded-full object-cover ring-1 ring-border",
          className
        )}
      />
    );
  }

  return (
    <NexAgentAvatar
      agentId={agentId}
      agentName={agentName}
      model={model}
      conversationId={conversationId}
      fallbackLabel={fallbackLabel}
      className={cn(
        "relative size-8",
        className
      )}
      size={32}
      animated={agentState !== "listening"}
    />
  );
};

export const RainbowMessageAvatar = (
  props: Omit<MessageAvatarProps, "variant">
) => <MessageAvatar {...props} variant="rainbow" />;

type MessageOrbVariant = "agent" | "user" | "rainbow" | "default";
