"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCsrfToken } from "@/lib/csrf";

type SessionInfo = {
  authMethod?: string;
  hasApiKey?: boolean;
};

export function UserMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadSession = async () => {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as SessionInfo;
        if (mounted) setSession(data);
      } catch {
        // ignore session fetch errors
      }
    };
    loadSession();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [open]);

  const handleLogout = async () => {
    setLoading(true);
    try {
      const token = await getCsrfToken();
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "X-CSRF-Token": token,
        },
      });
    } finally {
      setLoading(false);
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="outline"
        size="sm"
        className="hidden md:flex gap-2"
        onClick={() => setOpen((prev) => !prev)}
      >
        Account
      </Button>
      {open && (
        <div
          className={cn(
            "absolute right-0 mt-2 w-56 rounded-md border border-border-default bg-background-surface shadow-lg",
            "p-3 text-xs text-text-secondary"
          )}
        >
          <div className="space-y-1 border-b border-border-default pb-3">
            <div className="text-[11px] uppercase tracking-wide text-text-muted">Session</div>
            <div className="text-sm text-text-primary">
              {session?.authMethod ? `Signed in via ${session.authMethod}` : "Signed in"}
            </div>
            <div className="text-xs text-text-muted">
              {session?.hasApiKey ? "API key linked" : "API key not linked"}
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <Link
              className="block rounded-md px-2 py-1 text-xs text-text-secondary hover:bg-background-card"
              href="/dashboard/settings"
            >
              Account settings
            </Link>
            {!session?.hasApiKey && (
              <Link
                className="block rounded-md px-2 py-1 text-xs text-accent-sky hover:bg-background-card"
                href="/login?link=api-key&redirect=/dashboard"
              >
                Link API key
              </Link>
            )}
            <button
              className="w-full text-left rounded-md px-2 py-1 text-xs text-text-secondary hover:bg-background-card"
              type="button"
              onClick={handleLogout}
              disabled={loading}
            >
              {loading ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
