
import Safe, { type SafeAccountConfig, type ContractNetworksConfig } from "@safe-global/protocol-kit";
import { encodeFunctionData, type Address } from "viem";
import { buildSafeModuleList, resolveSafeDeployments } from "./deployments";
import { isNonZeroEVMAddress } from "@/lib/utils/token-utils";

// Inline ABI for module setup (same as provision.ts to avoid circular deps or duplication)
const MODULE_SETUP_ABI = [
  {
    type: "function",
    name: "enableModules",
    stateMutability: "nonpayable",
    inputs: [{ name: "modules", type: "address[]" }],
    outputs: [],
  },
] as const;

function toContractNetworks(chainId: number, deployments: ReturnType<typeof resolveSafeDeployments>): ContractNetworksConfig {
  return {
    [String(chainId)]: {
      safeSingletonAddress: deployments.safeSingleton,
      safeProxyFactoryAddress: deployments.proxyFactory,
    },
  };
}

/**
 * Predicts the counterfactual Safe address for a given configuration.
 * Does NOT require a real signer (uses a dummy signer or public provider check).
 * 
 * Note: Protocol Kit `init` requires a signer to create transactions, but for `getAddress`, 
 * it might be flexible. However, to be safe, we pass the deployer key if available 
 * or purely rely on the fact that we are just calculating `create2` hash.
 * 
 * To avoid exposing the private key here if not strictly necessary, we could potentially
 * replicate the create2 logic, but using the SDK is safer for compatibility.
 */
export async function predictSafeAddress({
    chainId,
    rpcUrl,
    owners,
    threshold,
    salt,
    deployerPrivateKey
}: {
    chainId: number;
    rpcUrl: string;
    owners: string[];
    threshold: number;
    salt: string;
    deployerPrivateKey?: string | null;
}): Promise<Address> {
    const deployments = resolveSafeDeployments(chainId);
    const contractNetworks = toContractNetworks(chainId, deployments);

    const modules = buildSafeModuleList(deployments);

    const safeAccountConfig: SafeAccountConfig = {
        owners,
        threshold,
        to: deployments.moduleSetup,
        data: encodeFunctionData({
            abi: MODULE_SETUP_ABI,
            functionName: "enableModules",
            args: [modules],
        }),
        fallbackHandler: deployments.safe4337Module,
    };

    const predictedSafe = { 
        safeAccountConfig, 
        safeDeploymentConfig: { saltNonce: salt } 
    };

    const protocolKit = await Safe.init({
        provider: rpcUrl,
        signer: deployerPrivateKey || undefined, // signer optional for address prediction
        predictedSafe,
        contractNetworks,
    });

    const predicted = (await protocolKit.getAddress()) as Address;
    if (!isNonZeroEVMAddress(predicted)) {
        throw new Error("safe_address_invalid");
    }
    return predicted;
}
