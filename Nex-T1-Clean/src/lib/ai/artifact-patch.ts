export type ArtifactPatchOperation =
  | {
      op: "set";
      path: string;
      value: UntypedJson;
    }
  | {
      op: "merge";
      path: string;
      value: Record<string, UntypedJson>;
    }
  | {
      op: "append";
      path: string;
      value: UntypedJson;
    }
  | {
      op: "upsertByKey";
      path: string;
      key: string;
      value: Record<string, UntypedJson>;
    }
  | {
      op: "removeByKey";
      path: string;
      key: string;
      value: UntypedJson;
    };

const isRecord = (value: unknown): value is Record<string, UntypedJson> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function decodePathToken(token: string): string {
  return token.replace(/~1/g, "/").replace(/~0/g, "~");
}

function parsePath(path: string): string[] {
  if (!path || path === "/") return [];
  return path
    .split("/")
    .slice(1)
    .map(decodePathToken)
    .filter((segment) => segment.length > 0);
}

function isArrayIndexToken(token: string | undefined): boolean {
  return typeof token === "string" && /^\d+$/.test(token);
}

function buildContainerForNextToken(nextToken: string | undefined): UntypedJson {
  return isArrayIndexToken(nextToken) ? [] : {};
}

function normalizeRoot(value: UntypedJson): UntypedJson {
  if (Array.isArray(value) || isRecord(value)) {
    return cloneValue(value);
  }

  return {};
}

function ensureParent(
  root: UntypedJson,
  path: string[],
): { root: UntypedJson; parent: UntypedJson; key: string | null } {
  const normalizedRoot = normalizeRoot(root);

  if (path.length === 0) {
    return { root: normalizedRoot, parent: normalizedRoot, key: null };
  }

  let current: UntypedJson = normalizedRoot;

  for (let index = 0; index < path.length - 1; index += 1) {
    const token = path[index];
    const nextToken = path[index + 1];

    if (Array.isArray(current)) {
      const arrayIndex = Number(token);
      if (!Array.isArray(current[arrayIndex]) && !isRecord(current[arrayIndex])) {
        current[arrayIndex] = buildContainerForNextToken(nextToken);
      }
      current = current[arrayIndex] as UntypedJson;
      continue;
    }

    const record = current as Record<string, UntypedJson>;
    if (!Array.isArray(record[token]) && !isRecord(record[token])) {
      record[token] = buildContainerForNextToken(nextToken);
    }
    current = record[token];
  }

  return {
    root: normalizedRoot,
    parent: current,
    key: path[path.length - 1] ?? null,
  };
}

function getValueAtPath(root: UntypedJson, path: string[]): UntypedJson {
  if (path.length === 0) {
    return root;
  }

  let current: UntypedJson = root;
  for (const token of path) {
    if (Array.isArray(current)) {
      const next = current[Number(token)];
      if (next === undefined) return undefined;
      current = next;
      continue;
    }

    if (!isRecord(current)) {
      return undefined;
    }

    const next = current[token];
    if (next === undefined) return undefined;
    current = next;
  }

  return current;
}

export function isArtifactPatchOperation(value: unknown): value is ArtifactPatchOperation {
  if (!isRecord(value) || typeof value.op !== "string" || typeof value.path !== "string") {
    return false;
  }

  switch (value.op) {
    case "set":
    case "append":
      return "value" in value;
    case "merge":
      return isRecord(value.value);
    case "upsertByKey":
      return typeof value.key === "string" && isRecord(value.value);
    case "removeByKey":
      return typeof value.key === "string" && "value" in value;
    default:
      return false;
  }
}

export function normalizeArtifactPatchOperations(
  patches: unknown,
): ArtifactPatchOperation[] {
  if (!Array.isArray(patches)) {
    return [];
  }

  return patches.filter(isArtifactPatchOperation);
}

export function applyArtifactPatch(
  current: UntypedJson,
  patch: ArtifactPatchOperation,
): UntypedJson {
  const path = parsePath(patch.path);

  switch (patch.op) {
    case "set": {
      if (path.length === 0) {
        return cloneValue(patch.value);
      }
      const { root, parent, key } = ensureParent(current, path);
      if (Array.isArray(parent) && key !== null) {
        parent[Number(key)] = cloneValue(patch.value);
      } else if (isRecord(parent) && key !== null) {
        parent[key] = cloneValue(patch.value);
      }
      return root;
    }
    case "merge": {
      const existing = getValueAtPath(current, path);
      const merged = {
        ...(isRecord(existing) ? existing : {}),
        ...cloneValue(patch.value),
      };
      return applyArtifactPatch(current, {
        op: "set",
        path: patch.path,
        value: merged,
      });
    }
    case "append": {
      const existing = getValueAtPath(current, path);
      const appended = [...(Array.isArray(existing) ? existing : []), cloneValue(patch.value)];
      return applyArtifactPatch(current, {
        op: "set",
        path: patch.path,
        value: appended,
      });
    }
    case "upsertByKey": {
      const existing = getValueAtPath(current, path);
      const nextArray = Array.isArray(existing) ? [...existing] : [];
      const nextValue = cloneValue(patch.value);
      const index = nextArray.findIndex((entry) => {
        if (!isRecord(entry)) return false;
        return entry[patch.key] === nextValue[patch.key];
      });

      if (index >= 0) {
        nextArray[index] = nextValue;
      } else {
        nextArray.push(nextValue);
      }

      return applyArtifactPatch(current, {
        op: "set",
        path: patch.path,
        value: nextArray,
      });
    }
    case "removeByKey": {
      const existing = getValueAtPath(current, path);
      const filtered = Array.isArray(existing)
        ? existing.filter((entry) => !isRecord(entry) || entry[patch.key] !== patch.value)
        : [];
      return applyArtifactPatch(current, {
        op: "set",
        path: patch.path,
        value: filtered,
      });
    }
    default: {
      const exhaustive: never = patch;
      return exhaustive;
    }
  }
}

export function applyArtifactPatches(
  current: UntypedJson,
  patches: ArtifactPatchOperation[],
): UntypedJson {
  return patches.reduce<UntypedJson>(
    (accumulator, patch) => applyArtifactPatch(accumulator, patch),
    current,
  );
}
