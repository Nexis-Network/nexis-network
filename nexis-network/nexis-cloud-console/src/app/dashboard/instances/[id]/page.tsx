import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { nexisFetch } from "@/lib/server/nexis-cloud";
import { buildSshCommand, formatDisk, formatMemory, normalizeCvmId } from "@/lib/cvms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";
import { CvmActions } from "@/components/instances/cvm-actions";
import { SshHelper } from "@/components/instances/ssh-helper";
import { CvmStateIndicator } from "@/components/instances/cvm-state-indicator";
import { CvmLogsWrapper } from "@/components/instances/cvm-logs-wrapper";
import { CvmMetricsWrapper } from "@/components/instances/cvm-metrics-wrapper";

type PageProps = {
  params: {
    id: string;
  };
};

type CvmDetail = {
  name?: string | null;
  status?: string | null;
  in_progress?: boolean;
  public_sysinfo?: boolean;
  public_logs?: boolean;
  app_id?: string | null;
  vm_uuid?: string | null;
  instance_id?: string | null;
  vcpu?: number | null;
  memory?: number | null;
  disk_size?: number | null;
  dapp_dashboard_url?: string | null;
  syslog_endpoint?: string | null;
  gateway_domain?: string | null;
  public_urls?: Array<{ app: string; instance: string }>;
  teepod?: { name?: string | null; region_identifier?: string | null } | null;
};

function normalizeStatus(status: string | null | undefined) {
  return status?.trim().toLowerCase() || "unknown";
}

export default async function InstanceDetailPage({ params }: PageProps) {
  const cookieStore = await cookies();
  const apiKey = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!apiKey) {
    redirect(`/login?link=api-key&redirect=/dashboard/instances/${encodeURIComponent(params.id)}`);
  }

  const cvmId = normalizeCvmId(params.id);
  const result = await nexisFetch(`/cvms/${cvmId}`, { apiKey });

  if (!result.ok) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unable to load CVM</CardTitle>
        </CardHeader>
        <CardContent className="text-text-secondary">
          {typeof result.data === "string" ? result.data : "Request failed."}
        </CardContent>
      </Card>
    );
  }

  const cvm = result.data as CvmDetail;
  const appId = normalizeCvmId(cvm.app_id || params.id);
  const status = normalizeStatus(cvm.status);
  const region = cvm.teepod?.region_identifier || cvm.teepod?.name || "—";
  const publicUrls = cvm.public_urls ?? [];
  const sshInfo = cvm.gateway_domain ? buildSshCommand(appId, cvm.gateway_domain) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3 text-sm text-text-muted">
            <Link className="hover:text-text-primary" href="/dashboard/instances">
              Instances
            </Link>
            <span>/</span>
            <span className="text-text-secondary">{cvm.name || "CVM Detail"}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {cvm.name || "Unnamed CVM"}
          </h1>
          <div className="text-sm text-text-secondary">
            App ID: <span className="font-mono">{appId}</span>
          </div>
        </div>
        <Link className={buttonClassName({ variant: "secondary" })} href="/dashboard/instances">
          Back to instances
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs text-text-muted">Status</div>
              <div className="text-sm text-white">
                <CvmStateIndicator appId={appId} initialStatus={status} />
                {cvm.in_progress && (
                  <span className="ml-2 text-xs text-text-muted">(updating)</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-xs text-text-muted">Region</div>
              <div className="text-sm text-text-secondary">{region}</div>
            </div>
            <div>
              <div className="text-xs text-text-muted">vCPU</div>
              <div className="text-sm text-text-secondary">{cvm.vcpu ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-text-muted">Memory</div>
              <div className="text-sm text-text-secondary">{formatMemory(cvm.memory)}</div>
            </div>
            <div>
              <div className="text-xs text-text-muted">Disk</div>
              <div className="text-sm text-text-secondary">{formatDisk(cvm.disk_size)}</div>
            </div>
            <div>
              <div className="text-xs text-text-muted">Instance ID</div>
              <div className="text-sm text-text-secondary font-mono">
                {cvm.instance_id || "—"}
              </div>
            </div>
            <div>
              <div className="text-xs text-text-muted">VM UUID</div>
              <div className="text-sm text-text-secondary font-mono">
                {cvm.vm_uuid || "—"}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Control Panel</CardTitle>
          </CardHeader>
          <CardContent>
            <CvmActions appId={appId} status={status} inProgress={Boolean(cvm.in_progress)} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <CvmMetricsWrapper
          appId={appId}
          publicSysinfo={Boolean(cvm.public_sysinfo)}
          publicLogs={Boolean(cvm.public_logs)}
        />
        <Card>
          <CardHeader>
            <CardTitle>SSH Access</CardTitle>
          </CardHeader>
          <CardContent>
            {sshInfo ? (
              <SshHelper host={sshInfo.host} port={sshInfo.port} command={sshInfo.command} />
            ) : (
              <div className="text-sm text-text-secondary">
                SSH access is unavailable until the CVM has a gateway domain and instance ID.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Endpoints</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-text-secondary">
            <div>
              <div className="text-xs text-text-muted">Gateway</div>
              <div>{cvm.gateway_domain || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-text-muted">Dashboard URL</div>
              {cvm.dapp_dashboard_url ? (
                <a
                  className="text-accent-sky hover:text-accent-cyan"
                  href={cvm.dapp_dashboard_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {cvm.dapp_dashboard_url}
                </a>
              ) : (
                <div>—</div>
              )}
            </div>
            <div>
              <div className="text-xs text-text-muted">Public URLs</div>
              {publicUrls.length > 0 ? (
                <div className="space-y-1">
                  {publicUrls.map((url) => (
                    <a
                      key={url.app}
                      className="text-accent-sky hover:text-accent-cyan"
                      href={url.app}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {url.app}
                    </a>
                  ))}
                </div>
              ) : (
                <div>—</div>
              )}
            </div>
            <div>
              <div className="text-xs text-text-muted">Syslog Endpoint</div>
              {cvm.syslog_endpoint ? (
                <div className="font-mono break-all">{cvm.syslog_endpoint}</div>
              ) : (
                <div>—</div>
              )}
            </div>
          </CardContent>
        </Card>

        <CvmLogsWrapper
          appId={appId}
          publicLogs={Boolean(cvm.public_logs)}
          publicSysinfo={Boolean(cvm.public_sysinfo)}
        />
      </div>
    </div>
  );
}
