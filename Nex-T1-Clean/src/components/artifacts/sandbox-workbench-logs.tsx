"use client";

import type { SimulatorEntry } from "@/components/artifacts/sandbox-workbench-utils";

type SandboxWorkbenchLogsProps = {
  error: string | null;
  pdfFileName: string | null;
  previewUrl: string;
  sandboxId: string | null;
  simulatorEntries: SimulatorEntry[];
  terminalText: string;
  webUrl: string;
};

function LogSection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="space-y-2">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--artifact-muted)]">
        {title}
      </p>
      {children}
    </section>
  );
}

export function SandboxWorkbenchLogs({
  error,
  pdfFileName,
  previewUrl,
  sandboxId,
  simulatorEntries,
  terminalText,
  webUrl,
}: SandboxWorkbenchLogsProps) {
  const urls = [
    previewUrl ? { id: "preview", label: "Preview", value: previewUrl } : null,
    webUrl ? { id: "web", label: "Web", value: webUrl } : null,
    pdfFileName ? { id: "pdf", label: "PDF", value: pdfFileName } : null,
    sandboxId ? { id: "sandbox", label: "Sandbox", value: sandboxId } : null,
  ].filter(Boolean) as { id: string; label: string; value: string }[];
  const recentTerminal = terminalText
    .split("\n")
    .filter(Boolean)
    .slice(-8)
    .join("\n");

  return (
    <div
      className="h-full overflow-auto bg-[var(--artifact-terminal-background)] p-4"
      data-testid="artifact-logs-view"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        {urls.length > 0 ? (
          <LogSection title="Workspace">
            <div className="grid gap-2 md:grid-cols-2">
              {urls.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[var(--artifact-radius-control)] border border-[var(--artifact-border)] bg-[var(--artifact-toolbar)] px-3 py-2"
                >
                  <p className="text-xs text-[var(--artifact-muted)]">{item.label}</p>
                  <p className="mt-1 truncate text-sm text-[var(--artifact-foreground)]">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </LogSection>
        ) : null}

        {simulatorEntries.length > 0 ? (
          <LogSection title="Activity">
            <div className="grid gap-2">
              {simulatorEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-[var(--artifact-radius-control)] border border-[var(--artifact-border)] bg-[var(--artifact-toolbar)] px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-[var(--artifact-foreground)]">
                      {entry.label}
                    </p>
                    {entry.status ? (
                      <span className="text-xs uppercase tracking-[0.12em] text-[var(--artifact-muted)]">
                        {entry.status}
                      </span>
                    ) : null}
                  </div>
                  {entry.details ? (
                    <p className="mt-1 text-xs text-[var(--artifact-muted)]">
                      {entry.details}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </LogSection>
        ) : null}

        {recentTerminal ? (
          <LogSection title="Terminal">
            <pre className="overflow-x-auto rounded-[var(--artifact-radius-control)] border border-[var(--artifact-border)] bg-[var(--artifact-shell)] px-3 py-2 text-xs text-[var(--artifact-foreground)]">
              {recentTerminal}
            </pre>
          </LogSection>
        ) : null}

        {error ? (
          <LogSection title="Error">
            <div className="rounded-[var(--artifact-radius-control)] border border-[var(--artifact-border)] bg-[var(--artifact-toolbar)] px-3 py-2 text-sm text-[var(--destructive)]">
              {error}
            </div>
          </LogSection>
        ) : null}
      </div>
    </div>
  );
}
