"use client";

import { useState } from "react";
import { Check, Copy, Terminal, Play, Loader2 } from "lucide-react";

import { useDeferredSyntaxHighlighter } from "./deferred-syntax-highlighter";

interface CodeInterpreterBlockProps {
  code: string;
  language?: string;
  result?: {
    stdout: string;
    stderr: string;
    results?: UntypedJson[];
  };
  isLoading?: boolean;
}

export function CodeInterpreterBlock({
  code,
  language = "python",
  result,
  isLoading = false,
}: CodeInterpreterBlockProps) {
  const [isCopied, setIsCopied] = useState(false);
  const syntaxHighlighter = useDeferredSyntaxHighlighter(language, code);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border bg-zinc-950 overflow-hidden my-2 w-full max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-zinc-400" />
          <span className="text-xs font-medium text-zinc-400">
            {language === "python" ? "Python Code Interpreter" : "Terminal"}
          </span>
        </div>
        <div className="flex items-center gap-2">
            {isLoading ? (
                <div className="flex items-center gap-1.5 text-xs text-amber-500">
                    <Loader2 className="h-3 w-3 animate-spin"/>
                    Running...
                </div>
            ) : null}
          <button
            onClick={copyToClipboard}
            className="p-1 hover:bg-zinc-800 rounded-md transition-colors"
            title="Copy code"
          >
            {isCopied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-zinc-400" />
            )}
          </button>
        </div>
      </div>

      {/* Code Area */}
      <div className="relative">
        {syntaxHighlighter ? (
          <syntaxHighlighter.component
            customStyle={{
              margin: 0,
              padding: "1rem",
              fontSize: "0.80rem",
              lineHeight: "1.4",
            }}
            language={syntaxHighlighter.language}
            style={syntaxHighlighter.style}
            wrapLongLines
          >
            {code}
          </syntaxHighlighter.component>
        ) : (
          <pre className="overflow-x-auto p-4 text-[0.80rem] leading-[1.4] text-zinc-100">
            <code>{code}</code>
          </pre>
        )}
      </div>

      {/* Output Area */}
      {(result?.stdout || result?.stderr || (result?.results && result.results.length > 0)) && (
        <div className="border-t border-zinc-800 bg-zinc-925">
          <div className="px-3 py-2 border-b border-zinc-800/50 flex items-center gap-2">
            <Play className="h-3 w-3 text-zinc-500" />
            <span className="text-xs font-medium text-zinc-500">Output</span>
          </div>
          <div className="p-3 font-mono text-xs overflow-x-auto">
            {result.stdout && (
              <div className="text-zinc-300 whitespace-pre-wrap">{result.stdout}</div>
            )}
            {result.stderr && (
              <div className="text-red-400 mt-2 whitespace-pre-wrap">{result.stderr}</div>
            )}
             {/* Render Charts/Images from results if any */}
             {result.results?.map((res, idx) => {
                 if (res.png) {
                     return (
                         <div key={idx} className="mt-2">
                             {/* eslint-disable-next-line @next/next/no-img-element */}
                             <img src={`data:image/png;base64,${res.png}`} alt="Generated Chart" className="rounded-md max-w-full" />
                         </div>
                     );
                 }
                 return null;
             })}
          </div>
        </div>
      )}
    </div>
  );
}
