// Domain: wallets (Safe)
// Responsibility: Resolve a server-side relayer signer for Safe tx execution.
// Depends on: env
// Notes:
// - This key only pays gas; Safe enforces signatures on-chain.
// - Prefer RELAYER_PRIVATE_KEY. Fallback to PRIVATE_KEY.

export function getSafeRelayerPrivateKey(): string {
  const relayer = process.env.RELAYER_PRIVATE_KEY?.trim();
  if (relayer) return relayer;

  const deployer = process.env.PRIVATE_KEY?.trim();
  if (deployer) return deployer;

  throw new Error("Missing RELAYER_PRIVATE_KEY (or PRIVATE_KEY fallback)");
}
