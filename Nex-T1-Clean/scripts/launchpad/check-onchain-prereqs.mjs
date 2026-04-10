#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import dotenv from "dotenv";
import { privateKeyToAccount } from "viem/accounts";

const cwd = process.cwd();

for (const file of [".env.local", ".env"]) {
  const fullPath = path.join(cwd, file);
  if (fs.existsSync(fullPath)) {
    dotenv.config({ path: fullPath, override: false });
  }
}

const REQUIRED_EVM_RPC = ["BASE_RPC_URL"];
const OPTIONAL_EVM_RPC = [
  "ETHEREUM_RPC_URL",
  "OPTIMISM_RPC_URL",
  "ARBITRUM_RPC_URL",
  "POLYGON_RPC_URL",
  "AVALANCHE_RPC_URL",
  "CELO_RPC_URL",
];
const OPTIONAL_SOLANA_RPC = ["SOLANA_RPC_URL", "NEXT_PUBLIC_SOLANA_RPC_URL"];

/** @type {Array<{level: "PASS"|"WARN"|"FAIL", message: string}>} */
const results = [];

function add(level, message) {
  results.push({ level, message });
}

function getEnv(name) {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

function asHexPrivateKey(raw) {
  if (!raw) return "";
  if (raw.startsWith("0x")) return raw;
  return `0x${raw}`;
}

async function probeEvmRpc(url) {
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "eth_chainId",
    params: [],
  };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, reason: `http_${response.status}` };
    const json = await response.json();
    if (json?.result && typeof json.result === "string") {
      return { ok: true, chainIdHex: json.result };
    }
    return { ok: false, reason: "bad_response" };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.name : "network_error" };
  } finally {
    clearTimeout(timeout);
  }
}

async function probeSolanaRpc(url) {
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "getHealth",
    params: [],
  };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, reason: `http_${response.status}` };
    const json = await response.json();
    if (json?.result === "ok" || json?.error?.message) {
      return { ok: true };
    }
    return { ok: false, reason: "bad_response" };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.name : "network_error" };
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const rawPrivateKey = getEnv("PRIVATE_KEY");
  if (!rawPrivateKey) {
    add("FAIL", "Missing PRIVATE_KEY.");
  } else {
    const normalized = asHexPrivateKey(rawPrivateKey);
    if (!/^0x[a-fA-F0-9]{64}$/.test(normalized)) {
      add("FAIL", "Private key is present but has invalid hex format.");
    } else {
      try {
        const account = privateKeyToAccount(normalized);
        add("PASS", `Deployer key format is valid. Derived address: ${account.address}`);
      } catch {
        add("FAIL", "Private key failed account derivation.");
      }
    }
  }

  for (const key of REQUIRED_EVM_RPC) {
    const value = getEnv(key);
    if (!value) {
      add("FAIL", `Missing required EVM RPC env: ${key}`);
      continue;
    }
    try {
      new URL(value);
    } catch {
      add("FAIL", `${key} is not a valid URL.`);
      continue;
    }
    const probe = await probeEvmRpc(value);
    if (probe.ok) {
      add("PASS", `${key} reachable (chainId=${probe.chainIdHex}).`);
    } else {
      add("FAIL", `${key} unreachable (${probe.reason}).`);
    }
  }

  for (const key of OPTIONAL_EVM_RPC) {
    const value = getEnv(key);
    if (!value) {
      add("WARN", `Optional EVM RPC not set: ${key}`);
      continue;
    }
    try {
      new URL(value);
    } catch {
      add("WARN", `${key} is set but not a valid URL.`);
      continue;
    }
    const probe = await probeEvmRpc(value);
    if (probe.ok) {
      add("PASS", `${key} reachable (chainId=${probe.chainIdHex}).`);
    } else {
      add("WARN", `${key} unreachable (${probe.reason}).`);
    }
  }

  const solanaUrl = OPTIONAL_SOLANA_RPC.map(getEnv).find(Boolean);
  if (!solanaUrl) {
    add("WARN", "Optional Solana RPC not configured (SOLANA_RPC_URL or NEXT_PUBLIC_SOLANA_RPC_URL).");
  } else {
    try {
      new URL(solanaUrl);
      const probe = await probeSolanaRpc(solanaUrl);
      if (probe.ok) {
        add("PASS", "Solana RPC reachable.");
      } else {
        add("WARN", `Solana RPC unreachable (${probe.reason}).`);
      }
    } catch {
      add("WARN", "Solana RPC env is set but not a valid URL.");
    }
  }

  const failCount = results.filter((r) => r.level === "FAIL").length;
  const warnCount = results.filter((r) => r.level === "WARN").length;
  const passCount = results.filter((r) => r.level === "PASS").length;

  for (const row of results) {
    const prefix = row.level.padEnd(4, " ");
    console.log(`${prefix} ${row.message}`);
  }
  console.log("");
  console.log(`Summary: ${passCount} pass, ${warnCount} warn, ${failCount} fail.`);

  if (failCount > 0) {
    process.exitCode = 1;
  }
}

await main();
