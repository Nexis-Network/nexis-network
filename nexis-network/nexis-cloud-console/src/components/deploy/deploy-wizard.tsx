"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCsrfToken } from "@/lib/csrf";
import { normalizeCvmId } from "@/lib/cvms";
import { cn } from "@/lib/utils";

const DRAFT_STORAGE_KEY = "nexis_deploy_draft_v2";

const steps = ["Image", "Configuration", "Network & Security", "Review"] as const;

type TeepodImage = {
  name: string;
  is_dev?: boolean;
  version?: number[];
  os_image_hash?: string;
};

type TeepodNode = {
  teepod_id: number;
  name?: string | null;
  region_identifier?: string | null;
  remaining_vcpu?: number | null;
  remaining_memory?: number | null;
  remaining_cvm_slots?: number | null;
  support_onchain_kms?: boolean | null;
  listed?: boolean | null;
  images?: TeepodImage[] | null;
};

type TeepodsResponse = {
  nodes?: TeepodNode[];
};

type InstanceType = {
  id: string;
  name: string;
  description?: string;
  vcpu?: number;
  memory_mb?: number;
  hourly_rate?: string;
  requires_gpu?: boolean;
  default_disk_size_gb?: number;
  family?: string | null;
};

type InstanceTypesResponse = {
  result?: Array<{
    name?: string;
    items?: InstanceType[];
    total?: number;
  }>;
};

type DraftState = {
  name: string;
  nodeId: string;
  image: string;
  instanceType: string;
  vcpu: string;
  memory: string;
  diskSize: string;
  listed: boolean;
  gatewayEnabled: boolean;
  publicLogs: boolean;
  publicSysinfo: boolean;
  envKeys: string;
  encryptedEnv: string;
  sshKeys: string;
  openPorts: string;
  dockerCompose: string;
  preLaunchScript: string;
};

type ProvisionResponse = {
  app_id?: string | null;
  compose_hash?: string | null;
  app_env_encrypt_pubkey?: string | null;
  os_image_hash?: string | null;
  instance_type?: string | null;
  kms_info?: {
    chain_id?: number | null;
    kms_url?: string | null;
    kms_contract_address?: string | null;
  } | null;
};

type CommitResponse = {
  app_id?: string | null;
  vm_uuid?: string | null;
  name?: string | null;
  status?: string | null;
};

type TemplatePayload = {
  slug: string;
  name: string;
  description: string;
  dockerCompose: string | null;
  readme: string | null;
};

function resolveErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: string }).message;
    if (typeof message === "string" && message.length > 0) return message;
  }
  return fallback;
}

function parseList(value: string) {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseOptionalNumber(value: string) {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return undefined;
  return parsed;
}

function parsePorts(value: string) {
  const raw = parseList(value);
  const ports = raw
    .map((item) => Number.parseInt(item, 10))
    .filter((port) => !Number.isNaN(port) && port > 0 && port <= 65535);
  return Array.from(new Set(ports));
}

function parseEnvInput(value: string) {
  const env: Record<string, string> = {};
  const invalid: string[] = [];
  const lines = value.split(/\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      invalid.push(trimmed);
      continue;
    }
    const key = trimmed.slice(0, separatorIndex).trim();
    const val = trimmed.slice(separatorIndex + 1).trim();
    if (!key) {
      invalid.push(trimmed);
      continue;
    }
    env[key] = val;
  }

  return { env, invalid };
}

function decodeBase64(value: string) {
  const trimmed = value.trim();
  const normalized = trimmed.replace(/-/g, "+").replace(/_/g, "/");
  const paddingLength = normalized.length % 4 === 0 ? 0 : 4 - (normalized.length % 4);
  const padded = `${normalized}${"=".repeat(paddingLength)}`;
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function toHexString(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function encryptEnvironmentVariables(
  envVars: Record<string, string>,
  teePublicKeyBase64: string,
) {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("WebCrypto is not available in this browser.");
  }

  const teePublicKeyBytes = decodeBase64(teePublicKeyBase64);
  const crypto = window.crypto;
  const generatedKey = await crypto.subtle.generateKey({ name: "X25519" }, true, ["deriveKey"]);
  if (!("publicKey" in generatedKey) || !("privateKey" in generatedKey)) {
    throw new Error("X25519 is not supported in this browser.");
  }
  const { publicKey, privateKey } = generatedKey;
  const ephemeralPublicKey = await crypto.subtle.exportKey(
    "raw",
    publicKey,
  );
  const teePublicKey = await crypto.subtle.importKey(
    "raw",
    teePublicKeyBytes,
    { name: "X25519" },
    false,
    [],
  );
  const sharedSecret = await crypto.subtle.deriveKey(
    { name: "X25519", public: teePublicKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );
  const envData = JSON.stringify({ env: envVars });
  const envDataBytes = new TextEncoder().encode(envData);
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const ephemeralPublicKeyBytes = new Uint8Array(ephemeralPublicKey);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce, additionalData: ephemeralPublicKeyBytes },
    sharedSecret,
    envDataBytes,
  );
  const result = new Uint8Array(
    ephemeralPublicKeyBytes.length + nonce.length + ciphertext.byteLength,
  );
  result.set(ephemeralPublicKeyBytes, 0);
  result.set(nonce, ephemeralPublicKeyBytes.length);
  result.set(new Uint8Array(ciphertext), ephemeralPublicKeyBytes.length + nonce.length);
  return toHexString(result);
}

function buildComposeTemplate(ports: number[]) {
  const resolvedPorts = ports.length > 0 ? ports : [80];
  const portLines = resolvedPorts
    .map((port) => `      - "${port}:${port}"`)
    .join("\n");

  return [
    "version: \"3.8\"",
    "services:",
    "  app:",
    "    image: nginx:latest",
    "    ports:",
    portLines,
    "",
  ].join("\n");
}

function buildSshPreLaunchScript(keys: string[]) {
  if (keys.length === 0) return "";
  const joinedKeys = keys.join("\n");
  return [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    "USER_HOME=\"/root\"",
    "if [ -d \"/home/ubuntu\" ]; then USER_HOME=\"/home/ubuntu\"; fi",
    "SSH_DIR=\"${USER_HOME}/.ssh\"",
    "mkdir -p \"${SSH_DIR}\"",
    "chmod 700 \"${SSH_DIR}\"",
    "cat <<'EOF' > \"${SSH_DIR}/authorized_keys\"",
    joinedKeys,
    "EOF",
    "chmod 600 \"${SSH_DIR}/authorized_keys\"",
    "if command -v sshd >/dev/null 2>&1; then",
    "  if [ -f /etc/ssh/sshd_config ] && ! grep -q '^PermitRootLogin' /etc/ssh/sshd_config; then",
    "    echo 'PermitRootLogin prohibit-password' >> /etc/ssh/sshd_config",
    "  fi",
    "  if command -v systemctl >/dev/null 2>&1; then",
    "    systemctl enable ssh || true",
    "    systemctl restart ssh || systemctl restart sshd || true",
    "  elif command -v service >/dev/null 2>&1; then",
    "    service ssh restart || service sshd restart || true",
    "  fi",
    "fi",
    "",
  ].join("\n");
}

async function readResponseMessage(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const payload = (await response.json()) as { error?: string; detail?: string };
      return payload.error || payload.detail || `Request failed with ${response.status}`;
    } catch {
      return `Request failed with ${response.status}`;
    }
  }
  const text = await response.text();
  return text || `Request failed with ${response.status}`;
}

const defaultPorts = "80,443";
const defaultCompose = buildComposeTemplate(parsePorts(defaultPorts));

const defaultDraft: DraftState = {
  name: "",
  nodeId: "",
  image: "",
  instanceType: "",
  vcpu: "",
  memory: "",
  diskSize: "",
  listed: true,
  gatewayEnabled: true,
  publicLogs: true,
  publicSysinfo: true,
  envKeys: "",
  encryptedEnv: "",
  sshKeys: "",
  openPorts: defaultPorts,
  dockerCompose: defaultCompose,
  preLaunchScript: "",
};

export type DeployWizardProps = {
  templateSlug?: string | null;
};

export function DeployWizard({ templateSlug }: DeployWizardProps) {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [draft, setDraft] = useState<DraftState>(() => {
    if (typeof window === "undefined") return defaultDraft;
    const saved = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!saved) return defaultDraft;
    try {
      const parsed = JSON.parse(saved) as DraftState;
      return { ...defaultDraft, ...parsed };
    } catch {
      return defaultDraft;
    }
  });
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [nodes, setNodes] = useState<TeepodNode[]>([]);
  const [instanceTypes, setInstanceTypes] = useState<InstanceType[]>([]);
  const [diskSizeTouched, setDiskSizeTouched] = useState(false);

  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [provisioning, setProvisioning] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [provisionData, setProvisionData] = useState<ProvisionResponse | null>(null);
  const [deployResult, setDeployResult] = useState<CommitResponse | null>(null);
  const [envInput, setEnvInput] = useState("");
  const [envEncrypting, setEnvEncrypting] = useState(false);
  const [envStatus, setEnvStatus] = useState<string | null>(null);
  const [envError, setEnvError] = useState<string | null>(null);
  const [templateInfo, setTemplateInfo] = useState<TemplatePayload | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const templateAppliedRef = useRef(false);

  const loadOptions = useCallback(async () => {
    setOptionsLoading(true);
    setOptionsError(null);

    try {
      const [nodesResponse, typesResponse] = await Promise.all([
        fetch("/api/cloud/teepods/available", { cache: "no-store" }),
        fetch("/api/cloud/instance-types", { cache: "no-store" }),
      ]);

      if (!nodesResponse.ok) {
        throw new Error(await readResponseMessage(nodesResponse));
      }

      const nodePayload = (await nodesResponse.json()) as TeepodsResponse;
      setNodes(nodePayload.nodes ?? []);

      if (typesResponse.ok) {
        const typesPayload = (await typesResponse.json()) as InstanceTypesResponse;
        const flattened = (typesPayload.result ?? []).flatMap((group) =>
          (group.items ?? []).map((item) => ({
            ...item,
            family: item.family ?? group.name ?? null,
          }))
        );
        setInstanceTypes(flattened);
      } else {
        setInstanceTypes([]);
      }
    } catch (loadError) {
      setOptionsError(resolveErrorMessage(loadError, "Unable to load deployment options."));
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    if (!templateSlug) return;
    if (templateAppliedRef.current) return;
    let active = true;

    const loadTemplate = async () => {
      setTemplateLoading(true);
      setTemplateError(null);
      try {
        const response = await fetch(`/api/templates/${templateSlug}`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(await readResponseMessage(response));
        }
        const payload = (await response.json()) as { template?: TemplatePayload };
        const template = payload.template;
        if (!template) {
          throw new Error("Template payload missing.");
        }
        if (!active) return;
        setTemplateInfo(template);
        setDraft((prev) => {
          if (templateAppliedRef.current) return prev;
          const next = { ...prev };
          if (!prev.name) {
            next.name = template.name || template.slug;
          }
          if (
            template.dockerCompose &&
            (!prev.dockerCompose.trim() || prev.dockerCompose === defaultCompose)
          ) {
            next.dockerCompose = template.dockerCompose;
          }
          return next;
        });
        templateAppliedRef.current = true;
      } catch (error) {
        if (!active) return;
        setTemplateError(resolveErrorMessage(error, "Unable to load template."));
      } finally {
        if (active) setTemplateLoading(false);
      }
    };

    loadTemplate();

    return () => {
      active = false;
    };
  }, [templateSlug]);

  const selectedNode = useMemo(() => {
    if (!draft.nodeId) return null;
    const nodeId = Number.parseInt(draft.nodeId, 10);
    if (Number.isNaN(nodeId)) return null;
    return nodes.find((node) => node.teepod_id === nodeId) || null;
  }, [draft.nodeId, nodes]);

  const resolvedTeepodId = useMemo(() => {
    if (!draft.nodeId) return undefined;
    const parsed = Number.parseInt(draft.nodeId, 10);
    if (Number.isNaN(parsed)) return undefined;
    return parsed;
  }, [draft.nodeId]);

  const availableImages = useMemo(() => {
    if (selectedNode?.images && selectedNode.images.length > 0) {
      return selectedNode.images;
    }
    const allImages = nodes.flatMap((node) => node.images ?? []);
    const unique = new Map<string, TeepodImage>();
    for (const image of allImages) {
      if (!unique.has(image.name)) {
        unique.set(image.name, image);
      }
    }
    return Array.from(unique.values());
  }, [nodes, selectedNode]);

  const selectedInstanceType = useMemo(() => {
    if (!draft.instanceType) return null;
    return instanceTypes.find((type) => type.id === draft.instanceType) || null;
  }, [draft.instanceType, instanceTypes]);

  useEffect(() => {
    setDraft((prev) => {
      let updated = false;
      const next = { ...prev };

      if (!prev.nodeId && nodes.length > 0) {
        const builtinNode = nodes.find((node) => !node.support_onchain_kms) ?? nodes[0];
        next.nodeId = builtinNode ? String(builtinNode.teepod_id) : "";
        updated = true;
      }

      if (
        (!prev.image || !availableImages.find((image) => image.name === prev.image)) &&
        availableImages.length > 0
      ) {
        next.image = availableImages[0].name;
        updated = true;
      }

      if (!prev.instanceType && instanceTypes.length > 0) {
        next.instanceType = instanceTypes[0].id;
        updated = true;
      }

      if (!diskSizeTouched && selectedInstanceType?.default_disk_size_gb) {
        if (!prev.diskSize || prev.diskSize === "0") {
          next.diskSize = String(selectedInstanceType.default_disk_size_gb);
          updated = true;
        }
      }

      return updated ? next : prev;
    });
  }, [availableImages, diskSizeTouched, instanceTypes, nodes, selectedInstanceType]);

  const reviewPayload = useMemo(() => {
    const envKeys = parseList(draft.envKeys);
    const payload = {
      name: draft.name.trim(),
      image: draft.image || undefined,
      instance_type: draft.instanceType || undefined,
      vcpu: parseOptionalNumber(draft.vcpu),
      memory: parseOptionalNumber(draft.memory),
      disk_size: parseOptionalNumber(draft.diskSize),
      teepod_id: resolvedTeepodId,
      listed: draft.listed,
      env_keys: envKeys.length > 0 ? envKeys : undefined,
      compose_file: {
        docker_compose_file: draft.dockerCompose,
        pre_launch_script: draft.preLaunchScript || undefined,
        allowed_envs: envKeys.length > 0 ? envKeys : undefined,
        name: draft.name.trim(),
        gateway_enabled: draft.gatewayEnabled,
        public_logs: draft.publicLogs,
        public_sysinfo: draft.publicSysinfo,
      },
    };
    return payload;
  }, [draft, resolvedTeepodId]);

  const commitPayload = useMemo(() => {
    if (!provisionData?.compose_hash) return null;
    const envKeys = parseList(draft.envKeys);
    return {
      app_id: provisionData.app_id || "",
      compose_hash: provisionData.compose_hash,
      encrypted_env: draft.encryptedEnv || undefined,
      env_keys: envKeys.length > 0 ? envKeys : undefined,
    };
  }, [draft.encryptedEnv, draft.envKeys, provisionData]);

  const reviewJson = useMemo(
    () => JSON.stringify({ provision: reviewPayload, commit: commitPayload }, null, 2),
    [commitPayload, reviewPayload]
  );

  const saveDraft = () => {
    try {
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      setStatus("Draft saved locally.");
      setError(null);
    } catch {
      setError("Unable to save draft.");
      setStatus(null);
    }
  };

  const copyDraft = async () => {
    try {
      await navigator.clipboard.writeText(reviewJson);
      setStatus("Draft copied to clipboard.");
      setError(null);
    } catch {
      setError("Unable to copy draft.");
      setStatus(null);
    }
  };

  const goNext = () => setActiveStep((step) => Math.min(step + 1, steps.length - 1));
  const goBack = () => setActiveStep((step) => Math.max(step - 1, 0));

  const handleApplyPorts = () => {
    const ports = parsePorts(draft.openPorts);
    setDraft((prev) => ({
      ...prev,
      dockerCompose: buildComposeTemplate(ports),
    }));
  };

  const handleGeneratePreLaunch = () => {
    const keys = parseList(draft.sshKeys);
    if (keys.length === 0) {
      setError("Add at least one SSH public key to generate a script.");
      return;
    }
    setDraft((prev) => ({
      ...prev,
      preLaunchScript: buildSshPreLaunchScript(keys),
    }));
    setStatus("Pre-launch script generated from SSH keys.");
    setError(null);
  };

  const validateDraft = () => {
    if (!draft.name.trim()) return "Deployment name is required.";
    if (!draft.dockerCompose.trim()) return "Docker Compose file is required.";
    if (selectedNode?.support_onchain_kms) {
      return "Selected node requires on-chain KMS. Use a built-in KMS node to deploy from the console.";
    }
    return null;
  };

  const handleProvision = async () => {
    setError(null);
    setStatus(null);
    setProvisionData(null);
    setDeployResult(null);

    const validationError = validateDraft();
    if (validationError) {
      setError(validationError);
      return;
    }

    setProvisioning(true);
    try {
      const csrf = await getCsrfToken();
      const response = await fetch("/api/cvms/provision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrf,
        },
        body: JSON.stringify(reviewPayload),
      });

      if (!response.ok) {
        throw new Error(await readResponseMessage(response));
      }

      const payload = (await response.json()) as ProvisionResponse;
      setProvisionData(payload);
      setStatus("Provisioned resources. Ready to deploy.");
    } catch (provisionError) {
      setError(resolveErrorMessage(provisionError, "Provisioning failed."));
    } finally {
      setProvisioning(false);
    }
  };

  const handleDeploy = async () => {
    setError(null);
    setStatus(null);

    if (!provisionData?.compose_hash) {
      setError("Provision resources before deploying.");
      return;
    }

    if (!provisionData.app_id) {
      setError("Provision returned no app_id. On-chain KMS deployments require manual app auth.");
      return;
    }

    setDeploying(true);
    try {
      const envKeys = parseList(draft.envKeys);
      const csrf = await getCsrfToken();
      const response = await fetch("/api/cvms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrf,
        },
        body: JSON.stringify({
          app_id: provisionData.app_id,
          compose_hash: provisionData.compose_hash,
          encrypted_env: draft.encryptedEnv || undefined,
          env_keys: envKeys.length > 0 ? envKeys : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(await readResponseMessage(response));
      }

      const payload = (await response.json()) as CommitResponse;
      setDeployResult(payload);
      setStatus("Deployment requested. CVM is provisioning.");
    } catch (deployError) {
      setError(resolveErrorMessage(deployError, "Deployment failed."));
    } finally {
      setDeploying(false);
    }
  };

  const handleEncryptEnv = async () => {
    setEnvError(null);
    setEnvStatus(null);

    if (!provisionData?.app_env_encrypt_pubkey) {
      setEnvError("Provision first to obtain the encryption public key.");
      return;
    }

    const { env, invalid } = parseEnvInput(envInput);
    if (invalid.length > 0) {
      setEnvError(`Invalid env entries: ${invalid.join(", ")}`);
      return;
    }
    if (Object.keys(env).length === 0) {
      setEnvError("Add at least one KEY=VALUE pair to encrypt.");
      return;
    }

    setEnvEncrypting(true);
    try {
      const encrypted = await encryptEnvironmentVariables(env, provisionData.app_env_encrypt_pubkey);
      setDraft((prev) => ({ ...prev, encryptedEnv: encrypted }));
      setEnvStatus("Encrypted env payload generated and added to the deploy request.");
    } catch (encryptError) {
      setEnvError(resolveErrorMessage(encryptError, "Failed to encrypt environment variables."));
    } finally {
      setEnvEncrypting(false);
    }
  };

  const instanceLink = useMemo(() => {
    const appId = deployResult?.app_id || provisionData?.app_id;
    if (!appId) return null;
    const normalized = normalizeCvmId(appId);
    return `/dashboard/instances/${normalized}`;
  }, [deployResult?.app_id, provisionData?.app_id]);

  const selectedNodeLabel = selectedNode
    ? `${selectedNode.name ?? "Node"} (ID ${selectedNode.teepod_id})`
    : resolvedTeepodId
      ? `Manual node ID ${resolvedTeepodId}`
      : "Auto-select";

  const selectedNodeStatus = selectedNode?.support_onchain_kms
    ? "On-chain KMS"
    : "Built-in KMS";

  const selectedNodeMeta = selectedNode
    ? `${selectedNodeStatus} • ${selectedNode.remaining_vcpu ?? "-"} vCPU • ${
        selectedNode.remaining_memory ?? "-"
      } MB`
    : null;

  const parsedPorts = useMemo(() => parsePorts(draft.openPorts), [draft.openPorts]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Deploy CVM</h1>
          <p className="text-text-secondary mt-1">
            Provision and deploy a confidential VM using the Nexis Cloud API.
          </p>
        </div>
        <Link
          className={buttonClassName({ variant: "secondary" })}
          href="/dashboard/instances"
        >
          Back to instances
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Step {activeStep + 1} of {steps.length}: {steps[activeStep]}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {steps.map((step, index) => (
              <div
                key={step}
                className={cn(
                  "px-3 py-1 rounded-full text-xs",
                  index === activeStep
                    ? "bg-accent-sky/10 text-accent-sky"
                    : "bg-background-surface text-text-muted"
                )}
              >
                {step}
              </div>
            ))}
          </div>

          {optionsLoading && (
            <div className="text-sm text-text-secondary">Loading deployment options...</div>
          )}

          {optionsError && (
            <div className="text-sm text-red-400">
              {optionsError} You can still deploy with manual inputs.
            </div>
          )}

          {templateSlug && (
            <div className="rounded-md border border-border-default bg-background-surface p-3 text-sm text-text-secondary">
              {templateLoading && <div>Loading template {templateSlug}...</div>}
              {!templateLoading && templateInfo && (
                <div>
                  Template loaded:{" "}
                  <span className="text-text-primary font-medium">{templateInfo.name}</span>
                </div>
              )}
              {!templateLoading && templateError && (
                <div className="text-red-400">{templateError}</div>
              )}
              {!templateLoading && !templateInfo && !templateError && (
                <div>Template {templateSlug} not found.</div>
              )}
            </div>
          )}

          {activeStep === 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm text-text-secondary">Deployment name</label>
                <Input
                  value={draft.name}
                  onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="my-cvm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-text-secondary">Target node</label>
                {nodes.length > 0 ? (
                  <select
                    value={draft.nodeId}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        nodeId: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-md border border-border-default bg-background-surface px-3 text-sm text-text-secondary"
                  >
                    <option value="">Auto-select best node</option>
                    {nodes.map((node) => (
                      <option key={node.teepod_id} value={String(node.teepod_id)}>
                        {node.name ?? "Node"} • {node.teepod_id}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    value={draft.nodeId}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        nodeId: event.target.value,
                      }))
                    }
                    placeholder="Manual teepod ID (leave blank for auto-select)"
                  />
                )}
                <div className="text-xs text-text-muted">
                  {selectedNodeLabel}
                  {selectedNodeMeta ? ` · ${selectedNodeMeta}` : ""}
                </div>
                {selectedNode?.support_onchain_kms && (
                  <div className="text-xs text-amber-300">
                    On-chain KMS nodes require app auth. Choose a built-in KMS node to deploy here.
                  </div>
                )}
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm text-text-secondary">OS image</label>
                {availableImages.length > 0 ? (
                  <select
                    value={draft.image}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        image: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-md border border-border-default bg-background-surface px-3 text-sm text-text-secondary"
                  >
                    {availableImages.map((image) => (
                      <option key={image.name} value={image.name}>
                        {image.name}
                        {image.is_dev ? " (dev)" : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    value={draft.image}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        image: event.target.value,
                      }))
                    }
                    placeholder="dstack-0.5.x"
                  />
                )}
                <div className="text-xs text-text-muted">
                  Images are sourced from available nodes. Choose a stable image for production.
                </div>
              </div>
            </div>
          )}

          {activeStep === 1 && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm text-text-secondary">Instance type</label>
                {instanceTypes.length > 0 ? (
                  <select
                    value={draft.instanceType}
                    onChange={(event) => {
                      setDraft((prev) => ({
                        ...prev,
                        instanceType: event.target.value,
                      }));
                      setDiskSizeTouched(false);
                    }}
                    className="h-10 w-full rounded-md border border-border-default bg-background-surface px-3 text-sm text-text-secondary"
                  >
                    {instanceTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                        {type.family ? ` (${type.family})` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    value={draft.instanceType}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        instanceType: event.target.value,
                      }))
                    }
                    placeholder="tdx.small"
                  />
                )}
                {selectedInstanceType && (
                  <div className="text-xs text-text-muted">
                    {selectedInstanceType.vcpu ?? "-"} vCPU · {selectedInstanceType.memory_mb ?? "-"}
                    MB · {selectedInstanceType.hourly_rate ?? "-"} / hr
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm text-text-secondary">Disk size (GB)</label>
                <Input
                  value={draft.diskSize}
                  onChange={(event) => {
                    setDraft((prev) => ({ ...prev, diskSize: event.target.value }));
                    setDiskSizeTouched(true);
                  }}
                  placeholder={
                    selectedInstanceType?.default_disk_size_gb
                      ? String(selectedInstanceType.default_disk_size_gb)
                      : "20"
                  }
                />
                <div className="text-xs text-text-muted">
                  Leave blank to use the instance default disk size.
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-text-secondary">vCPU override (optional)</label>
                <Input
                  value={draft.vcpu}
                  onChange={(event) => setDraft((prev) => ({ ...prev, vcpu: event.target.value }))}
                  placeholder={selectedInstanceType?.vcpu ? String(selectedInstanceType.vcpu) : ""}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-text-secondary">Memory override (MB)</label>
                <Input
                  value={draft.memory}
                  onChange={(event) => setDraft((prev) => ({ ...prev, memory: event.target.value }))}
                  placeholder={
                    selectedInstanceType?.memory_mb ? String(selectedInstanceType.memory_mb) : ""
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="listed"
                  type="checkbox"
                  className="h-4 w-4 rounded border-border-default bg-background-surface"
                  checked={draft.listed}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, listed: event.target.checked }))
                  }
                />
                <label htmlFor="listed" className="text-sm text-text-secondary">
                  List this CVM in the public directory
                </label>
              </div>
            </div>
          )}

          {activeStep === 2 && (
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm text-text-secondary">Open ports</label>
                  <Input
                    value={draft.openPorts}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        openPorts: event.target.value,
                      }))
                    }
                    placeholder="80,443"
                  />
                  <div className="text-xs text-text-muted">
                    Ports are used to generate the compose template. Edit the compose file for custom
                    routing.
                  </div>
                  <Button type="button" variant="secondary" onClick={handleApplyPorts}>
                    Apply ports to compose template
                  </Button>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-text-secondary">SSH public keys</label>
                  <textarea
                    className="w-full min-h-[120px] rounded-md border border-border-default bg-background-surface p-3 text-sm text-text-primary"
                    value={draft.sshKeys}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        sshKeys: event.target.value,
                      }))
                    }
                    placeholder="ssh-ed25519 AAAA..."
                  />
                  <div className="text-xs text-text-muted">
                    Optional. Generates a pre-launch script to write authorized_keys for images that
                    include sshd.
                  </div>
                  <Button type="button" variant="secondary" onClick={handleGeneratePreLaunch}>
                    Generate pre-launch script
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center gap-2">
                  <input
                    id="gatewayEnabled"
                    type="checkbox"
                    className="h-4 w-4 rounded border-border-default bg-background-surface"
                    checked={draft.gatewayEnabled}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, gatewayEnabled: event.target.checked }))
                    }
                  />
                  <label htmlFor="gatewayEnabled" className="text-sm text-text-secondary">
                    Enable gateway access
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="publicLogs"
                    type="checkbox"
                    className="h-4 w-4 rounded border-border-default bg-background-surface"
                    checked={draft.publicLogs}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, publicLogs: event.target.checked }))
                    }
                  />
                  <label htmlFor="publicLogs" className="text-sm text-text-secondary">
                    Public logs
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="publicSysinfo"
                    type="checkbox"
                    className="h-4 w-4 rounded border-border-default bg-background-surface"
                    checked={draft.publicSysinfo}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, publicSysinfo: event.target.checked }))
                    }
                  />
                  <label htmlFor="publicSysinfo" className="text-sm text-text-secondary">
                    Public system metrics
                  </label>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm text-text-secondary">Environment keys (allowed)</label>
                  <Input
                    value={draft.envKeys}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        envKeys: event.target.value,
                      }))
                    }
                    placeholder="DATABASE_URL,API_KEY"
                  />
                  <div className="text-xs text-text-muted">
                    Required for image versions ≥ 0.5.x when using encrypted env vars.
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-text-secondary">Encrypted env (optional)</label>
                  <Input
                    value={draft.encryptedEnv}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        encryptedEnv: event.target.value,
                      }))
                    }
                    placeholder="Hex-encoded encrypted env payload"
                  />
                  <div className="text-xs text-text-muted">
                    Paste encrypted env output from CLI/SDK if needed.
                  </div>
                </div>
              </div>

              {parsedPorts.length === 0 && draft.openPorts.trim().length > 0 && (
                <div className="text-xs text-amber-300">
                  No valid ports detected. Use comma-separated numbers like 80,443.
                </div>
              )}
            </div>
          )}

          {activeStep === 3 && (
            <div className="grid gap-4">
              <div className="space-y-2">
                <label className="text-sm text-text-secondary">Docker Compose</label>
                <textarea
                  className="w-full min-h-[200px] rounded-md border border-border-default bg-background-surface p-3 text-sm text-text-primary font-mono"
                  value={draft.dockerCompose}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      dockerCompose: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-text-secondary">Pre-launch script</label>
                <textarea
                  className="w-full min-h-[140px] rounded-md border border-border-default bg-background-surface p-3 text-sm text-text-primary font-mono"
                  value={draft.preLaunchScript}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      preLaunchScript: event.target.value,
                    }))
                  }
                  placeholder="Optional shell script to run before launch"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-text-secondary">
                  Encrypt environment variables (KEY=VALUE per line)
                </label>
                <textarea
                  className="w-full min-h-[140px] rounded-md border border-border-default bg-background-surface p-3 text-sm text-text-primary font-mono"
                  value={envInput}
                  onChange={(event) => setEnvInput(event.target.value)}
                  placeholder="DATABASE_URL=postgres://...\nAPI_KEY=secret"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleEncryptEnv}
                    isLoading={envEncrypting}
                    disabled={!provisionData?.app_env_encrypt_pubkey}
                  >
                    Encrypt env with provisioned pubkey
                  </Button>
                  {provisionData?.app_env_encrypt_pubkey && (
                    <span className="text-xs text-text-muted">
                      Pubkey loaded from provision response.
                    </span>
                  )}
                </div>
                {envStatus && <div className="text-sm text-text-secondary">{envStatus}</div>}
                {envError && <div className="text-sm text-red-400">{envError}</div>}
              </div>
              <div className="space-y-2">
                <label className="text-sm text-text-secondary">Review payload</label>
                <pre className="rounded-md border border-border-default bg-background-surface p-3 text-xs text-text-secondary overflow-auto">
                  {reviewJson}
                </pre>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={saveDraft}>
                  Save draft
                </Button>
                <Button type="button" variant="secondary" onClick={copyDraft}>
                  Copy JSON
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleProvision}
                  isLoading={provisioning}
                >
                  Provision resources
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleDeploy}
                  isLoading={deploying}
                  disabled={!provisionData?.compose_hash}
                >
                  Deploy CVM
                </Button>
              </div>
              {provisionData?.compose_hash && (
                <div className="text-xs text-text-muted">
                  Provisioned with compose hash {provisionData.compose_hash}. App ID: {provisionData.app_id || "pending"}.
                </div>
              )}
              {instanceLink && (
                <Link
                  className={buttonClassName({ variant: "secondary", size: "sm" })}
                  href={instanceLink}
                >
                  View instance
                </Link>
              )}
              {status && <div className="text-sm text-text-secondary">{status}</div>}
              {error && <div className="text-sm text-red-400">{error}</div>}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={goBack} disabled={activeStep === 0}>
              Back
            </Button>
            {activeStep < steps.length - 1 ? (
              <Button type="button" onClick={goNext}>
                Continue
              </Button>
            ) : (
              <Button type="button" onClick={() => router.push("/dashboard/instances")}>
                Finish
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
