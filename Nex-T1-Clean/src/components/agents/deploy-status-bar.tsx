import type { AgentDeployment } from "@/lib/agents/types";
import { Badge } from "@/components/ui/badge";

const STATUS_LABEL: Record<string, string> = {
  creating: "Creating",
  running: "Running",
  stopped: "Stopped",
  failed: "Failed",
};

const STATUS_COLOR: Record<string, string> = {
  creating: "border-blue-500/40 bg-sky-500/100/10 text-blue-100",
  running: "border-emerald-500/40 bg-[#8eb94f]/10 text-emerald-100",
  stopped: "border-amber-500/40 bg-amber-500/10 text-amber-100",
  failed: "border-rose-500/40 bg-rose-500/10 text-rose-100",
};

type DeployStatusBarProps = {
  deployments: AgentDeployment[];
};

export function DeployStatusBar({ deployments }: DeployStatusBarProps) {
  if (deployments.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-sm text-muted-foreground">
        No deployments yet. Publish a version and deploy to a trusted enclave.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <h3 className="text-sm font-medium text-white">Deployments</h3>
      <ul className="space-y-2">
        {deployments.map((deployment) => {
          const status = deployment.status.toLowerCase();
          const label = STATUS_LABEL[status] ?? deployment.status;
          const tone = STATUS_COLOR[status] ?? "border-white/20 bg-white/10 text-white";
          return (
            <li key={deployment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-white">
                  {deployment.teeProvider ?? "TEE provider"} • {deployment.containerId ?? "pending"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Updated {formatIso(deployment.updatedAt ?? deployment.createdAt)}
                </p>
              </div>
              <Badge variant="outline" className={`rounded-full border px-3 py-1 text-xs ${tone}`}>
                {label}
              </Badge>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function formatIso(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
