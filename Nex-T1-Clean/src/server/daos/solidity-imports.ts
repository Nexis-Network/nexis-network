import "server-only";

import fs from "node:fs";
import path from "node:path";

const NODE_MODULES_ROOT = path.resolve(process.cwd(), "node_modules");

export function resolveDaoSolidityImportPath(importPath: string): string {
  const trimmedImportPath = importPath.trim();
  if (!trimmedImportPath.startsWith("@openzeppelin/")) {
    throw new Error(`Unsupported Solidity import: ${importPath}`);
  }

  const resolvedPath = path.resolve(NODE_MODULES_ROOT, trimmedImportPath);
  const normalizedNodeModulesRoot = `${NODE_MODULES_ROOT}${path.sep}`;
  if (!resolvedPath.startsWith(normalizedNodeModulesRoot)) {
    throw new Error(`Unsafe Solidity import: ${importPath}`);
  }

  return resolvedPath;
}

export function loadDaoSolidityImport(
  importPath: string,
): { contents?: string; error?: string } {
  try {
    const resolvedPath = resolveDaoSolidityImportPath(importPath);
    return {
      contents: fs.readFileSync(resolvedPath, "utf8"),
    };
  } catch {
    return {
      error: `File not found: ${importPath}`,
    };
  }
}
