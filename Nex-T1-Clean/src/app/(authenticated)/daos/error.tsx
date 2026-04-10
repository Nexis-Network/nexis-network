"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DaoRoutesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center px-4 py-10">
      <Card className="w-full border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle>DAO pages are temporarily unavailable</CardTitle>
          <CardDescription>
            The DAO route hit an unexpected render failure. Retry the page or
            jump back into the agent workspace while the server recovers.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={reset}>Retry</Button>
          <Button variant="outline" asChild>
            <Link href="/daos">Return to DAO directory</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/app">Open `/app`</Link>
          </Button>
        </CardContent>
        {process.env.NODE_ENV !== "production" && error?.digest ? (
          <CardContent className="pt-0 text-xs text-muted-foreground">
            Digest: {error.digest}
          </CardContent>
        ) : null}
      </Card>
    </div>
  );
}
