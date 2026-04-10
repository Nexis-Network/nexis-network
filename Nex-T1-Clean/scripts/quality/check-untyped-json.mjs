import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TARGET_DIRS = ["src", "types", "tests"];
const FILE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".d.ts"]);
const UNTYPED_JSON_PATTERN = /\bUntypedJson\b/g;

const MAX_UNTYPED_JSON_FILES = Number.parseInt(process.env.MAX_UNTYPED_JSON_FILES ?? "682", 10);
const MAX_UNTYPED_JSON_REFERENCES = Number.parseInt(
  process.env.MAX_UNTYPED_JSON_REFERENCES ?? "2882",
  10,
);

function walk(dir, result = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      walk(fullPath, result);
      continue;
    }

    if ([...FILE_EXTENSIONS].some((extension) => fullPath.endsWith(extension))) {
      result.push(fullPath);
    }
  }

  return result;
}

const offenders = [];

for (const relativeDir of TARGET_DIRS) {
  const absoluteDir = path.join(ROOT, relativeDir);
  try {
    for (const file of walk(absoluteDir)) {
      const text = readFileSync(file, "utf8");
      const matches = text.match(UNTYPED_JSON_PATTERN);
      if (!matches) {
        continue;
      }

      offenders.push({
        file: path.relative(ROOT, file),
        count: matches.length,
      });
    }
  } catch {
    // Ignore missing directories.
  }
}

const fileCount = offenders.length;
const referenceCount = offenders.reduce((total, offender) => total + offender.count, 0);

if (fileCount > MAX_UNTYPED_JSON_FILES || referenceCount > MAX_UNTYPED_JSON_REFERENCES) {
  console.error(
    `UntypedJson audit failed: ${fileCount} files / ${referenceCount} references exceed the current guardrail (${MAX_UNTYPED_JSON_FILES} files / ${MAX_UNTYPED_JSON_REFERENCES} references).`,
  );
  console.error("");
  console.error("Top offenders:");
  for (const offender of offenders.sort((left, right) => right.count - left.count).slice(0, 20)) {
    console.error(` - ${offender.file}: ${offender.count}`);
  }
  process.exit(1);
}

console.log(
  `UntypedJson audit passed: ${fileCount} files / ${referenceCount} references remain within the current no-regression guardrail.`,
);
