import "server-only";

import { getAddress, type Address, type Hex } from "viem";

export const ENS_SUBNAME_RUNTIME_UNAVAILABLE_MESSAGE =
  "ENS subname claims are temporarily unavailable. Please try again later.";

const MAINNET_RPC_ENV_KEYS = [
  "ENS_MAINNET_RPC_URL",
  "PREMIUM_RPC_URL_ETHEREUM",
  "ETHEREUM_RPC_URL",
] as const;

const BASE_RPC_ENV_KEYS = ["BASE_RPC_URL", "PREMIUM_RPC_URL_BASE"] as const;

const RELAYER_KEY_ENV_KEYS = [
  "ENS_SUBNAME_RELAYER_PRIVATE_KEY",
  "ENS_RELAYER_PRIVATE_KEY",
] as const;

export type EnsSubnameRuntimeReadiness = {
  ready: boolean;
  message: string | null;
  missingEnvNames: string[];
};

export class EnsSubnameRuntimeUnavailableError extends Error {
  readonly missingEnvNames: string[];

  constructor(missingEnvNames: string[]) {
    super(ENS_SUBNAME_RUNTIME_UNAVAILABLE_MESSAGE);
    this.name = "EnsSubnameRuntimeUnavailableError";
    this.missingEnvNames = missingEnvNames;
  }
}

function readConfiguredEnv(keys: readonly string[]): string {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) {
      return value;
    }
  }

  return "";
}

export function getEnsMainnetRpcUrl(): string {
  const value = readConfiguredEnv(MAINNET_RPC_ENV_KEYS);
  if (!value) {
    throw new Error("ENS mainnet RPC URL is not configured.");
  }

  return value;
}

export function getEnsBaseRpcUrl(): string {
  const value = readConfiguredEnv(BASE_RPC_ENV_KEYS);
  if (!value) {
    throw new Error("ENS Base RPC URL is not configured.");
  }

  return value;
}

export function getEnsRelayerPrivateKey(): Hex {
  const value = readConfiguredEnv(RELAYER_KEY_ENV_KEYS);
  if (!value) {
    throw new Error("ENS relayer private key is not configured.");
  }

  return value as Hex;
}

export function getEnsRegistrarAddress(): Address {
  const value = process.env.ENS_SUBNAME_REGISTRAR_ADDRESS?.trim() || "";
  if (!value) {
    throw new Error("ENS_SUBNAME_REGISTRAR_ADDRESS is not configured.");
  }

  return getAddress(value);
}

export function getEnsSubnameRuntimeReadiness(): EnsSubnameRuntimeReadiness {
  const missingEnvNames: string[] = [];

  if (!process.env.ENS_SUBNAME_REGISTRAR_ADDRESS?.trim()) {
    missingEnvNames.push("ENS_SUBNAME_REGISTRAR_ADDRESS");
  }

  if (!readConfiguredEnv(RELAYER_KEY_ENV_KEYS)) {
    missingEnvNames.push("ENS_SUBNAME_RELAYER_PRIVATE_KEY");
  }

  if (!readConfiguredEnv(MAINNET_RPC_ENV_KEYS)) {
    missingEnvNames.push("ENS_MAINNET_RPC_URL");
  }

  if (!readConfiguredEnv(BASE_RPC_ENV_KEYS)) {
    missingEnvNames.push("BASE_RPC_URL");
  }

  return {
    ready: missingEnvNames.length === 0,
    message:
      missingEnvNames.length === 0 ? null : ENS_SUBNAME_RUNTIME_UNAVAILABLE_MESSAGE,
    missingEnvNames,
  };
}

export function assertEnsSubnameRuntimeReady(): void {
  const readiness = getEnsSubnameRuntimeReadiness();
  if (!readiness.ready) {
    throw new EnsSubnameRuntimeUnavailableError(readiness.missingEnvNames);
  }
}
