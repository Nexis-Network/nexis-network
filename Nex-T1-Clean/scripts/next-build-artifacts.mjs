import fs from "node:fs/promises";
import path from "node:path";

const EMPTY_MIDDLEWARE_MANIFEST = {
  version: 3,
  middleware: {},
  sortedMiddleware: [],
  functions: {},
};

function sortObjectByKey(input) {
  return Object.fromEntries(
    Object.entries(input).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function mergeMiddlewareManifests(manifests) {
  const manifest = {
    ...EMPTY_MIDDLEWARE_MANIFEST,
    middleware: {},
    functions: {},
  };
  let instrumentation;

  for (const partial of manifests) {
    Object.assign(manifest.middleware, partial.middleware ?? {});
    Object.assign(manifest.functions, partial.functions ?? {});
    if (partial.instrumentation) {
      instrumentation = partial.instrumentation;
    }
  }

  const instrumentationFiles = instrumentation?.files ?? [];
  const withInstrumentation = (entry) => ({
    ...entry,
    files: [...instrumentationFiles, ...(entry.files ?? [])],
  });

  manifest.middleware = sortObjectByKey(
    Object.fromEntries(
      Object.entries(manifest.middleware).map(([route, entry]) => [
        route,
        withInstrumentation(entry),
      ]),
    ),
  );
  manifest.functions = sortObjectByKey(
    Object.fromEntries(
      Object.entries(manifest.functions).map(([route, entry]) => [
        route,
        withInstrumentation(entry),
      ]),
    ),
  );
  manifest.sortedMiddleware = Object.keys(manifest.middleware);

  return manifest;
}

async function readJsonIfPresent(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return null;
    }

    throw error;
  }
}

export async function ensureNextMiddlewareManifest({
  repoRoot,
  distDir = ".next",
} = {}) {
  const manifestPath = path.join(repoRoot, distDir, "server", "middleware-manifest.json");
  const existingManifest = await readJsonIfPresent(manifestPath);

  if (existingManifest) {
    return {
      manifestPath,
      created: false,
    };
  }

  const partialPaths = [
    path.join(repoRoot, distDir, "server", "middleware", "middleware-manifest.json"),
    path.join(repoRoot, distDir, "server", "instrumentation", "middleware-manifest.json"),
  ];
  const partials = [];

  for (const partialPath of partialPaths) {
    const partial = await readJsonIfPresent(partialPath);
    if (partial) {
      partials.push(partial);
    }
  }

  const manifest =
    partials.length > 0
      ? mergeMiddlewareManifests(partials)
      : EMPTY_MIDDLEWARE_MANIFEST;

  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  return {
    manifestPath,
    created: true,
  };
}
