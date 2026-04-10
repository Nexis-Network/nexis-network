const stats = new Map<string, { hits: number; misses: number; writes: number }>();

function ensureNs(namespace: string) {
  if (!stats.has(namespace)) {
    stats.set(namespace, { hits: 0, misses: 0, writes: 0 });
  }
  return stats.get(namespace)!;
}

export function recordCacheHit(namespace: string) {
  ensureNs(namespace).hits += 1;
}

export function recordCacheMiss(namespace: string) {
  ensureNs(namespace).misses += 1;
}

export function recordCacheWrite(namespace: string) {
  ensureNs(namespace).writes += 1;
}

export function getCacheStats() {
  return Array.from(stats.entries()).map(([namespace, entry]) => ({
    namespace,
    ...entry,
  }));
}

export function resetCacheStats() {
  stats.clear();
}
