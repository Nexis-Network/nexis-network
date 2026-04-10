// Domain: wallets (Safe)
// Responsibility: Resolve Safe Passkey module deployments and derive signer addresses.
// Depends on: @safe-global/safe-modules-deployments, @simplewebauthn/server helpers, viem
// Notes:
// - Passkey module deployments are not available on every chain; callers must handle nulls.

import { createPublicClient, http, type Address } from "viem";
import { decodeCredentialPublicKey, cose } from "@simplewebauthn/server/helpers";
import {
  getFCLP256VerifierDeployment,
  getSafeWebAuthnShareSignerDeployment,
  getSafeWebAuthnSignerFactoryDeployment,
} from "@safe-global/safe-modules-deployments";

export type SafePasskeyDeployments = {
  signerFactory: Address;
  sharedSigner: Address;
  fclP256Verifier: Address;
};

function envOverride(chainId: number, suffix: string): Address | null {
  const key = `SAFE_${suffix}_${chainId}`;
  const value = process.env[key]?.trim();
  if (value && value.startsWith("0x") && value.length === 42) return value as Address;
  return null;
}

export function resolveSafePasskeyDeployments(chainId: number): SafePasskeyDeployments | null {
  const signerFactory =
    envOverride(chainId, "WEBAUTHN_SIGNER_FACTORY") ??
    (getSafeWebAuthnSignerFactoryDeployment({ released: true, network: String(chainId) })?.networkAddresses?.[
      String(chainId)
    ] as Address | undefined);

  const sharedSigner =
    envOverride(chainId, "WEBAUTHN_SHARED_SIGNER") ??
    (getSafeWebAuthnShareSignerDeployment({ released: true, network: String(chainId) })?.networkAddresses?.[
      String(chainId)
    ] as Address | undefined);

  const fclP256Verifier =
    envOverride(chainId, "FCL_P256_VERIFIER") ??
    (getFCLP256VerifierDeployment({ released: true, network: String(chainId) })?.networkAddresses?.[
      String(chainId)
    ] as Address | undefined);

  if (!signerFactory || !sharedSigner || !fclP256Verifier) return null;
  return { signerFactory, sharedSigner, fclP256Verifier };
}

function toBigInt(bytes: Uint8Array): bigint {
  const hex = Buffer.from(bytes).toString("hex") || "00";
  return BigInt(`0x${hex}`);
}

export function extractP256CoordinatesFromCosePublicKey(publicKeyCose: Uint8Array): { x: bigint; y: bigint } {
  const decoded = decodeCredentialPublicKey(new Uint8Array(publicKeyCose)) as UntypedJson as Map<number, UntypedJson>;
  const xBytes = decoded.get(cose.COSEKEYS.x);
  const yBytes = decoded.get(cose.COSEKEYS.y);
  if (!(xBytes instanceof Uint8Array) || !(yBytes instanceof Uint8Array)) {
    throw new Error("passkey_public_key_missing_xy");
  }
  return { x: toBigInt(xBytes), y: toBigInt(yBytes) };
}

const SIGNER_FACTORY_ABI = [
  {
    type: "function",
    name: "getSigner",
    stateMutability: "view",
    inputs: [
      { name: "x", type: "uint256" },
      { name: "y", type: "uint256" },
      { name: "verifiers", type: "uint176" },
    ],
    outputs: [{ name: "signer", type: "address" }],
  },
] as const;

export async function derivePasskeySignerAddress(params: {
  chainId: number;
  rpcUrl: string;
  publicKeyCose: Uint8Array;
}): Promise<{ signerAddress: Address; x: bigint; y: bigint; verifier: Address }> {
  const deployments = resolveSafePasskeyDeployments(params.chainId);
  if (!deployments) {
    throw new Error("passkey_module_unavailable");
  }

  const { x, y } = extractP256CoordinatesFromCosePublicKey(params.publicKeyCose);

  // Safe uses `P256.Verifiers` packed value. We use 0x00..00 | fallbackVerifier (no precompile).
  const verifiersPacked = BigInt(deployments.fclP256Verifier);

  const publicClient = createPublicClient({ transport: http(params.rpcUrl) });
  const signerAddress = await publicClient.readContract({
    address: deployments.signerFactory,
    abi: SIGNER_FACTORY_ABI,
    functionName: "getSigner",
    args: [x, y, verifiersPacked],
  });

  return { signerAddress, x, y, verifier: deployments.fclP256Verifier };
}
