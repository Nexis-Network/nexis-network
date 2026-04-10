import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import { cacheLife, cacheTag } from "next/cache";

const DOCS_PRODUCT_ROOT = path.join(process.cwd(), "docs", "product");

function resolveDocsMarkdownPath(markdownPath: string) {
  const normalized = path.normalize(markdownPath);
  const absolute = path.join(DOCS_PRODUCT_ROOT, normalized);

  if (!absolute.startsWith(DOCS_PRODUCT_ROOT)) {
    throw new Error(`Invalid docs markdown path: ${markdownPath}`);
  }

  return absolute;
}

export async function loadDocsMarkdown(markdownPath: string): Promise<string> {
  "use cache";
  cacheLife("days");
  cacheTag("docs-content");
  cacheTag(`docs-page:${markdownPath}`);

  const absolute = resolveDocsMarkdownPath(markdownPath);
  return fs.readFile(absolute, "utf8");
}
