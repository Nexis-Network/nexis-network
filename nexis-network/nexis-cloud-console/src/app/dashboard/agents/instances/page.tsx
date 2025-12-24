import Link from "next/link";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { nexisFetch } from "@/lib/server/nexis-cloud";
import { listAgentConfigs } from "@/lib/server/agent-config";
import { normalizeCvmId } from "@/lib/cvms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";

export default async function AgentInstancesPage() {
  const cookieStore = await cookies();
  const apiKey = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!apiKey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Link an API key to manage agents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-text-secondary">
          <p>Agent management requires access to your CVM list via API key.</p>
          <Link className={buttonClassName()} href="/login?link=api-key&redirect=/dashboard/agents/instances">
            Link API key
          </Link>
        </CardContent>
      </Card>
    );
  }

  const [cvmResult, configsResult] = await Promise.all([
    nexisFetch("/cvms/paginated", { apiKey }),
    listAgentConfigs({ apiKey })
      .then((configs) => ({ configs, error: null as string | null }))
      .catch((error) => ({
        configs: [],
        error: error instanceof Error ? error.message : "Unable to load agent configs.",
      })),
  ]);

  const configs = configsResult.configs;
  const configError = configsResult.error;

  if (!cvmResult.ok) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unable to load CVMs</CardTitle>
        </CardHeader>
        <CardContent className="text-text-secondary">
          {typeof cvmResult.data === "string" ? cvmResult.data : "Request failed."}
        </CardContent>
      </Card>
    );
  }

  const payload = cvmResult.data as {
    items?: Array<{ name?: string | null; status?: string | null; hosted?: { app_id?: string | null } | null }>;
  };

  const items = payload.items ?? [];
  const configMap = new Map(configs.map((config) => [config.appId, config]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Agent Management</h1>
          <p className="text-text-secondary mt-1">
            Attach configuration, knowledge bases, and chat tools to deployed CVMs.
          </p>
        </div>
        <Link className={buttonClassName({ variant: "secondary" })} href="/dashboard/agents">
          Back to registry
        </Link>
      </div>

      {configError && (
        <Card>
          <CardHeader>
            <CardTitle>Agent configuration service unavailable</CardTitle>
          </CardHeader>
          <CardContent className="text-text-secondary">{configError}</CardContent>
        </Card>
      )}

      {items.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No CVMs found</CardTitle>
          </CardHeader>
          <CardContent className="text-text-secondary">
            Deploy a CVM before configuring agent settings.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-text-muted">
              <tr className="border-b border-border-default">
                <th className="py-2 pr-4">CVM</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Agent Config</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((cvm, index) => {
                const rawAppId = cvm.hosted?.app_id || "";
                const appId = rawAppId ? normalizeCvmId(rawAppId) : `cvm_${index}`;
                const config = configMap.get(appId);
                return (
                  <tr key={appId} className="border-b border-border-default/60">
                    <td className="py-2 pr-4 text-text-primary">{cvm.name || "Unnamed CVM"}</td>
                    <td className="py-2 pr-4 text-text-secondary">{cvm.status || "unknown"}</td>
                    <td className="py-2 pr-4 text-text-secondary">
                      {config ? `${config.name} · ${config.requestFormat}` : "Not configured"}
                    </td>
                    <td className="py-2">
                      {rawAppId ? (
                        <Link className={buttonClassName({ size: "sm" })} href={`/dashboard/agents/instances/${appId}`}>
                          Manage
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
