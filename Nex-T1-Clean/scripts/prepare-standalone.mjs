import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { inferNextDistDir } from "./next-dist-dir.mjs";

function assertPathExists(targetPath, description) {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Missing ${description} at ${targetPath}`);
  }
}

function ensureDirectory(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function replaceDirectory(sourcePath, targetPath) {
  if (!fs.existsSync(sourcePath)) {
    return false;
  }

  fs.rmSync(targetPath, { recursive: true, force: true });
  ensureDirectory(path.dirname(targetPath));
  fs.cpSync(sourcePath, targetPath, { recursive: true });
  return true;
}

function copyTopLevelFiles(sourceDir, targetDir) {
  ensureDirectory(targetDir);

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (!entry.isFile() && !entry.isSymbolicLink()) {
      continue;
    }

    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    fs.copyFileSync(sourcePath, targetPath);
  }
}

export function prepareStandaloneRuntime({
  repoRoot,
  distDir = ".next",
} = {}) {
  const resolvedRepoRoot = repoRoot
    ? path.resolve(repoRoot)
    : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const buildDir = path.join(resolvedRepoRoot, distDir);
  const standaloneDir = path.join(buildDir, "standalone");
  const runtimeDistDir = path.join(standaloneDir, distDir);
  const standaloneServerPath = path.join(standaloneDir, "server.js");
  const buildServerDir = path.join(buildDir, "server");
  const buildStaticDir = path.join(buildDir, "static");
  const publicDir = path.join(resolvedRepoRoot, "public");

  assertPathExists(buildDir, `Next.js build output for distDir "${distDir}"`);
  assertPathExists(standaloneDir, "standalone build output");
  assertPathExists(standaloneServerPath, "standalone server entrypoint");

  copyTopLevelFiles(buildDir, runtimeDistDir);
  replaceDirectory(buildServerDir, path.join(runtimeDistDir, "server"));
  replaceDirectory(buildStaticDir, path.join(runtimeDistDir, "static"));
  replaceDirectory(publicDir, path.join(standaloneDir, "public"));

  return {
    buildDir,
    runtimeDistDir,
    standaloneDir,
  };
}

const invokedAsScript =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedAsScript) {
  const { standaloneDir } = prepareStandaloneRuntime({
    repoRoot: process.cwd(),
    distDir: process.env.NEXT_DIST_DIR || inferNextDistDir(["node", "next", "build"]),
  });

  console.log(`[prepare-standalone] Prepared runtime at ${standaloneDir}`);
}
