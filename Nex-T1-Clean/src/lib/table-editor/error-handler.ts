import { toast } from "sonner";

import { logger } from '@/lib/logger';
export type RateLimitError = {
  error: string;
  retryAfter: number;
};

export function isRateLimitError(error: UntypedJson): error is RateLimitError {
  if (error && typeof error === "object" && error !== null && "error" in error && "retryAfter" in error) {
    const err = error as Record<string, UntypedJson>;
    return (
      typeof err.error === "string" &&
      typeof err.retryAfter === "number" &&
      err.error.toLowerCase().includes("rate limit")
    );
  }
  return false;
}

export function handleRateLimitError(error: RateLimitError) {
  const retryAfterMinutes = Math.ceil(error.retryAfter / 60);
  const retryAfterHours = Math.ceil(retryAfterMinutes / 60);

  let retryMessage = "";
  if (retryAfterHours >= 1) {
    retryMessage = `Please try again in ${retryAfterHours} hour${retryAfterHours > 1 ? "s" : ""}`;
  } else {
    retryMessage = `Please try again in ${retryAfterMinutes} minute${retryAfterMinutes > 1 ? "s" : ""}`;
  }

  toast.error(`Rate limit exceeded. You've reached the daily limit of 10 requests. ${retryMessage}`, {
    id: "rate-limit-error",
    duration: 10_000, // Show for 10 seconds
    action: {
      label: "Learn More",
      onClick: () => {
        // Could open a modal or navigate to pricing page
        logger.debug("Rate limit info clicked");
      },
    },
  });
}
