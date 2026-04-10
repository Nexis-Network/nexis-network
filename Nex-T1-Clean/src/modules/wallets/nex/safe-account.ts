import { toSafeSmartAccount, type ToSafeSmartAccountReturnType } from "permissionless/accounts";
import type { Account, Address, PublicClient } from "viem";
import { createNexPublicClient } from "./client-factory";

export interface CreateNexSmartAccountConfig {
  owner: Account;
  chainId: number;
  publicClient?: PublicClient;
  salt?: bigint; // Safe uses numeric salt
  safe4337ModuleAddress?: Address;
  safeProxyFactoryAddress?: Address;
  safeSingletonAddress?: Address;
  multiSendAddress?: Address;
  multiSendCallOnlyAddress?: Address;
}

export interface NexSmartAccountResult {
  account: ToSafeSmartAccountReturnType<"0.7">;
  address: Address;
  ownerAddress: Address;
  chainId: number;
  entryPointVersion: "0.6" | "0.7";
}

export const ENTRY_POINT_ADDRESSES = {
  "0.6": "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789" as Address,
  "0.7": "0x0000000071727De22E5E9d8BAf0edAc6f37da032" as Address,
} as const;

export async function createNexSmartAccount({
  owner,
  chainId,
  publicClient,
  salt,
  safe4337ModuleAddress,
  safeProxyFactoryAddress,
  safeSingletonAddress,
  multiSendAddress,
  multiSendCallOnlyAddress,
}: CreateNexSmartAccountConfig): Promise<NexSmartAccountResult> {
  const client = publicClient ?? createNexPublicClient(chainId);
  const entryPointVersion = "0.7"; 
  const entryPointAddress = "0x0000000071727De22E5E9d8BAf0edAc6f37da032" as Address;

  const account = await toSafeSmartAccount({
    client: client as Parameters<typeof toSafeSmartAccount>[0]["client"],
    owners: [owner] as Parameters<typeof toSafeSmartAccount>[0]["owners"],
    entryPoint: {
      address: entryPointAddress,
      version: entryPointVersion,
    },
    saltNonce: salt ?? 0n,
    version: "1.4.1",
    safe4337ModuleAddress,
    safeProxyFactoryAddress,
    safeSingletonAddress,
    multiSendAddress,
    multiSendCallOnlyAddress,
  });

  return {
    account,
    address: account.address,
    ownerAddress: owner.address,
    chainId,
    entryPointVersion,
  };
}

export async function getSmartAccountAddress(config: Omit<CreateNexSmartAccountConfig, "publicClient">): Promise<Address> {
  const result = await createNexSmartAccount(config);
  return result.address;
}

/**
 * Calculate Safe address without requiring a signer (unlocked wallet).
 * This allows showing the wallet address in the UI even when locked.
 */
export async function calculateSafeAddress({
  ownerAddress,
  chainId,
  salt,
}: {
  ownerAddress: Address;
  chainId: number;
  salt?: bigint;
}): Promise<Address> {
  // Create a mock owner that satisfies the interface but only has the address
  // permissionless.js uses the address property to generate the initCode
  const mockOwner = {
    address: ownerAddress,
  } as Account;

  const { address } = await createNexSmartAccount({
    owner: mockOwner,
    chainId,
    salt,
  });

  return address;
}

export async function isSmartAccountDeployed({
  address,
  chainId,
}: {
  address: Address;
  chainId: number;
}): Promise<boolean> {
  const client = createNexPublicClient(chainId);
  const code = await client.getCode({ address });
  return code !== undefined && code !== "0x";
}
