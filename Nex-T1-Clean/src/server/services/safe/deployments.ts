// Domain: wallets (Safe)
// Responsibility: Resolve Safe + module deployment addresses for a chain.
// Depends on: @safe-global/safe-deployments, @safe-global/safe-modules-deployments
// Notes:
// - Supports env overrides for custom networks (e.g., HyperEVM).

import {
  getProxyFactoryDeployments,
  getSafeL2SingletonDeployments,
  getSafeSingletonDeployments,
} from "@safe-global/safe-deployments";
import {
  getAllowanceModuleDeployment,
  getSafe4337ModuleDeployment,
  getSafeModuleSetupDeployment,
  getSocialRecoveryModuleDeployment,
} from "@safe-global/safe-modules-deployments";
import { isNonZeroEVMAddress } from "@/lib/utils/token-utils";

export type SafeDeploymentAddresses = {
  safeSingleton: `0x${string}`;
  proxyFactory: `0x${string}`;
  moduleSetup: `0x${string}`;
  safe4337Module: `0x${string}`;
  allowanceModule: `0x${string}` | null;
  recoveryModule: `0x${string}` | null;
};

function pickNetworkAddress(
  networkAddresses: Record<string, string | string[]> | undefined,
  chainId: number,
): `0x${string}` | null {
  const key = String(chainId);
  const entry = networkAddresses?.[key];
  if (typeof entry === "string" && entry.startsWith("0x") && isNonZeroEVMAddress(entry)) {
    return entry as `0x${string}`;
  }
  if (Array.isArray(entry) && typeof entry[0] === "string" && entry[0].startsWith("0x") && isNonZeroEVMAddress(entry[0])) {
    return entry[0] as `0x${string}`;
  }
  return null;
}

function envOverride(chainId: number, suffix: string): `0x${string}` | null {
  const key = `SAFE_${suffix}_${chainId}`;
  const value = process.env[key]?.trim();
  if (value && value.startsWith("0x") && isNonZeroEVMAddress(value)) return value as `0x${string}`;
  return null;
}

export function resolveSafeDeployments(chainId: number): SafeDeploymentAddresses {
  const singleton =
    envOverride(chainId, "SINGLETON") ??
    pickNetworkAddress(getSafeL2SingletonDeployments({ network: String(chainId) })?.networkAddresses, chainId) ??
    pickNetworkAddress(getSafeSingletonDeployments({ network: String(chainId) })?.networkAddresses, chainId);

  const proxyFactory =
    envOverride(chainId, "PROXY_FACTORY") ??
    pickNetworkAddress(getProxyFactoryDeployments({ network: String(chainId) })?.networkAddresses, chainId);

  const moduleSetup =
    envOverride(chainId, "MODULE_SETUP") ??
    pickNetworkAddress(getSafeModuleSetupDeployment({ network: String(chainId) })?.networkAddresses, chainId);

  const safe4337Module =
    envOverride(chainId, "SAFE_4337_MODULE") ??
    pickNetworkAddress(getSafe4337ModuleDeployment({ network: String(chainId) })?.networkAddresses, chainId);

  const allowanceModule =
    envOverride(chainId, "ALLOWANCE_MODULE") ??
    pickNetworkAddress(getAllowanceModuleDeployment({ network: String(chainId) })?.networkAddresses, chainId);

  const recoveryModule =
    envOverride(chainId, "RECOVERY_MODULE") ??
    pickNetworkAddress(getSocialRecoveryModuleDeployment({ network: String(chainId) })?.networkAddresses, chainId);

  if (!singleton) throw new Error(`Safe singleton deployment not found for chainId=${chainId}`);
  if (!proxyFactory) throw new Error(`Safe proxy factory deployment not found for chainId=${chainId}`);
  if (!moduleSetup) throw new Error(`Safe module setup deployment not found for chainId=${chainId}`);
  if (!safe4337Module) throw new Error(`Safe4337 module deployment not found for chainId=${chainId}`);
  
  return { 
    safeSingleton: singleton, 
    proxyFactory, 
    moduleSetup, 
    safe4337Module, 
    allowanceModule: allowanceModule ?? null,
    recoveryModule: recoveryModule ?? null,
  };
}

export function buildSafeModuleList(deployments: SafeDeploymentAddresses): `0x${string}`[] {
  const modules: Array<`0x${string}` | null> = [
    deployments.safe4337Module,
    deployments.allowanceModule,
    deployments.recoveryModule,
  ];
  const seen = new Set<string>();
  const filtered: `0x${string}`[] = [];
  modules.forEach((moduleAddress) => {
    if (!moduleAddress) return;
    if (!isNonZeroEVMAddress(moduleAddress)) return;
    const key = moduleAddress.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    filtered.push(moduleAddress);
  });
  return filtered;
}
