"use client";

// NOTE: global-error renders completely outside the root layout. In Next.js 16
// with Turbopack, prerendering this page can fail if React Client Component
// hooks (useEffect, useContext, etc.) are invoked. Keep this component as
// minimal as possible — inline styles only, no hooks, no external imports.
//
// Sentry is initialized via sentry.client.config.ts and will capture unhandled
// errors automatically. No manual captureException call needed here.

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            fontFamily: "system-ui, sans-serif",
            background: "var(--background)",
            color: "var(--foreground)",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
            Something went wrong
          </h2>
          <p style={{ color: "var(--muted-foreground)", marginBottom: "1.5rem" }}>
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "0.625rem 1.25rem",
              cursor: "pointer",
              borderRadius: "0.375rem",
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--card-foreground)",
              fontSize: "0.875rem",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
