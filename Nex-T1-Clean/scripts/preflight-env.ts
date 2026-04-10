/*
 Domain: ops
 Responsibility: Fail-fast preflight checks for app, notifications, and Hardhat tooling.
 Depends on: process.env, filesystem (optional)
 Notes:
 - Never print secrets. Only report presence/absence and safe metadata (length).
 - Designed to be CI-friendly: in E2E_TEST_MODE, missing prod secrets are warnings.
*/

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

type Level = "error" | "warn";

type Issue = {
  level: Level;
  code: string;
  message: string;
  hint?: string;
};

type Options = {
  strict: boolean;
  ci: boolean;
  scope: "app" | "hardhat" | "all";
  verifySupabaseKey: boolean;
};

function parseArgs(argv: string[]): Options {
  const args = new Set(argv.slice(2));
  const strict = args.has("--strict");
  const ci = args.has("--ci");
  const verifySupabaseKey = args.has("--verify-supabase-key");

  const scope: Options["scope"] = args.has("--scope=hardhat")
    ? "hardhat"
    : args.has("--scope=app")
      ? "app"
      : args.has("--scope=all")
        ? "all"
        : "app";

  return { strict, ci, scope, verifySupabaseKey };
}

function isTruthy(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0 && value.trim() !== "0" && value.trim().toLowerCase() !== "false");
}

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v.trim() : undefined;
}

function extractSupabaseProjectRef(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const normalized =
      trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`;
    const hostname = new URL(normalized).hostname;
    const [projectRef] = hostname.split(".");
    return projectRef && projectRef.length > 0 ? projectRef : null;
  } catch {
    return null;
  }
}

function present(name: string): { ok: boolean; detail: string } {
  const v = env(name);
  if (!v) return { ok: false, detail: "missing" };
  // Never print values; only safe metadata.
  return { ok: true, detail: `set (len=${v.length})` };
}

function fileExists(p: string): boolean {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function canRunCircom(): { hasBinary: boolean; hasArtifacts: boolean } {
  const res = spawnSync("circom", ["--version"], { stdio: "ignore" });
  const hasBinary = res.status === 0;

  // Our hardhat tests expect circuits artifacts under smart-wallets/hardhat/circuits/build/*
  const root = path.join(process.cwd(), "smart-wallets", "hardhat", "circuits", "build");
  const hasArtifacts =
    fileExists(path.join(root, "circuit.wasm")) &&
    fileExists(path.join(root, "circuit_final.zkey")) &&
    fileExists(path.join(root, "circuit_js", "generate_witness.js"));

  return { hasBinary, hasArtifacts };
}

function pushIssue(issues: Issue[], issue: Issue) {
  issues.push(issue);
}

function requireEnv(issues: Issue[], name: string, opts: { level: Level; hint?: string }) {
  const v = env(name);
  if (!v) {
    pushIssue(issues, {
      level: opts.level,
      code: `missing_${name}`,
      message: `${name} is not set`,
      hint: opts.hint,
    });
  }
}

function checkSupabase(issues: Issue[], o: Options) {
  const e2eMode = isTruthy(process.env.E2E_TEST_MODE);
  const requiredLevel: Level = o.strict ? "error" : (o.ci || e2eMode ? "warn" : "error");

  const hasUrl = Boolean(env("NEXT_PUBLIC_SUPABASE_URL") ?? env("SUPABASE_URL"));
  const hasAnon = Boolean(
    env("NEXT_PUBLIC_SUPABASE_ANON_KEY") ??
      env("SUPABASE_ANON_KEY") ??
      env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY") ??
      env("SUPABASE_PUBLISHABLE_OR_ANON_KEY") ??
      env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY") ??
      env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ??
      env("SUPABASE_PUBLISHABLE_KEY"),
  );

  if (!hasUrl) {
    pushIssue(issues, {
      level: requiredLevel,
      code: "missing_supabase_url",
      message: "Supabase URL is not configured (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL)",
      hint: "Set NEXT_PUBLIC_SUPABASE_URL to https://<project>.supabase.co",
    });
  }

  if (!hasAnon) {
    pushIssue(issues, {
      level: requiredLevel,
      code: "missing_supabase_anon_key",
      message: "Supabase anon/publishable key is not configured",
      hint: "Set NEXT_PUBLIC_SUPABASE_ANON_KEY (preferred) or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    });
  }

  const refMap = new Map<string, string[]>();
  [
    { key: "NEXT_PUBLIC_SUPABASE_URL", value: env("NEXT_PUBLIC_SUPABASE_URL") },
    { key: "SUPABASE_URL", value: env("SUPABASE_URL") },
    { key: "SUPABASE_PROJECT_URL", value: env("SUPABASE_PROJECT_URL") },
  ].forEach(({ key, value }) => {
    const ref = extractSupabaseProjectRef(value);
    if (!ref) return;
    const entries = refMap.get(ref) ?? [];
    entries.push(key);
    refMap.set(ref, entries);
  });

  if (refMap.size > 1) {
    const summary = Array.from(refMap.entries())
      .map(([ref, keys]) => `${ref} ← ${keys.join(", ")}`)
      .join(" | ");
    pushIssue(issues, {
      level: requiredLevel,
      code: "supabase_url_mismatch",
      message:
        "Supabase URL envs resolve to different project refs. " +
        `Align NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL to the same project origin. (${summary})`,
      hint: "Mismatched project refs cause auth cookie key mismatches and 401s.",
    });
  }

  // Service role key is required for server-side auth/session flows.
  requireEnv(issues, "SUPABASE_SERVICE_ROLE_KEY", {
    level: !e2eMode && (o.strict || process.env.NODE_ENV === "production") ? "error" : "warn",
    hint: "Required for server-side auth/session flows. In CI/E2E_TEST_MODE this can be omitted (warnings only).",
  });
}

function resolveSupabaseUrlForProbe(): string | null {
  const raw = env("SUPABASE_URL") ?? env("NEXT_PUBLIC_SUPABASE_URL");
  if (!raw) return null;
  try {
    const withScheme = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
    return new URL(withScheme).origin.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

async function verifySupabaseServiceRoleKey(issues: Issue[], o: Options): Promise<{ attempted: boolean; status?: number; error?: string }> {
  const url = resolveSupabaseUrlForProbe();
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    return { attempted: false, error: "missing_url_or_service_key" };
  }

  const level: Level =
    o.strict || process.env.NODE_ENV === "production" ? "error" : "warn";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(`${url}/auth/v1/admin/users?per_page=1&page=1`, {
      method: "GET",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      pushIssue(issues, {
        level,
        code: "invalid_supabase_service_role_key",
        message: `Supabase service-role key probe failed with HTTP ${response.status}`,
        hint: "Regenerate a service_role/secret API key in Supabase project settings and update SUPABASE_SERVICE_ROLE_KEY.",
      });
    }
    return { attempted: true, status: response.status };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    pushIssue(issues, {
      level: "warn",
      code: "supabase_service_role_probe_error",
      message: `Supabase service-role key probe failed to execute: ${message}`,
      hint: "Verify network reachability to Supabase and retry with --verify-supabase-key.",
    });
    return { attempted: true, error: message };
  } finally {
    clearTimeout(timeout);
  }
}

function checkSafeWallets(issues: Issue[], o: Options) {
  const e2eMode = isTruthy(process.env.E2E_TEST_MODE);
  const requiredLevel: Level = !e2eMode && (o.strict || process.env.NODE_ENV === "production") ? "error" : "warn";

  requireEnv(issues, "SAFE_DEPLOYER_PRIVATE_KEY", {
    level: requiredLevel,
    hint: "Required to deploy per-user Safe accounts (server-side). Store only in server env.",
  });

  // Relayer key is required to execute approved tx requests.
  const hasRelayer = Boolean(env("SAFE_RELAYER_PRIVATE_KEY") ?? env("SAFE_DEPLOYER_PRIVATE_KEY"));
  if (!hasRelayer) {
    pushIssue(issues, {
      level: requiredLevel,
      code: "missing_safe_relayer_key",
      message: "Missing SAFE_RELAYER_PRIVATE_KEY (or SAFE_DEPLOYER_PRIVATE_KEY fallback) for relayed execution",
      hint: "Set SAFE_RELAYER_PRIVATE_KEY for production; use a dedicated gas payer key.",
    });
  }

  // Chain config: Base/OP/BNB have defaults; HyperEVM requires explicit chainId + rpc.
  const hyperId = Number(process.env.SAFE_HYPEREVM_CHAIN_ID ?? "");
  const hasHyper = Number.isFinite(hyperId) && hyperId > 0;
  if (hasHyper) {
    requireEnv(issues, "SAFE_RPC_URL_HYPEREVM", {
      level: requiredLevel,
      hint: "SAFE_HYPEREVM_CHAIN_ID is set, so SAFE_RPC_URL_HYPEREVM must be set as well.",
    });
  }
}

function resolveRedisConnectionStringFromEnv(): string | null {
  return (
    env("NEX_REDIS_URL") ??
    env("SHARED_CACHE_URL") ??
    env("REDIS_URL") ??
    env("RAILWAY_REDIS_URL") ??
    env("REDIS_TLS_URL") ??
    env("NEX_STORAGE_REDIS_URL") ??
    env("NEX_STORAGE_KV_URL") ??
    null
  );
}

function checkAiRuntimeGuardrails(issues: Issue[], o: Options) {
  const productionLike = o.strict || process.env.NODE_ENV === "production";
  const requiredLevel: Level = productionLike ? "error" : "warn";

  if (isTruthy(process.env.NEX_ALLOW_UNSAFE_SOLANA_SECRET_KEYS)) {
    pushIssue(issues, {
      level: requiredLevel,
      code: "unsafe_solana_secret_keys_enabled",
      message:
        "NEX_ALLOW_UNSAFE_SOLANA_SECRET_KEYS is enabled. Chat/runtime signing with raw secret-key material must stay disabled.",
      hint:
        "Unset NEX_ALLOW_UNSAFE_SOLANA_SECRET_KEYS before shipping. Use connected-wallet approval flows instead of raw signing keys.",
    });
  }

  if (isTruthy(process.env.SUPERAGENT_GUARDRAILS_DISABLED)) {
    pushIssue(issues, {
      level: requiredLevel,
      code: "superagent_guardrails_disabled",
      message:
        "SUPERAGENT_GUARDRAILS_DISABLED is enabled. Prompt/tool guardrails would fail open.",
      hint:
        "Unset SUPERAGENT_GUARDRAILS_DISABLED and keep guardrails enabled for production traffic.",
    });
  }

  const persistenceEnabled = process.env.AI_SDK_V6_CHAT_PERSISTENCE_ENABLED;
  if (typeof persistenceEnabled === "string" && !isTruthy(persistenceEnabled)) {
    pushIssue(issues, {
      level: requiredLevel,
      code: "chat_persistence_disabled",
      message:
        "AI_SDK_V6_CHAT_PERSISTENCE_ENABLED is explicitly disabled. Conversation persistence and stream resume would be degraded.",
      hint:
        "Remove the override or set AI_SDK_V6_CHAT_PERSISTENCE_ENABLED=true before shipping resumable chat.",
    });
  }

  const allowInMemoryRedis = isTruthy(process.env.NEX_ALLOW_IN_MEMORY_REDIS);
  if (productionLike && !resolveRedisConnectionStringFromEnv() && !allowInMemoryRedis) {
    pushIssue(issues, {
      level: "error",
      code: "missing_redis_connection",
      message:
        "Redis is not configured. Resume streams, active stream tracking, and transient approval state cannot be persisted safely.",
      hint:
        "Set NEX_REDIS_URL/REDIS_URL (or SHARED_CACHE_URL) before shipping AI SDK v6 chat flows.",
    });
  }
}

function checkWebPush(issues: Issue[], o: Options) {
  const e2eMode = isTruthy(process.env.E2E_TEST_MODE);
  const pushExpected = isTruthy(process.env.ENABLE_WEB_PUSH) || process.env.NODE_ENV === "production";
  const requiredLevel: Level = pushExpected && !e2eMode && (o.strict || process.env.NODE_ENV === "production") ? "error" : "warn";

  requireEnv(issues, "VAPID_PUBLIC_KEY", {
    level: requiredLevel,
    hint: "Generate via: pnpm exec tsx scripts/generate-vapid-keys.ts",
  });
  requireEnv(issues, "VAPID_PRIVATE_KEY", {
    level: requiredLevel,
    hint: "Generate via: pnpm exec tsx scripts/generate-vapid-keys.ts (never commit).",
  });
  requireEnv(issues, "VAPID_SUBJECT", {
    level: requiredLevel,
    hint: "Use a mailto: or https URL (e.g., mailto:security@nex-t1.ai).",
  });

  // Cron secret required if using /api/cron/notifications-push
  requireEnv(issues, "CRON_SECRET", {
    level: pushExpected && !e2eMode && (o.strict || process.env.NODE_ENV === "production") ? "warn" : "warn",
    hint: "Required to run /api/cron/notifications-push securely. Set a long random value.",
  });
}

function checkHardhat(issues: Issue[], o: Options) {
  const hardhatRoot = path.join(process.cwd(), "smart-wallets", "hardhat");
  if (!fileExists(hardhatRoot)) {
    return;
  }

  // Deploy-time key.
  const requiredLevel: Level = o.strict ? "error" : "warn";
  requireEnv(issues, "PRIVATE_KEY", {
    level: requiredLevel,
    hint: "Required for smart-wallets/hardhat deployments to non-local networks (Base/BNB/Optimism/HyperEVM).",
  });

  // RPC URLs for Phase 6 targets (env-driven). These can be omitted for local hardhat.
  const needsRpcChecks = o.strict;
  if (needsRpcChecks) {
    requireEnv(issues, "BASE_RPC_URL", { level: "warn", hint: "Optional (defaults to https://mainnet.base.org)." });
    requireEnv(issues, "OPTIMISM_RPC_URL", { level: "warn", hint: "Optional (defaults to https://mainnet.optimism.io)." });
    requireEnv(issues, "BNB_RPC_URL", { level: "warn", hint: "Optional (defaults to https://bsc-dataseed.binance.org)." });

    const hyperChainId = Number(process.env.HYPEREVM_CHAIN_ID ?? "0");
    if (Number.isFinite(hyperChainId) && hyperChainId > 0) {
      requireEnv(issues, "HYPEREVM_RPC_URL", {
        level: "error",
        hint: "HYPEREVM_CHAIN_ID is set, so HYPEREVM_RPC_URL must be set.",
      });
    }
  }

  // Circom prerequisites for circuit-dependent tests.
  const circom = canRunCircom();
  if (!circom.hasBinary || !circom.hasArtifacts) {
    pushIssue(issues, {
      level: "warn",
      code: "circom_prereqs_missing",
      message: "Circuit-dependent Hardhat tests will be skipped (circom binary and/or circuit build artifacts missing)",
      hint:
        "From smart-wallets/hardhat: run ./scripts/setup-circom.sh then generate artifacts into circuits/build (wasm/zkey/generate_witness.js).",
    });
  }
}

function formatIssues(issues: Issue[]): string {
  const lines: string[] = [];
  for (const issue of issues) {
    const prefix = issue.level === "error" ? "ERROR" : "WARN";
    lines.push(`- ${prefix} ${issue.code}: ${issue.message}`);
    if (issue.hint) lines.push(`  hint: ${issue.hint}`);
  }
  return lines.join("\n");
}

async function main() {
  const o = parseArgs(process.argv);
  const issues: Issue[] = [];
  let serviceRoleProbe: { attempted: boolean; status?: number; error?: string } = { attempted: false };

  if (o.scope === "app" || o.scope === "all") {
    checkSupabase(issues, o);
    checkSafeWallets(issues, o);
    checkAiRuntimeGuardrails(issues, o);
    if (o.verifySupabaseKey) {
      serviceRoleProbe = await verifySupabaseServiceRoleKey(issues, o);
    }
    checkWebPush(issues, o);
  }

  if (o.scope === "hardhat" || o.scope === "all") {
    checkHardhat(issues, o);
  }

  const hasErrors = issues.some((i) => i.level === "error");
  const hasWarns = issues.some((i) => i.level === "warn");

  // Minimal summary without secrets.
  const summary = {
    ok: !hasErrors,
    scope: o.scope,
    strict: o.strict,
    ci: o.ci,
    verifySupabaseKey: o.verifySupabaseKey,
    nodeEnv: process.env.NODE_ENV ?? "",
    e2eTestMode: isTruthy(process.env.E2E_TEST_MODE),
    counts: {
      errors: issues.filter((i) => i.level === "error").length,
      warns: issues.filter((i) => i.level === "warn").length,
    },
    presence: {
      SUPABASE_SERVICE_ROLE_KEY: present("SUPABASE_SERVICE_ROLE_KEY").detail,
      SAFE_DEPLOYER_PRIVATE_KEY: present("SAFE_DEPLOYER_PRIVATE_KEY").detail,
      SAFE_RELAYER_PRIVATE_KEY: present("SAFE_RELAYER_PRIVATE_KEY").detail,
      REDIS_URL: present("NEX_REDIS_URL").ok
        ? present("NEX_REDIS_URL").detail
        : present("REDIS_URL").detail,
      VAPID_PUBLIC_KEY: present("VAPID_PUBLIC_KEY").detail,
      VAPID_PRIVATE_KEY: present("VAPID_PRIVATE_KEY").detail,
      CRON_SECRET: present("CRON_SECRET").detail,
      HARDHAT_PRIVATE_KEY: present("PRIVATE_KEY").detail,
      SUPERAGENT_GUARDRAILS_DISABLED: present("SUPERAGENT_GUARDRAILS_DISABLED").detail,
      NEX_ALLOW_UNSAFE_SOLANA_SECRET_KEYS: present("NEX_ALLOW_UNSAFE_SOLANA_SECRET_KEYS").detail,
    },
    serviceRoleProbe,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (hasWarns) {
    console.log("\nPreflight issues:\n" + formatIssues(issues));
  }

  if (hasErrors) {
    process.exitCode = 1;
  }
}

void main();
