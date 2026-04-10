import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const NEXT_DIR = path.join(ROOT, process.env.NEXT_DIST_DIR || ".next-build");
const BUILD_MANIFEST_PATH = path.join(NEXT_DIR, "build-manifest.json");
const STATIC_CHUNKS_DIR = path.join(NEXT_DIR, "static", "chunks");

const MAX_ROOT_MAIN_BYTES = Number.parseInt(process.env.MAX_ROOT_MAIN_BYTES ?? "450000", 10);
const MAX_LARGEST_ROOT_MAIN_FILE_BYTES = Number.parseInt(
  process.env.MAX_LARGEST_ROOT_MAIN_FILE_BYTES ?? "225000",
  10,
);

function collectFiles(dir, result = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      collectFiles(fullPath, result);
      continue;
    }

    result.push(fullPath);
  }

  return result;
}

function formatBytes(value) {
  return `${(value / 1024).toFixed(1)} KB`;
}

if (!existsSync(BUILD_MANIFEST_PATH)) {
  console.error(`Missing ${path.relative(ROOT, BUILD_MANIFEST_PATH)}. Run \`pnpm build\` before \`pnpm perf:budgets\`.`);
  process.exit(1);
}

if (!existsSync(STATIC_CHUNKS_DIR)) {
  console.error(`Missing ${path.relative(ROOT, STATIC_CHUNKS_DIR)}. Run \`pnpm build\` before \`pnpm perf:budgets\`.`);
  process.exit(1);
}

const buildManifest = JSON.parse(readFileSync(BUILD_MANIFEST_PATH, "utf8"));
const rootMainFiles = Array.isArray(buildManifest.rootMainFiles) ? buildManifest.rootMainFiles : [];
const rootMainSizes = rootMainFiles
  .map((file) => {
    const absolutePath = path.join(NEXT_DIR, file.replace(/^\//, ""));
    return existsSync(absolutePath)
      ? { file, size: statSync(absolutePath).size }
      : null;
  })
  .filter((entry) => entry !== null);

const rootMainBytes = rootMainSizes.reduce((total, entry) => total + entry.size, 0);
const largestRootMainFile = [...rootMainSizes].sort((left, right) => right.size - left.size)[0];

const allChunkFiles = collectFiles(STATIC_CHUNKS_DIR)
  .filter((file) => file.endsWith(".js"))
  .map((file) => ({
    file: path.relative(NEXT_DIR, file),
    size: statSync(file).size,
  }))
  .sort((left, right) => right.size - left.size);

const largestChunk = allChunkFiles[0];

if (
  rootMainBytes > MAX_ROOT_MAIN_BYTES ||
  (largestRootMainFile?.size ?? 0) > MAX_LARGEST_ROOT_MAIN_FILE_BYTES
) {
  console.error(
    `Build budget failed: root main files total ${formatBytes(rootMainBytes)} / largest root-main file ${formatBytes(largestRootMainFile?.size ?? 0)}.`,
  );
  console.error(
    `Budgets: root main files <= ${formatBytes(MAX_ROOT_MAIN_BYTES)}, largest root-main file <= ${formatBytes(MAX_LARGEST_ROOT_MAIN_FILE_BYTES)}.`,
  );
  console.error("");
  console.error("Root main files:");
  for (const chunk of rootMainSizes.sort((left, right) => right.size - left.size)) {
    console.error(` - ${chunk.file}: ${formatBytes(chunk.size)}`);
  }
  process.exit(1);
}

console.log(
  `Build budget passed: root main files ${formatBytes(rootMainBytes)}, largest root-main file ${formatBytes(largestRootMainFile?.size ?? 0)}.`,
);
if (largestChunk) {
  console.log(`Largest emitted lazy chunk: ${largestChunk.file} (${formatBytes(largestChunk.size)}).`);
}
