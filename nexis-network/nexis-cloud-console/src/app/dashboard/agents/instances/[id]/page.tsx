import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { nexisFetch } from "@/lib/server/nexis-cloud";
import { normalizeCvmId } from "@/lib/cvms";
import { getAgentConfig, toView } from "@/lib/server/agent-config";
import { listKnowledgeFiles } from "@/lib/server/agent-knowledge";
import { AgentWorkspace } from "@/components/agents/agent-workspace";
import { getEncryptionKey } from "@/lib/server/secrets";

export default async function AgentInstancePage({
  params,
}: {
  params: { id: string };
}) {
  const cookieStore = await cookies();
  const apiKey = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!apiKey) {
    redirect(`/login?link=api-key&redirect=/dashboard/agents/instances/${encodeURIComponent(params.id)}`);
  }

  const appId = normalizeCvmId(params.id);
  const [cvmResult, configResult, knowledgeResult] = await Promise.all([
    nexisFetch(`/cvms/${appId}`, { apiKey }),
    getAgentConfig(appId, { apiKey })
      .then((config) => ({ config, error: null as string | null }))
      .catch((error) => ({
        config: null,
        error: error instanceof Error ? error.message : "Unable to load agent configuration.",
      })),
    listKnowledgeFiles(appId, { apiKey })
      .then((files) => ({ files, error: null as string | null }))
      .catch((error) => ({
        files: [],
        error: error instanceof Error ? error.message : "Unable to load knowledge base.",
      })),
  ]);

  const configRecord = configResult.config;
  const knowledgeFiles = knowledgeResult.files;
  const loadError = configResult.error ?? knowledgeResult.error;

  if (!cvmResult.ok) {
    redirect("/dashboard/agents/instances");
  }

  const cvm = cvmResult.data as {
    name?: string | null;
    status?: string | null;
    public_logs?: boolean;
    public_sysinfo?: boolean;
  };

  return (
    <AgentWorkspace
      appId={appId}
      cvmName={cvm.name || "CVM"}
      status={cvm.status || "unknown"}
      publicLogs={Boolean(cvm.public_logs)}
      publicSysinfo={Boolean(cvm.public_sysinfo)}
      initialConfig={configRecord ? toView(configRecord) : null}
      initialKnowledge={knowledgeFiles}
      secretsEnabled={Boolean(getEncryptionKey())}
      loadError={loadError}
    />
  );
}
