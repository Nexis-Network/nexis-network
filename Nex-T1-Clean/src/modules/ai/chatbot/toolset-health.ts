type ToolHealthEntry = {
  ok: number;
  fail: number;
  lastError?: string;
  lastFailAt?: number;
};

const toolHealthMap = new Map<string, ToolHealthEntry>();

export function recordToolHealth(toolId: string, success: boolean, error?: string): void {
  const entry = toolHealthMap.get(toolId) ?? { ok: 0, fail: 0 };
  if (success) {
    entry.ok += 1;
  } else {
    entry.fail += 1;
    entry.lastError = error;
    entry.lastFailAt = Date.now();
  }
  toolHealthMap.set(toolId, entry);
}

export function getToolHealthMap(): Record<string, ToolHealthEntry> {
  return Object.fromEntries(toolHealthMap);
}
