#!/usr/bin/env node

/**
 * CI guard ensuring no Better Auth imports linger in the runtime codebase.
 * Scans source directories for variants of "better-auth" / "better_auth".
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SEARCH_TARGETS = ["app", "components", "hooks", "lib", "utils", "scripts", "middleware.ts", "next.config.mjs"];
const EXCLUDE_DIRS = new Set(["node_modules", ".next", ".git", "public", "temp-docs", "docs", "tests", "test-results", "admin-dashboard"]);
const PATTERN = /better[-_]auth/i;

const failures = [];

function shouldSkip(entryPath) {
  const parts = entryPath.split(path.sep);
  return parts.some((part) => EXCLUDE_DIRS.has(part));
}

function scanFile(filePath) {
  if (filePath.endsWith(`${path.sep}scripts${path.sep}check-better-auth.js`)) {
    return;
  }
  try {
    let content = fs.readFileSync(filePath, "utf8");
    if (filePath.endsWith("package.json")) {
      content = content.replace(/lint:better-auth/gi, "");
    }
    if (PATTERN.test(content)) {
      failures.push(filePath.replace(ROOT + path.sep, ""));
    }
  } catch (error) {
    console.error(`[better-auth-guard] Failed to read ${filePath}:`, error.message);
    process.exitCode = 1;
  }
}

function walk(entryPath) {
  if (shouldSkip(entryPath)) {
    return;
  }

  const stats = fs.statSync(entryPath);
  if (stats.isDirectory()) {
    for (const child of fs.readdirSync(entryPath)) {
      walk(path.join(entryPath, child));
    }
  } else if (stats.isFile()) {
    const ext = path.extname(entryPath);
    if ([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"].includes(ext) || entryPath.endsWith("middleware.ts")) {
      scanFile(entryPath);
    }
  }
}

for (const target of SEARCH_TARGETS) {
  const targetPath = path.join(ROOT, target);
  if (fs.existsSync(targetPath)) {
    walk(targetPath);
  }
}

if (failures.length > 0) {
  console.error("\n[better-auth-guard] Detected forbidden Better Auth references in runtime files:\n");
  failures.forEach((file) => {
    console.error(`  - ${file}`);
  });
  console.error("\nRemove these references or move them to documentation before committing.\n");
  process.exit(1);
} else {
  console.log("[better-auth-guard] Success: no Better Auth references found in runtime sources.");
}
