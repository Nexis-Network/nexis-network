import type { AgentDetail, AgentVersion } from "@/lib/agents/types";

export function AgentMeta({
  agent,
  versions,
}: {
  agent: AgentDetail["agent"];
  versions: AgentVersion[];
}) {
  return (
    <section className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.02] p-6">
      <header className="space-y-1">
        <h2 className="text-lg font-regular text-white">Agent profile</h2>
        <p className="text-sm text-muted-foreground">
          Overview of the agent configuration, system prompt, and published versions.
        </p>
      </header>

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-white">System prompt</h3>
          {agent.systemPrompt ? (
            <details className="group mt-2 rounded-2xl border border-white/5 bg-black/20 p-4">
              <summary className="cursor-pointer text-sm font-medium text-primary focus:outline-none">
                View sanitized system prompt
              </summary>
              <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-black/60 p-3 text-sm text-muted-foreground/90">
                {agent.systemPrompt}
              </pre>
            </details>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground/70">
              This agent has not published a system prompt yet.
            </p>
          )}
        </div>

        <div>
          <h3 className="text-sm font-medium text-white">Strategy configuration</h3>
          {agent.strategySnapshot ? (
            <div className="mt-3 space-y-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-sm text-muted-foreground/90">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground/70">
                <span>Template</span>
                <span className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-white/80">
                  {agent.strategySnapshot.templateId ?? "Custom"}
                </span>
              </div>
              {renderSummaryList("Triggers", agent.strategySnapshot.summary?.triggers)}
              {renderSummaryList("Actions", agent.strategySnapshot.summary?.actions)}
              {renderSummaryList("Guardrails", agent.strategySnapshot.summary?.riskControls)}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground/70">Strategy snapshot not available for this agent.</p>
          )}
        </div>

        <div>
          <h3 className="text-sm font-medium text-white">Versions</h3>
          {versions.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground/70">No versions published for this agent yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {versions.map((version) => (
                <li
                  key={version.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3 text-sm"
                >
                  <div className="font-medium text-white/90">{version.checksum.slice(0, 12)}…</div>
                  <div className="text-xs text-muted-foreground">
                    Published {formatIso(version.createdAt)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function formatIso(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function renderSummaryList(label: string, items?: string[]) {
  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs font-regular text-muted-foreground/70">{label}</span>
        <span className="text-xs text-muted-foreground/60">No entries</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-regular text-muted-foreground/70">{label}</span>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={`${label}-${item}`}
            className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-white/80"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
