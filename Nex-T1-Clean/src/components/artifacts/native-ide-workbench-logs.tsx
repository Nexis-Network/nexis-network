"use client";

import type { NativeIdeSessionData } from "@/modules/chat/ui-message-parts";

type NativeIdeWorkbenchLogsProps = {
  session: NativeIdeSessionData;
};

export function NativeIdeWorkbenchLogs({
  session,
}: NativeIdeWorkbenchLogsProps) {
  const hasContent =
    Boolean(session.plan?.length) ||
    Boolean(session.queue?.pending.length) ||
    Boolean(session.queue?.completed.length) ||
    Boolean(session.queue?.failed.length) ||
    Boolean(session.checkpoints?.length) ||
    Boolean(session.testResults?.items?.length);

  if (!hasContent) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--artifact-terminal-background)] px-6 text-sm text-[var(--artifact-muted)]">
        Live execution details will appear here.
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-[var(--artifact-terminal-background)] p-4">
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        {session.plan?.length ? (
          <section className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--artifact-muted)]">
              Plan
            </p>
            <div className="grid gap-2">
              {session.plan.map((step) => (
                <div
                  key={step.id}
                  className="rounded-[var(--artifact-radius-control)] border border-[var(--artifact-border)] bg-[var(--artifact-toolbar)] px-3 py-2"
                >
                  <p className="text-sm font-medium text-[var(--artifact-foreground)]">
                    {step.title}
                  </p>
                  {step.description ? (
                    <p className="mt-1 text-xs text-[var(--artifact-muted)]">
                      {step.description}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {session.queue ? (
          <section className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--artifact-muted)]">
              Queue
            </p>
            <div className="grid gap-2 md:grid-cols-3">
              {[
                { id: "pending", label: "Pending", items: session.queue.pending },
                { id: "completed", label: "Completed", items: session.queue.completed },
                { id: "failed", label: "Failed", items: session.queue.failed },
              ].map((section) => (
                <div
                  key={section.id}
                  className="rounded-[var(--artifact-radius-control)] border border-[var(--artifact-border)] bg-[var(--artifact-toolbar)] p-3"
                >
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--artifact-muted)]">
                    {section.label}
                  </p>
                  <div className="mt-3 space-y-2">
                    {section.items.length > 0 ? (
                      section.items.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-[10px] border border-[var(--artifact-border)] bg-[var(--artifact-panel)] px-3 py-2"
                        >
                          <p className="text-sm text-[var(--artifact-foreground)]">
                            {item.title}
                          </p>
                          {item.description ? (
                            <p className="mt-1 text-xs text-[var(--artifact-muted)]">
                              {item.description}
                            </p>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[var(--artifact-muted)]">No entries.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {session.checkpoints?.length ? (
          <section className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--artifact-muted)]">
              Checkpoints
            </p>
            <div className="grid gap-2">
              {session.checkpoints.map((checkpoint) => (
                <div
                  key={checkpoint.id}
                  className="rounded-[var(--artifact-radius-control)] border border-[var(--artifact-border)] bg-[var(--artifact-toolbar)] px-3 py-2"
                >
                  <p className="text-sm font-medium text-[var(--artifact-foreground)]">
                    {checkpoint.label}
                  </p>
                  {checkpoint.summary ? (
                    <p className="mt-1 text-xs text-[var(--artifact-muted)]">
                      {checkpoint.summary}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
