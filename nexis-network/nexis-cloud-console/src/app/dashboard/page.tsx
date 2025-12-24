import Link from "next/link";
import { cookies } from "next/headers";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { nexisFetch } from "@/lib/server/nexis-cloud";
import { fetchAgentsSummary, fetchBillingSummary } from "@/lib/server/service-metrics";
import { Activity, Server, Cpu, Wallet, Plus, ArrowRight } from "lucide-react";

type CvmListItem = {
  hosted?: { app_id?: string | null; app_url?: string | null; uptime?: string | null } | null;
  name?: string | null;
  status?: string | null;
  in_progress?: boolean;
  vcpu?: number | null;
  memory?: number | null;
};

function normalizeStatus(status: string | null | undefined) {
  return status?.trim().toLowerCase() || "unknown";
}

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const apiKey = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!apiKey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Link an API key to load metrics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-text-secondary">
          <p>
            Your passkey session is active, but the dashboard needs a Nexis Cloud API key to fetch
            CVM data.
          </p>
          <Link
            className={buttonClassName()}
            href="/login?link=api-key&redirect=/dashboard"
          >
            Link API key
          </Link>
        </CardContent>
      </Card>
    );
  }

  const [cvmResult, billingResult, agentsResult] = await Promise.all([
    nexisFetch("/cvms/paginated", { apiKey }),
    fetchBillingSummary(apiKey),
    fetchAgentsSummary(apiKey),
  ]);
  if (!cvmResult.ok) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unable to load dashboard data</CardTitle>
        </CardHeader>
        <CardContent className="text-text-secondary">
          {typeof cvmResult.data === "string" ? cvmResult.data : "Request failed."}
        </CardContent>
      </Card>
    );
  }
  const payload = cvmResult.data as
    | {
        items?: CvmListItem[];
        total?: number;
      }
    | null;

  const items = payload?.items ?? [];
  const total = payload?.total ?? items.length;
  const running = items.filter((cvm) => normalizeStatus(cvm.status) === "running").length;
  const totalVcpu = items.reduce((sum, cvm) => sum + (cvm.vcpu ?? 0), 0);
  const healthPercent = total > 0 ? Math.round((running / total) * 100) : 0;

  const activityItems = items.slice(0, 4);
  const billingSummary = billingResult.summary;
  const billingLabel = billingSummary?.currency || "USD";
  const monthlyCost =
    billingSummary?.monthlyCost !== null && billingSummary?.monthlyCost !== undefined
      ? formatCurrency(billingSummary.monthlyCost, billingLabel)
      : "—";
  const billingSub =
    billingSummary?.monthlyCost !== null && billingSummary?.monthlyCost !== undefined
      ? "Current period"
      : billingResult.error || "Billing data unavailable";

  const agentsSummary = agentsResult.summary;
  const activeAgentsValue =
    agentsSummary?.activeAgents !== null && agentsSummary?.activeAgents !== undefined
      ? String(agentsSummary.activeAgents)
      : "—";
  const agentsSub =
    agentsSummary?.activeAgents !== null && agentsSummary?.activeAgents !== undefined
      ? agentsSummary.totalAgents && agentsSummary.totalAgents !== agentsSummary.activeAgents
        ? `${agentsSummary.activeAgents} active · ${agentsSummary.totalAgents} total`
        : `${agentsSummary.activeAgents} active`
      : agentsResult.error || "Agents data unavailable";

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Overview</h1>
          <p className="text-text-secondary mt-1">Welcome back to your Nexis Cloud Console.</p>
        </div>
        <Link className={buttonClassName({ className: "gap-2" })} href="/dashboard/deploy">
          <Plus className="h-4 w-4" />
          Deploy CVM
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total CVMs"
          value={total}
          subValue={total > 0 ? `${running} running · ${totalVcpu} vCPU` : "No CVMs deployed"}
          icon={<Server className="h-4 w-4" />}
          trend="neutral"
        />
        <MetricCard
          title="Active Agents"
          value={activeAgentsValue}
          subValue={agentsSub}
          icon={<Cpu className="h-4 w-4" />}
          trend="neutral"
        />
        <MetricCard
          title="Monthly Cost"
          value={monthlyCost}
          subValue={billingSub}
          icon={<Wallet className="h-4 w-4" />}
          trend="neutral"
        />
        <MetricCard
          title="Network Health"
          value={`${healthPercent}%`}
          subValue={total > 0 ? `${running} running` : "No CVMs deployed"}
          icon={<Activity className="h-4 w-4" />}
          trend={healthPercent >= 95 ? "up" : "neutral"}
        />
      </div>

      {/* Recent Activity & Deployments */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>CVM Status</CardTitle>
          </CardHeader>
          <CardContent>
            {activityItems.length === 0 ? (
              <div className="text-sm text-text-secondary">No CVMs available yet.</div>
            ) : (
              <div className="space-y-4">
                {activityItems.map((cvm) => (
                  <div
                    key={cvm.hosted?.app_id || cvm.name}
                    className="flex items-center justify-between p-4 rounded-lg bg-background-surface/50 border border-border-default/50 hover:bg-background-surface transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-8 w-8 rounded-full bg-accent-sky/10 flex items-center justify-center text-accent-sky">
                        <Server className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{cvm.name || "Unnamed CVM"}</div>
                        <div className="text-xs text-text-muted">
                          {cvm.hosted?.uptime ? `Uptime ${cvm.hosted.uptime}` : "Uptime unavailable"}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-mono text-text-secondary">
                      {normalizeStatus(cvm.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link
              className={buttonClassName({ variant: "secondary", className: "w-full justify-between group" })}
              href="/dashboard/deploy"
            >
              <span>Deploy CVM</span>
              <ArrowRight className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
            </Link>
            <Link
              className={buttonClassName({ variant: "secondary", className: "w-full justify-between group" })}
              href="/dashboard/instances"
            >
              <span>View Instances</span>
              <ArrowRight className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
            </Link>
            <Link
              className={buttonClassName({ variant: "secondary", className: "w-full justify-between group" })}
              href="/login?link=api-key&redirect=/dashboard"
            >
              <span>Link API key</span>
              <ArrowRight className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
