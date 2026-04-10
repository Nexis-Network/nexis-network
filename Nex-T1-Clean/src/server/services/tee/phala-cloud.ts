import { createClient, encryptEnvVars, type EnvVar } from "@phala/cloud";

import {
  computeAttestationHash,
  verifyAttestation,
  type AttestationArtifact,
  type AttestationPolicy,
} from "@/server/services/tee/attestation-policy";

export type PhalaConfig = {
  baseUrl?: string;
  apiKey: string;
};

export type ContainerSpec = {
  image: string; // fully qualified image ref (GHCR/Docker Hub)
  env?: Record<string, string>;
  resources?: { vcpu?: number; memoryMb?: number; diskGb?: number };
};

export type ContainerHandle = {
  id: string; // app_id (40-char hex) returned by Phala Cloud
  url?: string; // public app URL if available
};

function getConfig(): PhalaConfig {
  const apiKey =
    process.env.PHALA_API_KEY?.trim() ||
    process.env.PHALA_TOKEN?.trim() ||
    process.env.PHALA_CLOUD_API_KEY?.trim() ||
    "";
  if (!apiKey) {
    throw new Error("Phala env not configured: set PHALA_API_KEY (or PHALA_TOKEN)");
  }

  const baseUrl = process.env.PHALA_BASE_URL?.trim() || undefined;
  return { apiKey, baseUrl };
}

function createPhalaClient() {
  const cfg = getConfig();
  return createClient({
    apiKey: cfg.apiKey,
    ...(cfg.baseUrl ? { baseURL: cfg.baseUrl } : {}),
  });
}

function renderRuntimeComposeFile(params: { image: string }): string {
  // NOTE: env vars are provided via Phala encrypted env (env_keys + encrypted_env),
  // not as plaintext in the docker compose file.
  return [
    `version: "3.8"`,
    `services:`,
    `  agent-runtime:`,
    `    image: ${params.image}`,
    `    container_name: agent-runtime`,
    `    ports:`,
    `      - "8080:8080"`,
    `    restart: unless-stopped`,
    `    read_only: true`,
    `    cap_drop:`,
    `      - ALL`,
    `    user: "10001:10001"`,
  ].join("\n");
}

function toEnvVars(env: Record<string, string> | undefined): EnvVar[] {
  if (!env) return [];
  return Object.entries(env)
    .map(([key, value]) => ({ key, value: String(value) }))
    .filter((item) => item.key.trim().length > 0);
}

// Create a CVM instance that runs our runtime image (provision → commit)
export async function createContainer(spec: ContainerSpec): Promise<ContainerHandle> {
  const client = createPhalaClient();

  const envVars = toEnvVars(spec.env);
  const envKeys = envVars.map((item) => item.key);

  const provision = await client.provisionCvm({
    name: `nex-agent-${Date.now()}`,
    compose_file: {
      docker_compose_file: renderRuntimeComposeFile({ image: spec.image }),
      // Required for modern OS images when using env vars; include all env keys to allow.
      allowed_envs: envKeys,
      gateway_enabled: true,
      kms_enabled: true,
      public_logs: false,
      public_sysinfo: false,
    },
    // Enable encrypted env injection (must be a subset of allowed_envs).
    env_keys: envKeys,
    listed: false,
    ...(spec.resources?.vcpu ? { vcpu: spec.resources.vcpu } : {}),
    ...(spec.resources?.memoryMb ? { memory: spec.resources.memoryMb } : {}),
    ...(spec.resources?.diskGb ? { disk_size: spec.resources.diskGb } : {}),
  });

  if (!provision.app_id) {
    throw new Error("phala_provision_missing_app_id");
  }
  if (envVars.length > 0 && !provision.app_env_encrypt_pubkey) {
    throw new Error("phala_provision_missing_env_encrypt_pubkey");
  }

  const encryptedEnv =
    envVars.length > 0 && provision.app_env_encrypt_pubkey
      ? await encryptEnvVars(envVars, provision.app_env_encrypt_pubkey)
      : "";

  const commit = await client.commitCvmProvision({
    app_id: provision.app_id,
    compose_hash: provision.compose_hash,
    encrypted_env: encryptedEnv,
    env_keys: envKeys,
  });

  const id = commit.app_id ?? provision.app_id;
  let url = (commit as { app_url?: string | null }).app_url ?? null;

  if (!url) {
    try {
      const network = await client.getCvmNetwork({ id });
      url = network.public_urls?.[0]?.app ?? null;
    } catch {}
  }

  return { id, url: url || undefined };
}

export async function startContainer(id: string): Promise<void> {
  const client = createPhalaClient();
  await client.startCvm({ id }).catch(() => undefined);
}

export async function stopContainer(id: string): Promise<void> {
  const client = createPhalaClient();
  await client.stopCvm({ id }).catch(() => undefined);
}

async function resolvePublicAppUrl(client: ReturnType<typeof createPhalaClient>, id: string): Promise<string | null> {
  try {
    const network = await client.getCvmNetwork({ id });
    const fromNetwork = network.public_urls?.[0]?.app;
    if (fromNetwork) return fromNetwork;
  } catch {}

  try {
    const info = await client.getCvmInfo({ id });
    const maybeUrls = (info as { public_urls?: Array<{ app: string }> }).public_urls;
    const fromInfo = maybeUrls?.[0]?.app;
    if (fromInfo) return fromInfo;
  } catch {}

  return null;
}

export async function fetchAttestation(id: string): Promise<AttestationArtifact> {
  const client = createPhalaClient();

  const maxAttempts = 20;
  const delayMs = 1000;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const baseUrl = await resolvePublicAppUrl(client, id);
    if (baseUrl) {
      try {
        const attestUrl = new URL("/attest", baseUrl).toString();
        const res = await fetch(attestUrl, { headers: { accept: "application/json" } });
        if (res.ok) {
          return (await res.json()) as AttestationArtifact;
        }
      } catch {}
    }

    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  throw new Error("phala_attestation_unavailable");
}

export async function attestContainer(
  id: string,
  policy: AttestationPolicy,
): Promise<
  | { ok: true; hash: string; artifact: AttestationArtifact }
  | { ok: false; hash: string; reason: string; artifact: AttestationArtifact }
> {
  const artifact = await fetchAttestation(id);
  const hash = computeAttestationHash(artifact);
  const res = verifyAttestation(artifact, policy);
  return { ...res, hash, artifact };
}
