"use client";

import type { Source } from "@/components/dashboard/chat-types";

export function mergeSyncSources(
  left: Source[] = [],
  right: Source[] = [],
): Source[] {
  if (!left.length) {
    return right;
  }

  if (!right.length) {
    return left;
  }

  const seen = new Set<string>();
  const merged: Source[] = [];

  for (const source of [...left, ...right]) {
    const id = source?.id ?? "";
    const url = source?.url ?? "";
    const key = id || url;
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(source);
  }

  return merged;
}
