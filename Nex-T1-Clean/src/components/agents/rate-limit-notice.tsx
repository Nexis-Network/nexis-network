"use client";

import { useEffect, useState } from "react";

type RateLimitNoticeProps = {
  retryAfter: number;
  onExpired?: () => void;
};

export function RateLimitNotice({ retryAfter, onExpired }: RateLimitNoticeProps) {
  const [remaining, setRemaining] = useState<number>(retryAfter);

  useEffect(() => {
    setRemaining(retryAfter);
  }, [retryAfter]);

  useEffect(() => {
    if (remaining <= 0) {
      onExpired?.();
      return;
    }
    const timer = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          onExpired?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [remaining, onExpired]);

  return (
    <div
      className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
      role="status"
      aria-live="polite"
    >
      <p className="font-medium">We’re throttling requests</p>
      <p className="text-xs text-amber-100/80">
        Retry in {remaining}s or wait for the countdown to finish. We respect upstream rate limits to keep the network healthy.
      </p>
    </div>
  );
}
