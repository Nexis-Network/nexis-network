import { readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE_DIR = path.join(ROOT, "src");
const ALLOWED_RUNTIME_JS = new Set([
  "src/app/.well-known/workflow/v1/flow/route.js",
  "src/app/.well-known/workflow/v1/step/route.js",
  "src/app/.well-known/workflow/v1/webhook/[token]/route.js",
  "src/components/pages/home/ai-index/ai-index.jsx",
  "src/components/pages/home/ai-index/animation/animation.jsx",
  "src/components/pages/home/ai-index/animation/index.js",
  "src/components/pages/home/ai-index/animation/parallax-vocabulary/index.js",
  "src/components/pages/home/ai-index/animation/parallax-vocabulary/parallax-vocabulary.jsx",
  "src/components/pages/home/ai-index/index.js",
  "src/components/pages/home/instant-provisioning/active-tab-context/active-tab-context.jsx",
  "src/components/pages/home/instant-provisioning/active-tab-context/index.js",
  "src/components/pages/home/instant-provisioning/blur-wrapper/blur-wrapper.jsx",
  "src/components/pages/home/instant-provisioning/blur-wrapper/index.js",
  "src/components/pages/home/instant-provisioning/code-tabs/code-tabs.jsx",
  "src/components/pages/home/instant-provisioning/code-tabs/index.js",
  "src/components/pages/home/instant-provisioning/code-tabs/navigation/index.js",
  "src/components/pages/home/instant-provisioning/code-tabs/navigation/navigation.jsx",
  "src/components/pages/home/instant-provisioning/connection-string/connection-string.jsx",
  "src/components/pages/home/instant-provisioning/connection-string/index.js",
  "src/components/pages/home/instant-provisioning/dots-animation/dots-animation.jsx",
  "src/components/pages/home/instant-provisioning/dots-animation/index.js",
  "src/components/pages/home/instant-provisioning/index.js",
  "src/components/pages/home/instant-provisioning/instant-provisioning.jsx",
  "src/lib/global-polyfill.js",
  "src/lib/global-self-polyfill.js",
  "src/lib/global-setup.js",
  "src/lib/mock-opentelemetry-api.js",
  "src/lib/mock-opentelemetry-core.js",
  "src/lib/mock-opentelemetry-semantic-conventions.js",
  "src/lib/mock-opentelemetry.js",
  "src/lib/mock-sonner.js",
  "src/lib/polycon.js",
  "src/lib/polyfills.js",
  "src/lib/self-polyfill.js",
  "src/lib/shiki.js",
  "src/lib/webpack-polyfill-plugin.js",
  "src/lib/window-polyfill.js",
]);

function walk(dir, result = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      walk(fullPath, result);
      continue;
    }

    if (fullPath.endsWith(".js") || fullPath.endsWith(".jsx")) {
      result.push(path.relative(ROOT, fullPath));
    }
  }

  return result;
}

const runtimeJsFiles = walk(SOURCE_DIR).sort();
const unexpectedFiles = runtimeJsFiles.filter((file) => !ALLOWED_RUNTIME_JS.has(file));

if (unexpectedFiles.length > 0) {
  console.error("Unexpected runtime .js/.jsx files detected:");
  for (const file of unexpectedFiles) {
    console.error(` - ${file}`);
  }
  console.error("");
  console.error("Migrate them to TypeScript or add a deliberate allowlist entry.");
  process.exit(1);
}

console.log(
  `Runtime JS audit passed: ${runtimeJsFiles.length} allowlisted .js/.jsx files remain under src/.`,
);
