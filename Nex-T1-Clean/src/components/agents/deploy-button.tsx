"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trackAgentEvent } from "@/modules/analytics/events";
import { extractCorrelationId, getActiveOrgId } from "@/modules/analytics/utils";

type DeployAgentButtonProps = {
  agentId: string;
  versions: Array<{ id: string; createdAt: string }>;
};

export function DeployAgentButton({ agentId, versions }: DeployAgentButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [versionId, setVersionId] = useState<string>(versions[0]?.id ?? "");
  const [image, setImage] = useState("registry/nex-t1/agent:latest");
  const [policyProvider, setPolicyProvider] = useState("phala");
  const [policyVersion, setPolicyVersion] = useState("1.0.0");
  const [measurements, setMeasurements] = useState("sha256:...");
  const [isPending, startTransition] = useTransition();

  const resolveOrgId = useCallback(() => getActiveOrgId(), []);

  const handleSubmit = useCallback(() => {
    const orgId = resolveOrgId();
    if (!orgId) {
      toast.error("Select an organization before deploying.");
      return;
    }
    if (!versionId) {
      toast.error("Choose a version to deploy.");
      return;
    }

    const policyMeasurements = measurements
      .split(/\n|,/)
      .map((value) => value.trim())
      .filter(Boolean);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/agents/${agentId}/deploy`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Idempotency-Key": crypto.randomUUID(),
          },
          body: JSON.stringify({
            orgId,
            versionId,
            image,
            attestationPolicy: {
              provider: policyProvider,
              version: policyVersion,
              measurements: policyMeasurements,
            },
          }),
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || "Deployment failed");
        }

        trackAgentEvent("deploy_started", {
          agent_id: agentId,
          version_id: versionId,
          org_id: orgId,
          correlation_id: extractCorrelationId(response),
        });

        toast.success("Deployment started", { description: "Monitoring status for attestation." });
        setOpen(false);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to deploy agent");
      }
    });
  }, [agentId, image, measurements, policyProvider, policyVersion, resolveOrgId, router, versionId]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Deploy
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Deploy agent</DialogTitle>
          <DialogDescription>Choose a published version and attestation policy to launch a new enclave.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="deploy-version">Version</Label>
            <select
              id="deploy-version"
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
              value={versionId}
              onChange={(event) => setVersionId(event.target.value)}
            >
              {versions.map((version) => (
                <option key={version.id} value={version.id}>
                  {version.id.slice(0, 8)} • {new Date(version.createdAt).toLocaleString()}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="deploy-image">Container image</Label>
            <Input id="deploy-image" value={image} onChange={(event) => setImage(event.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="policy-provider">Attestation provider</Label>
              <Input
                id="policy-provider"
                value={policyProvider}
                onChange={(event) => setPolicyProvider(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="policy-version">Policy version</Label>
              <Input
                id="policy-version"
                value={policyVersion}
                onChange={(event) => setPolicyVersion(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="policy-measurements">Measurements (comma or newline separated)</Label>
            <Textarea
              id="policy-measurements"
              rows={3}
              value={measurements}
              onChange={(event) => setMeasurements(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Deploying…" : "Start deployment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
