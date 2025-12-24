"use client";

import Link from "next/link";
import { Button, buttonClassName } from "@/components/ui/button";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: ErrorProps) {
  const errorDetails =
    process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred.";

  return (
    <div className="min-h-screen bg-background-page text-text-primary flex items-center justify-center px-6">
      <div className="max-w-xl w-full rounded-card border border-border-default bg-background-surface p-8 shadow-card-active">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-accent-sky/15 text-accent-sky flex items-center justify-center text-xl font-semibold">
            !
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">We hit a console error</h1>
            <p className="text-text-secondary mt-1">Something went wrong while loading this view.</p>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-border-subtle bg-background-card px-4 py-3 text-sm text-text-secondary">
          {errorDetails}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={reset}>Try again</Button>
          <Link
            href="/dashboard"
            className={buttonClassName({ variant: "secondary" })}
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
