"use client";

import { Button } from "@/components/ui/button";
import {
  artifactCodeSurfaceClass,
  artifactGhostControlClass,
} from "@/components/ai-elements/artifact-ui";
import { cn } from "@/lib/utils";
import { CheckIcon, CopyIcon } from "lucide-react";
import type { ComponentProps, HTMLAttributes, ReactNode } from "react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";


import { logger } from '@/lib/logger';
type PrismLightComponent = typeof import("react-syntax-highlighter").Prism;

type HighlighterState = {
  component: PrismLightComponent;
  language: string;
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
};

const LANGUAGE_LOADERS: Record<string, () => Promise<{ default: UntypedJson }>> = {
  javascript: () => import("react-syntax-highlighter/dist/esm/languages/prism/javascript"),
  typescript: () => import("react-syntax-highlighter/dist/esm/languages/prism/typescript"),
  tsx: () => import("react-syntax-highlighter/dist/esm/languages/prism/tsx"),
  json: () => import("react-syntax-highlighter/dist/esm/languages/prism/json"),
  bash: () => import("react-syntax-highlighter/dist/esm/languages/prism/bash"),
  python: () => import("react-syntax-highlighter/dist/esm/languages/prism/python"),
  yaml: () => import("react-syntax-highlighter/dist/esm/languages/prism/yaml"),
  markdown: () => import("react-syntax-highlighter/dist/esm/languages/prism/markdown"),
  sql: () => import("react-syntax-highlighter/dist/esm/languages/prism/sql"),
  html: () => import("react-syntax-highlighter/dist/esm/languages/prism/markup"),
  css: () => import("react-syntax-highlighter/dist/esm/languages/prism/css"),
  solidity: () => import("react-syntax-highlighter/dist/esm/languages/prism/solidity"),
  rust: () => import("react-syntax-highlighter/dist/esm/languages/prism/rust"),
};

let highlighterPromise: Promise<PrismLightComponent> | null = null;
const registeredLanguages = new Set<string>();

const normalizeLanguage = (language: string): string => {
  const lower = language?.toLowerCase?.().trim() ?? "";
  if (!lower) {
    return "text";
  }
  return LANGUAGE_ALIASES[lower] ?? lower;
};

async function loadHighlighter(language: string): Promise<HighlighterState> {
if (!highlighterPromise) {
    highlighterPromise = import("react-syntax-highlighter/dist/esm/prism-light").then((mod) => {
      const candidate = (mod as { PrismLight?: PrismLightComponent }).PrismLight;
      const fallback = (mod as { default: UntypedJson }).default as UntypedJson as PrismLightComponent;
      return (candidate ?? fallback) as PrismLightComponent;
    });
  }

  const syntaxHighlighter = await highlighterPromise;
  const loader = LANGUAGE_LOADERS[language];

  if (loader && !registeredLanguages.has(language)) {
    try {
      const langModule = await loader();
      const registerLanguage = (syntaxHighlighter as UntypedJson as {
        registerLanguage: (name: string, definition: UntypedJson) => void;
      }).registerLanguage;
      registerLanguage?.(language, (langModule as { default: UntypedJson }).default);
      registeredLanguages.add(language);
    } catch (error) {
      logger.warn(`code-block_language_register_failed_${language}`, error);
    }
  }

  return { component: syntaxHighlighter, language };
}

const useSyntaxHighlighter = (language: string, code: string) => {
  const targetLanguage = useMemo(() => normalizeLanguage(language), [language]);
  const hasCode = typeof code === "string" && code.trim().length > 0;
  const [state, setState] = useState<HighlighterState | null>(null);

  useEffect(() => {
    if (!hasCode) {
      setState(null);
      return;
    }

    let mounted = true;

    loadHighlighter(targetLanguage)
      .then((result) => {
        if (mounted) {
          setState(result);
        }
      })
      .catch((error) => {
        logger.error("code-block_highlighter_load_failed", error);
      });

    return () => {
      mounted = false;
    };
  }, [hasCode, targetLanguage]);

  return state;
};

type CodeBlockContextType = {
  code: string;
};

const CodeBlockContext = createContext<CodeBlockContextType>({
  code: "",
});

export type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
  code: string;
  language: string;
  showLineNumbers?: boolean;
  children?: ReactNode;
};

export const CodeBlock = ({
  code,
  language,
  showLineNumbers = false,
  className,
  children,
  ...props
}: CodeBlockProps) => {
  const safeCode = typeof code === "string" ? code : "";
  const highlighter = useSyntaxHighlighter(language, safeCode);

  return (
    <CodeBlockContext.Provider value={{ code }}>
      <div
        className={cn(
          artifactCodeSurfaceClass,
          "relative w-full overflow-hidden text-[var(--artifact-code-foreground)]",
          className,
        )}
        {...props}
      >
        <div className="relative">
          {highlighter ? (
            <>
              <highlighter.component
                className="overflow-hidden dark:hidden"
                codeTagProps={{
                  className: "font-mono text-sm",
                }}
                customStyle={{
                  margin: 0,
                  padding: "1rem",
                  fontSize: "0.875rem",
                  background: "var(--artifact-code-background)",
                  color: "var(--artifact-code-foreground)",
                }}
                language={highlighter.language}
                lineNumberStyle={{
                  color: "var(--artifact-code-muted)",
                  paddingRight: "1rem",
                  minWidth: "2.5rem",
                }}
                showLineNumbers={showLineNumbers}
                style={oneLight}
              >
                {safeCode}
              </highlighter.component>
              <highlighter.component
                className="hidden overflow-hidden dark:block"
                codeTagProps={{
                  className: "font-mono text-sm",
                }}
                customStyle={{
                  margin: 0,
                  padding: "1rem",
                  fontSize: "0.875rem",
                  background: "var(--artifact-code-background)",
                  color: "var(--artifact-code-foreground)",
                }}
                language={highlighter.language}
                lineNumberStyle={{
                  color: "var(--artifact-code-muted)",
                  paddingRight: "1rem",
                  minWidth: "2.5rem",
                }}
                showLineNumbers={showLineNumbers}
                style={oneDark}
              >
                {safeCode}
              </highlighter.component>
            </>
          ) : (
            <pre className="no-scrollbar overflow-auto p-4 text-xs text-[var(--artifact-code-muted)]">
              <code>{safeCode}</code>
            </pre>
          )}
          {children && (
            <div className="absolute top-2 right-2 flex items-center gap-2">
              {children}
            </div>
          )}
        </div>
      </div>
    </CodeBlockContext.Provider>
  );
};

export type CodeBlockCopyButtonProps = ComponentProps<typeof Button> & {
  onCopy?: () => void;
  onError?: (error: Error) => void;
  timeout?: number;
};

export const CodeBlockCopyButton = ({
  onCopy,
  onError,
  timeout = 2000,
  children,
  className,
  ...props
}: CodeBlockCopyButtonProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const { code } = useContext(CodeBlockContext);
  const resetCopyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetCopyTimeoutRef.current) {
        clearTimeout(resetCopyTimeoutRef.current);
      }
    };
  }, []);

  const copyToClipboard = async () => {
    if (typeof window === "undefined" || !navigator.clipboard.writeText) {
      onError?.(new Error("Clipboard API not available"));
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      onCopy?.();
      if (resetCopyTimeoutRef.current) {
        clearTimeout(resetCopyTimeoutRef.current);
      }
      resetCopyTimeoutRef.current = setTimeout(() => {
        setIsCopied(false);
        resetCopyTimeoutRef.current = null;
      }, timeout);
    } catch (error) {
      onError?.(error as Error);
    }
  };

  const Icon = isCopied ? CheckIcon : CopyIcon;

  return (
    <Button
      className={cn(
        artifactGhostControlClass,
        "shrink-0 border-transparent",
        className,
      )}
      onClick={copyToClipboard}
      size="icon"
      variant="ghost"
      {...props}
    >
      {children ?? <Icon size={14} />}
    </Button>
  );
};
