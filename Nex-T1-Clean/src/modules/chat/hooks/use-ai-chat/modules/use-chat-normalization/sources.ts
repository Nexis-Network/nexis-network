import type { Source } from "@/lib/schema";

export function dedupeSources(sources: Source[]): Source[] {
  if (sources.length < 2) {
    return sources;
  }

  const seen = new Set<string>();
  const deduped: Source[] = [];

  for (const source of sources) {
    const key = `${source.id ?? ""}|${source.url}|${source.title}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(source);
  }

  return deduped;
}
