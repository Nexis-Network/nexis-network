"use client";

import * as React from "react";
import { Terminal, Code2, AlertCircle, FileCode2, LineChart } from "lucide-react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { CodeBlock, CodeBlockCopyButton } from "@/components/ai-elements/code-block";
import { InteractiveChartArtifact } from "@/components/artifacts/features/analysis/chart-artifact";

interface CodeInterpreterResultProps {
  toolInvocation: UntypedJson;
  result: {
    stdout?: string;
    stderr?: string;
    results?: UntypedJson[];
    error?: string;
  };
}

export function CodeInterpreterResult({ toolInvocation, result }: CodeInterpreterResultProps) {
  const code = toolInvocation.args.code;
  const language = toolInvocation.args.language || "python";
  const hasError = !!result.error || !!result.stderr;
  const hasOutput = !!result.stdout || !!result.stderr;
  const hasCharts = result.results && result.results.length > 0;
  
  // Default tab based on whats available
  const defaultValue = hasError ? "output" : (hasCharts ? "charts" : "code");

  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 overflow-hidden my-4">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50 bg-muted/40 text-xs text-muted-foreground font-medium">
        <Terminal className="h-3.5 w-3.5" />
        <span>Code Execution ({language})</span>
      </div>

      <Tabs defaultValue={defaultValue} className="w-full">
        <div className="border-b border-border/50 px-3 bg-muted/10">
          <TabsList className="h-9 w-auto bg-transparent p-0 gap-4">
            <TabsTrigger 
                value="code" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 h-9 text-xs"
            >
                <Code2 className="h-3 w-3 mr-1.5" />
                Code
            </TabsTrigger>
            {(hasOutput || hasError) && (
                 <TabsTrigger 
                 value="output" 
                 className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 h-9 text-xs"
                >
                 {hasError ? <AlertCircle className="h-3 w-3 mr-1.5 text-destructive" /> : <FileCode2 className="h-3 w-3 mr-1.5" />}
                 Output
             </TabsTrigger>
            )}
            {hasCharts && (
                <TabsTrigger 
                value="charts" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 h-9 text-xs"
                >
                <LineChart className="h-3 w-3 mr-1.5" />
                Charts
            </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="code" className="mt-0 p-0 border-none outline-none">
             <div className="max-h-[300px] overflow-y-auto">
                 <CodeBlock 
                    code={code}
                    language={language}
                    className="border-none rounded-none text-xs"
                >
                    <CodeBlockCopyButton />
                </CodeBlock>
             </div>
        </TabsContent>

        <TabsContent value="output" className="mt-0 p-3 border-none outline-none">
            {result.error && (
                <div className="mb-3 p-2 rounded bg-destructive/10 border border-destructive/20 text-destructive text-xs font-mono break-words whitespace-pre-wrap">
                    Error: {result.error}
                </div>
            )}
            {result.stderr && (
                 <div className="mb-3">
                    <span className="text-[10px] uppercase text-destructive font-semibold mb-1 block">Standard Error</span>
                    <pre className="text-xs text-destructive/90 font-mono whitespace-pre-wrap bg-muted/30 p-2 rounded">{result.stderr}</pre>
                </div>
            )}
             {result.stdout && (
                 <div>
                    <span className="text-[10px] uppercase text-muted-foreground font-semibold mb-1 block">Standard Output</span>
                    <pre className="text-xs text-foreground/80 font-mono whitespace-pre-wrap bg-muted/30 p-2 rounded">{result.stdout}</pre>
                </div>
            )}
             {!result.stdout && !result.stderr && !result.error && (
                <div className="text-xs text-muted-foreground italic">No output produced.</div>
            )}
        </TabsContent>
        
        {hasCharts && (
             <TabsContent value="charts" className="mt-0 p-3 border-none outline-none bg-white/5 min-h-[250px]">
                 <div className="space-y-4">
                     {result.results?.map((item, i: number) => {
                         // Check for interactive chart structure
                         if (item.identifier === "interactive-chart" && item.data) {
                             return <InteractiveChartArtifact key={i} data={item.data} />;
                         }
                         // Check for image/png
                         if (item.png) {
                             return (
                                 <div key={i} className="rounded overflow-hidden border border-border/50">
                                     {/* eslint-disable-next-line @next/next/no-img-element */}
                                     <img src={`data:image/png;base64,${item.png}`} alt="Generated Plot" className="w-full h-auto" />
                                 </div>
                             );
                         }
                         return null;
                     })}
                 </div>
             </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
