import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { ensureNextMiddlewareManifest } from "./next-build-artifacts.mjs";
import { inferNextDistDir } from "./next-dist-dir.mjs";

const DEFAULT_LOCK_WAIT_MS = 5_000;
const DEFAULT_LOCK_POLL_MS = 100;

function getRepoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

function getNextBin(repoRoot) {
  return path.join(repoRoot, "node_modules", "next", "dist", "bin", "next");
}

function getBuildIdPath(repoRoot, distDir = ".next") {
  return path.join(repoRoot, distDir, "BUILD_ID");
}

export async function clearNextBuildLock(options = {}) {
  const repoRoot = options.repoRoot ?? getRepoRoot();
  const distDir = options.distDir ?? ".next";
  const lockWaitMs = options.lockWaitMs ?? DEFAULT_LOCK_WAIT_MS;
  const lockPollMs = options.lockPollMs ?? DEFAULT_LOCK_POLL_MS;
  const lockPath = path.join(repoRoot, distDir, "lock");

  const startedAt = Date.now();

  while (Date.now() - startedAt < lockWaitMs) {
    try {
      await fs.access(lockPath);
      await delay(lockPollMs);
    } catch {
      return {
        lockPath,
        removed: false,
      };
    }
  }

  await fs.rm(lockPath, { force: true });

  return {
    lockPath,
    removed: true,
  };
}

export async function ensureNextBuildId(options = {}) {
  const repoRoot = options.repoRoot ?? getRepoRoot();
  const distDir = options.distDir ?? ".next";
  const buildIdPath = getBuildIdPath(repoRoot, distDir);

  try {
    const existingBuildId = (await fs.readFile(buildIdPath, "utf8")).trim();

    if (existingBuildId) {
      return {
        buildIdPath,
        buildId: existingBuildId,
        created: false,
      };
    }
  } catch {
    // Build ID is absent; synthesize one so generate mode can finalize the build.
  }

  const buildId = options.buildId ?? randomBytes(16).toString("hex");

  await fs.mkdir(path.dirname(buildIdPath), { recursive: true });
  await fs.writeFile(buildIdPath, buildId, "utf8");

  return {
    buildIdPath,
    buildId,
    created: true,
  };
}

export async function runNextBuildPhase(options) {
  const repoRoot = options?.repoRoot ?? getRepoRoot();
  const mode = options?.mode;
  const distDir = options?.distDir ?? process.env.NEXT_DIST_DIR ?? inferNextDistDir(["node", "next", "build"]);

  if (mode !== "compile" && mode !== "generate") {
    throw new Error(`Unsupported Next build mode: ${String(mode)}`);
  }

  const nextBin = getNextBin(repoRoot);

  await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [nextBin, "build", "--experimental-build-mode", mode],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          NEXT_DIST_DIR: distDir,
        },
        stdio: "inherit",
      },
    );

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve(undefined);
        return;
      }

      reject(
        new Error(
          `next build (${mode}) failed with ${signal ? `signal ${signal}` : `exit code ${String(code)}`}`,
        ),
      );
    });
  });
}

export async function runPhasedNextBuild(options = {}) {
  const repoRoot = options.repoRoot ?? getRepoRoot();
  const distDir = options.distDir ?? process.env.NEXT_DIST_DIR ?? inferNextDistDir(["node", "next", "build"]);
  process.env.NEXT_DIST_DIR = distDir;
  const initialLockResult = await clearNextBuildLock({ repoRoot, distDir });

  if (initialLockResult.removed) {
    console.warn(`Removed stale Next build lock at ${initialLockResult.lockPath} before compile`);
  }

  await runNextBuildPhase({ repoRoot, distDir, mode: "compile" });

  const lockResult =
    options.lockResult ??
    (await clearNextBuildLock({ repoRoot, distDir }));

  if (lockResult.removed) {
    console.warn(`Removed stale Next build lock at ${lockResult.lockPath}`);
  }

  const buildIdResult = await ensureNextBuildId({ repoRoot, distDir });

  if (buildIdResult.created) {
    console.warn(`Created missing Next build ID at ${buildIdResult.buildIdPath}`);
  }

  const middlewareManifestResult = await ensureNextMiddlewareManifest({ repoRoot, distDir });

  if (middlewareManifestResult.created) {
    console.warn(`Created missing Next middleware manifest at ${middlewareManifestResult.manifestPath}`);
  }

  await runNextBuildPhase({ repoRoot, distDir, mode: "generate" });
}

const executedAsScript =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (executedAsScript) {
  runPhasedNextBuild().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
