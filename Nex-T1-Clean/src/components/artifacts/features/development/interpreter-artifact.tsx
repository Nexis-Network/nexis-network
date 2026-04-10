"use client";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Terminal, Play } from "lucide-react";
import { ArtifactContainer, ArtifactHeader, ArtifactBody } from "@/components/artifacts/layout";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export interface InterpreterArtifactData {
  code: string;
  language?: string;
  sandboxID?: string;
  result: {
    stdout: string;
    stderr: string;
    results: UntypedJson[]; // Charts, images, etc.
    error?: string;
  };
}

interface InterpreterArtifactProps {
  data: InterpreterArtifactData;
}

export function InterpreterArtifact({ data }: InterpreterArtifactProps) {
  const { code, language = "python", result } = data;
  const hasError = !!result.error || (result.stderr && result.stderr.length > 0);

  return (
    <ArtifactContainer>
      <ArtifactHeader
        title="Code Execution"
        icon={<Terminal className="h-4 w-4" />}
        actions={
          <Badge variant={hasError ? "destructive" : "outline"} className="text-[10px] h-5">
            {hasError ? "Failed" : "Success"}
          </Badge>
        }
      />
      <ArtifactBody className="p-0 flex flex-col h-full">
        {/* Split View: Top Code, Bottom Output */}
        
        {/* Code Section */}
        <div className="flex-1 min-h-[150px] bg-[#282c34] relative border-b border-border/40">
           <div className="absolute top-2 right-2 z-10 opacity-50 hover:opacity-100 transition-opacity">
              <span className="text-[10px] text-white/60 bg-black/40 px-2 py-1 rounded select-none uppercase tracking-wider">
                {language}
              </span>
           </div>
           <ScrollArea className="h-full">
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
                wrapLines={false}
              >
                {code}
              </SyntaxHighlighter>
           </ScrollArea>
        </div>

        {/* Output Section */}
        <div className="flex-1 min-h-[200px] flex flex-col bg-zinc-950/50">
            {/* Output Header */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border/40 bg-muted/20 shrink-0">
               <Play className="h-3 w-3 text-muted-foreground" />
               <span className="text-xs font-medium text-foreground/70">Console Output</span>
            </div>

            <ScrollArea className="flex-1 p-4">
                <div className="font-mono text-xs space-y-4">
                    {/* STDOUT */}
                    {result.stdout && (
                        <div className="whitespace-pre-wrap text-foreground/90 leading-relaxed">
                            {result.stdout}
                        </div>
                    )}
                    
                    {/* NO OUTPUT */}
                    {!result.stdout && !result.stderr && result.results.length === 0 && !result.error && (
                        <div className="text-muted-foreground italic opacity-50">No output returned.</div>
                    )}

                    {/* STDERR / ERROR */}
                    {(result.stderr || result.error) && (
                        <div className="text-red-400 whitespace-pre-wrap border-l-2 border-red-500/50 pl-3">
                            {result.stderr || result.error}
                        </div>
                    )}

                    {/* RICH RESULTS (Images) */}
                    {result.results?.length > 0 && (
                        <div className="space-y-4 pt-2">
                             {result.results.map((res, idx: number) => {
                                 // Handle png images
                                 if (res.png) {
                                     return (
                                         <div key={idx} className="rounded-lg overflow-hidden border border-border/40 bg-background/50 inline-block">
                                             {/* eslint-disable-next-line @next/next/no-img-element */}
                                             <img 
                                                src={`data:image/png;base64,${res.png}`} 
                                                alt="Generated Output" 
                                                className="max-w-full h-auto block"
                                             />
                                         </div>
                                     );
                                 }
                                 // Handle other types if needed
                                 return (
                                    <div key={idx} className="p-2 rounded bg-muted/30 text-xs">
                                        Unknown result type
                                    </div>
                                 );
                             })}
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
      </ArtifactBody>
    </ArtifactContainer>
  );
}
