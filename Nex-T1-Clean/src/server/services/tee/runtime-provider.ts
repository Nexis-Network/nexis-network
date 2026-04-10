export const INTERNAL_TEE_PROVIDERS = new Set(['railway', 'internal', 'local']);

export function isInternalTeeProvider(provider?: string | null): boolean {
  if (!provider) return false;
  return INTERNAL_TEE_PROVIDERS.has(provider.trim().toLowerCase());
}
