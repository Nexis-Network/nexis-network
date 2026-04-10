"use client";

import { useEffect, useMemo, useState } from "react";

import { logger } from "@/lib/logger";

type PrismLightComponent = typeof import("react-syntax-highlighter").Prism;
type PrismTheme = typeof import(
  "react-syntax-highlighter/dist/esm/styles/prism"
).oneDark;

type SyntaxHighlighterState = {
  component: PrismLightComponent;
  language: string;
  style: PrismTheme;
};

const LANGUAGE_ALIASES: Record<string, string> = {
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "tsx",
  py: "python",
  sh: "bash",
  shell: "bash",
  bash: "bash",
  yml: "yaml",
  plaintext: "text",
  text: "text",
  html: "markup",
};

const LANGUAGE_LOADERS: Record<string, () => Promise<{ default: UntypedJson }>> = {
  javascript: () =>
    import("react-syntax-highlighter/dist/esm/languages/prism/javascript"),
  typescript: () =>
    import("react-syntax-highlighter/dist/esm/languages/prism/typescript"),
  tsx: () => import("react-syntax-highlighter/dist/esm/languages/prism/tsx"),
  json: () => import("react-syntax-highlighter/dist/esm/languages/prism/json"),
  bash: () => import("react-syntax-highlighter/dist/esm/languages/prism/bash"),
  python: () =>
    import("react-syntax-highlighter/dist/esm/languages/prism/python"),
  yaml: () => import("react-syntax-highlighter/dist/esm/languages/prism/yaml"),
  markup: () =>
    import("react-syntax-highlighter/dist/esm/languages/prism/markup"),
};

let highlighterPromise: Promise<PrismLightComponent> | null = null;
let oneDarkThemePromise: Promise<PrismTheme> | null = null;
const registeredLanguages = new Set<string>();

function normalizeLanguage(language: string): string {
  const normalized = language?.toLowerCase?.().trim() ?? "";
  if (!normalized) {
    return "text";
  }

  return LANGUAGE_ALIASES[normalized] ?? normalized;
}

async function loadSyntaxHighlighter(
  language: string,
): Promise<SyntaxHighlighterState> {
  if (!highlighterPromise) {
    highlighterPromise = import(
      "react-syntax-highlighter/dist/esm/prism-light"
    ).then((module) => {
      const candidate = (module as { PrismLight?: PrismLightComponent })
        .PrismLight;
      const fallback = (module as unknown as { default: PrismLightComponent })
        .default;
      return candidate ?? fallback;
    });
  }

  if (!oneDarkThemePromise) {
    oneDarkThemePromise = import(
      "react-syntax-highlighter/dist/esm/styles/prism"
    ).then((module) => module.oneDark);
  }

  const [syntaxHighlighter, style] = await Promise.all([
    highlighterPromise,
    oneDarkThemePromise,
  ]);
  const loader = LANGUAGE_LOADERS[language];

  if (loader && !registeredLanguages.has(language)) {
    try {
      const languageModule = await loader();
      const registerLanguage = (
        syntaxHighlighter as UntypedJson as {
          registerLanguage?: (name: string, definition: UntypedJson) => void;
        }
      ).registerLanguage;
      registerLanguage?.(language, languageModule.default);
      registeredLanguages.add(language);
    } catch (error) {
      logger.warn(`code-interpreter_language_register_failed_${language}`, error);
    }
  }

  return {
    component: syntaxHighlighter,
    language,
    style,
  };
}

export function useDeferredSyntaxHighlighter(
  language: string,
  code: string,
): SyntaxHighlighterState | null {
  const targetLanguage = useMemo(() => normalizeLanguage(language), [language]);
  const normalizedCode = typeof code === "string" ? code : "";
  const [state, setState] = useState<SyntaxHighlighterState | null>(null);

  useEffect(() => {
    if (normalizedCode.trim().length === 0) {
      setState(null);
      return;
    }

    let mounted = true;

    loadSyntaxHighlighter(targetLanguage)
      .then((result) => {
        if (mounted) {
          setState(result);
        }
      })
      .catch((error) => {
        logger.error("code-interpreter_highlighter_load_failed", error);
      });

    return () => {
      mounted = false;
    };
  }, [normalizedCode, targetLanguage]);

  return state;
}
