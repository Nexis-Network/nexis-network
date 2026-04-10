import nextConfig from "eslint-config-next";

// Next.js 16 flat config - modify existing configs to add custom rules
const eslintConfig = nextConfig.map((config, index) => {
  // Config 0 has react/jsx-a11y/@next/next/react-hooks plugins
  if (index === 0) {
    return {
      ...config,
      rules: {
        ...config.rules,
        "@next/next/no-img-element": "error",
        // Disable React Compiler rules - codebase not written for React Compiler
        "react-hooks/static-components": "off",
        "react-hooks/use-memo": "off",
        "react-hooks/component-hook-factories": "off",
        "react-hooks/preserve-manual-memoization": "off",
        "react-hooks/incompatible-library": "off",
        "react-hooks/immutability": "off",
        "react-hooks/globals": "off",
        "react-hooks/refs": "off",
        "react-hooks/set-state-in-effect": "off",
        "react-hooks/error-boundaries": "off",
        "react-hooks/purity": "off",
        "react-hooks/set-state-in-render": "off",
        "react-hooks/unsupported-syntax": "off",
        "react-hooks/config": "off",
        "react-hooks/gating": "off",
      },
    };
  }
  
  // Config 1 has @typescript-eslint plugin
  if (index === 1) {
    return {
      ...config,
      rules: {
        ...config.rules,
        "@typescript-eslint/no-explicit-any": [
          "error",
          {
            fixToUnknown: true,
          },
        ],
        "@typescript-eslint/ban-ts-comment": "error",
        "@typescript-eslint/no-unused-vars": [
          "warn",
          {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
          },
        ],
        "@typescript-eslint/no-require-imports": "off",
      },
    };
  }
  
  return config;
});

// Warn on console.log in production source code
eslintConfig.push({
  files: ["src/**/*.ts", "src/**/*.tsx"],
  ignores: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/**/*.spec.ts", "src/**/*.spec.tsx"],
  rules: {
    "no-console": ["warn", { allow: ["warn", "error"] }],
  },
});

// Disable Next.js specific rules for test files
eslintConfig.push({
  files: ["tests/**/*.ts", "tests/**/*.tsx", "tests/**/*.js"],
  rules: {
    "@next/next/no-assign-module-variable": "off",
    "import/no-anonymous-default-export": "off",
  },
});

eslintConfig.push({
  files: [
    "src/modules/watchlist/**/*.ts",
    "src/lib/approvals/**/*.ts",
    "src/server/tasks/**/*.ts",
    "src/server/settings/wallet-aggregator.ts",
    "src/lib/notifications.ts",
    "src/modules/watchlist/evaluator.ts",
    "src/types/watchlist.ts",
  ],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["@/components/*"],
            message: "Domain and server modules must stay UI-free. Move presentation concerns into components.",
          },
        ],
      },
    ],
    "no-restricted-syntax": [
      "error",
      {
        selector: "TSTypeReference Identifier[name='UntypedJson']",
        message: "Use JsonObject/JsonValue with '@/lib/json' helpers in hardened modules instead of UntypedJson.",
      },
    ],
  },
});

eslintConfig.push({
  files: ["src/lib/hooks/chat/use-automation-preferences.ts"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["@/server/*"],
            message: "Client hooks must not import server-only modules.",
          },
        ],
      },
    ],
  },
});

// Server modules must stay UI-free
eslintConfig.push({
  files: ["src/server/**/*.ts"],
  rules: {
    "no-restricted-imports": ["error", {
      patterns: [{
        group: ["@/components/*", "react", "react-dom"],
        message: "Server modules must stay UI-free.",
      }],
    }],
  },
});

// Global ignores
eslintConfig.push({
  ignores: [
    "**/.*/**",
    ".next/**",
    ".next-dev/**",
    ".next-dev*/**",
    "node_modules/**",
    "${HOME}/**",
    "coverage/**",
    "dist/**",
    "extension/dist/**",
    "build/**",
    "out/**",
    ".turbo/**",
    ".vercel/**",
    "test-results/**",
    "logs/**",
    "tee-runtime/**",
    "src/app/.well-known/workflow/**",
    "smart-wallets/**",
    "react-email-starter/**",
    "public/**",
    "src/components/tailark/blocks/**",
    "src/components/tailark/illustrations/**",
    "lib/ens-contracts/**",
    "lib/openzeppelin-contracts/**",
    "contracts/ens-subnames/lib/**",
  ],
});

export default eslintConfig;
