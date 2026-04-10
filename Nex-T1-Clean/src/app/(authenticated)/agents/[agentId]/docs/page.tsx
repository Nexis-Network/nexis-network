import type { Metadata } from "next";

import { getAgentDocs } from "@/lib/agents/api";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import ReactMarkdown from "react-markdown";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ agentId: string }>;
}): Promise<Metadata> {
  try {
    const { agentId } = await params;
    const docs = await getAgentDocs(agentId);
    return {
      title: `${docs.agent.name} Docs | Nex-T1 Agent Marketplace`,
      description: `Documentation and integration details for ${docs.agent.name}.`,
    };
  } catch {
    return {
      title: "Agent Docs | Nex-T1 Agent Marketplace",
      description: "Read-only documentation for marketplace agents.",
    };
  }
}

export default async function AgentDocsPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;
  const docs = await getAgentDocs(agentId);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-12 pt-6 sm:px-6 lg:px-8">
      <header className="space-y-3">
        <Badge variant="outline" className="rounded-full border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-primary">
          Agent Docs
        </Badge>
        <div>
          <h1 className="text-3xl font-regular text-foreground sm:text-4xl">{docs.agent.name}</h1>
          <p className="text-sm text-muted-foreground">
            Read-only documentation for integrating and operating this agent. Visibility: {docs.agent.visibility}.
          </p>
        </div>
      </header>

      <section className="space-y-6 rounded-3xl border border-border/60 bg-card/50 p-6">
        {docs.sections.length === 0 ? (
          <p className="text-sm text-muted-foreground/80">This agent has not published documentation yet.</p>
        ) : (
          docs.sections.map((section, index) => (
            <article key={`${section.heading}-${index}`} className="space-y-2">
              <h2 className="text-lg font-regular text-foreground">{section.heading}</h2>
              <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                <ReactMarkdown>{section.body}</ReactMarkdown>
              </div>
              {index < docs.sections.length - 1 ? <Separator className="border-border/60" /> : null}
            </article>
          ))
        )}
      </section>
    </main>
  );
}
