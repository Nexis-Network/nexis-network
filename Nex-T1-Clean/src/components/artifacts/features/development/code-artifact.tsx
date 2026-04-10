"use client";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check, Terminal } from "lucide-react";
import { useState, useEffect } from "react";
import { ArtifactContainer, ArtifactHeader, ArtifactBody } from "@/components/artifacts/layout";
import { Button } from "@/components/ui/button";

export interface CodeArtifactData {
  code: string;
  language: string;
  title?: string;
}

interface CodeArtifactProps {
  data: CodeArtifactData;
}

export function CodeArtifact({ data }: CodeArtifactProps) {
  const { code, language, title = "Code Snippet" } = data;
  const [isCopied, setIsCopied] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <ArtifactContainer>
      <ArtifactHeader
        title={title}
        icon={<Terminal className="h-4 w-4" />}
        actions={
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={copyToClipboard}
          >
            {isCopied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </Button>
        }
      />
      <ArtifactBody className="p-0">
        <div className="relative h-full flex flex-col">
          <div className="flex-1 overflow-auto bg-[#282c34] text-xs">
            {isMounted ? (
              <SyntaxHighlighter
                language={language.toLowerCase()}
                style={oneDark}
                customStyle={{
                  margin: 0,
                  padding: "1.5rem",
                  fontSize: "13px",
                  lineHeight: "1.5",
                  background: "transparent",
                }}
                wrapLines={false} // Better for code reading usually, or true if wrapping desired
              >
                {code}
              </SyntaxHighlighter>
            ) : (
                <pre className="p-6 text-[13px] leading-[1.5] text-[#abb2bf] font-mono" style={{ margin: 0 }}>
                    {code}
                </pre>
            )}
          </div>
        </div>
      </ArtifactBody>
    </ArtifactContainer>
  );
}
