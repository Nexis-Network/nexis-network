import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background-page text-text-primary flex items-center justify-center px-6">
      <div className="max-w-xl w-full rounded-card border border-border-default bg-background-surface p-8 shadow-card-active">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-accent-purple/15 text-accent-purple flex items-center justify-center text-lg font-semibold">
            404
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
            <p className="text-text-secondary mt-1">The console route you requested doesn’t exist.</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/dashboard" className={buttonClassName()}>
            Go to dashboard
          </Link>
          <Link
            href="/"
            className={buttonClassName({ variant: "secondary" })}
          >
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
}
