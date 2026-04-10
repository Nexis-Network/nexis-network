import path from "node:path";
import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), "");

  const sharedTestConfig = {
    globals: true,
    setupFiles: ["./tests/setup-vitest.ts"],
    env,
    testTimeout: 15000,
    hookTimeout: 15000,
  };

  const browserProject = {
    extends: true as const,
    test: {
      ...sharedTestConfig,
      environment: "jsdom" as const,
      include: ["tests/**/*.test.ts", "tests/**/*.test.tsx", "src/**/*.test.ts", "src/**/*.test.tsx"],
      exclude: ["tests/middleware*.test.ts"],
    },
  };

  const middlewareProject = {
    extends: true as const,
    test: {
      ...sharedTestConfig,
      environment: "node" as const,
      include: ["tests/middleware*.test.ts"],
    },
  };

  return {
    test: {
      projects: [browserProject, middlewareProject],
    },
    resolve: {
      alias: [
        {
          find: "@/hooks/use-market-stream",
          replacement: path.resolve(__dirname, "src/hooks/use-market-stream.ts"),
        },
        { find: "@/hooks", replacement: path.resolve(__dirname, "src/lib/hooks") },
        { find: "@/domain", replacement: path.resolve(__dirname, "src/modules") },
        {
          find: "@/modules/ai-agent-multi-step-tools",
          replacement: path.resolve(__dirname, "src/modules/ai-agent-multi-step-tools"),
        },
        {
          find: "@/modules/ai-agent-evaluator-optimizer-tools",
          replacement: path.resolve(__dirname, "src/modules/ai-agent-evaluator-optimizer-tools"),
        },
        { find: "@/tools.json", replacement: path.resolve(__dirname, "tools.json") },
        { find: "@/goat_plan_min.json", replacement: path.resolve(__dirname, "goat_plan_min.json") },
        { find: "@/goat_command_menu_min.json", replacement: path.resolve(__dirname, "goat_command_menu_min.json") },
        { find: "@", replacement: path.resolve(__dirname, "src") },
        // Next.js provides a virtual "server-only" module at runtime; Vitest needs a stub
        { find: "server-only", replacement: path.resolve(__dirname, "tests/mocks/server-only.ts") },
      ],
    },
  };
});
