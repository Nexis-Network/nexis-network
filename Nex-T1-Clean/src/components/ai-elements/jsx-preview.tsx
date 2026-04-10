"use client";

import { CodeBlock, CodeBlockCopyButton } from "@/components/ai-elements/code-block";
import {
  WebPreview,
  WebPreviewBody,
  WebPreviewNavigation,
} from "@/components/ai-elements/web-preview";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export type JsxPreviewProps = HTMLAttributes<HTMLDivElement> & {
  code: string;
  srcDoc?: string;
  language?: string;
};

export function JSXPreview({
  code,
  srcDoc,
  language = "tsx",
  className,
  ...props
}: JsxPreviewProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-muted/50 dark:border-white/10 dark:bg-black/20",
        className,
      )}
      {...props}
    >
      <Tabs defaultValue={srcDoc ? "preview" : "code"} className="w-full">
        <TabsList className="m-3 grid w-[220px] grid-cols-2">
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="code">Code</TabsTrigger>
        </TabsList>
        <TabsContent value="preview" className="mt-0">
          <WebPreview className="h-[420px] rounded-none border-0 bg-transparent">
            <WebPreviewNavigation className="border-border bg-muted text-muted-foreground dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
              <div className="text-xs uppercase tracking-[0.14em]">JSX Preview</div>
            </WebPreviewNavigation>
            <WebPreviewBody srcDoc={srcDoc ?? code} />
          </WebPreview>
        </TabsContent>
        <TabsContent value="code" className="m-0">
          <CodeBlock code={code} language={language} showLineNumbers>
            <CodeBlockCopyButton />
          </CodeBlock>
        </TabsContent>
      </Tabs>
    </div>
  );
}
