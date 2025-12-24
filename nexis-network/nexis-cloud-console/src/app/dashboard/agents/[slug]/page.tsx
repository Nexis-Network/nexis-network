import Link from "next/link";
import { notFound } from "next/navigation";
import { getAgentTemplate } from "@/lib/server/agent-templates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function AgentDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const template = await getAgentTemplate(slug);

  if (!template) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">{template.name}</h1>
          <p className="text-text-secondary mt-1">{template.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className={buttonClassName({ variant: "secondary" })}
            href="/dashboard/agents"
          >
            Back to registry
          </Link>
          <Link
            className={buttonClassName()}
            href={`/dashboard/deploy?template=${template.slug}`}
          >
            One-click deploy
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Docker Compose</CardTitle>
        </CardHeader>
        <CardContent>
          {template.dockerCompose ? (
            <pre className="rounded-md border border-border-default bg-background-surface p-4 text-xs text-text-secondary overflow-auto">
              {template.dockerCompose}
            </pre>
          ) : (
            <div className="text-sm text-text-secondary">No compose file found for this template.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Template README</CardTitle>
        </CardHeader>
        <CardContent>
          {template.readme ? (
            <pre className="rounded-md border border-border-default bg-background-surface p-4 text-xs text-text-secondary whitespace-pre-wrap">
              {template.readme}
            </pre>
          ) : (
            <div className="text-sm text-text-secondary">No README available.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
