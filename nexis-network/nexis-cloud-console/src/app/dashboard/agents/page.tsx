import Link from "next/link";
import { getAgentTemplates } from "@/lib/server/agent-templates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";

export default async function AgentsPage() {
  const templates = await getAgentTemplates();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Agent Registry</h1>
          <p className="text-text-secondary mt-1">
            Browse Nexis-hosted templates to deploy vetted agents and MCP servers.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className={buttonClassName({ variant: "secondary" })} href="/dashboard/agents/instances">
            Manage agents
          </Link>
          <Link className={buttonClassName({ variant: "secondary" })} href="/dashboard/deploy">
            Deploy custom CVM
          </Link>
        </div>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No templates available</CardTitle>
          </CardHeader>
          <CardContent className="text-text-secondary">
            No agent templates were found on this deployment host.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.slug} className="flex h-full flex-col">
              <CardHeader>
                <CardTitle>{template.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex h-full flex-col gap-4">
                <p className="text-sm text-text-secondary">{template.description}</p>
                <div className="mt-auto flex flex-wrap gap-2">
                  <Link
                    className={buttonClassName({ size: "sm" })}
                    href={`/dashboard/deploy?template=${template.slug}`}
                  >
                    One-click deploy
                  </Link>
                  <Link
                    className={buttonClassName({ size: "sm", variant: "secondary" })}
                    href={`/dashboard/agents/${template.slug}`}
                  >
                    View details
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
