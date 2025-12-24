"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-12 border-t border-border-default pt-6 pb-10 text-xs text-text-muted">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>Nexis Cloud Console · Confidential compute management</div>
        <div className="flex flex-wrap items-center gap-4">
          <Link className="hover:text-text-primary" href="/privacy">
            Privacy Policy
          </Link>
          <Link className="hover:text-text-primary" href="/terms">
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
}
