import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SocialConversationStatus } from "@/lib/social/types";

type ChatHistoryStatusBadgeProps = {
  status: SocialConversationStatus;
  className?: string;
};

const STATUS_STYLES: Record<
  SocialConversationStatus,
  { label: string; dotClassName: string; badgeClassName: string }
> = {
  success: {
    label: "Success",
    dotClassName: "bg-emerald-400",
    badgeClassName: "border-emerald-500/25 bg-emerald-500/10 text-emerald-100",
  },
  failure: {
    label: "Failure",
    dotClassName: "bg-rose-400",
    badgeClassName: "border-rose-500/25 bg-rose-500/10 text-rose-100",
  },
  in_progress: {
    label: "In progress",
    dotClassName: "bg-amber-300",
    badgeClassName: "border-amber-400/25 bg-amber-400/10 text-amber-50",
  },
};

export function ChatHistoryStatusBadge({
  status,
  className,
}: ChatHistoryStatusBadgeProps) {
  const style = STATUS_STYLES[status];

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex h-7 items-center gap-2 rounded-full px-3 text-[11px] font-medium tracking-[0.02em]",
        style.badgeClassName,
        className,
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", style.dotClassName)} />
      {style.label}
    </Badge>
  );
}
