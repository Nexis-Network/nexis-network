import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

import { Card } from "@/components/ui/card";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { slideInFromRight } from "@/lib/animations";
import type { AgentType } from "@/lib/types";
import { formatJSONString } from "@/lib/utils";
import { AgentOutputCards } from "./agent-output-cards";
import { Countdown, EmptyState, LoadingState } from "./agent-states";
import { CompletionIndicator } from "@/components/shared/indicators/completion-indicator";
import { MemoizedReactMarkdown } from "@/components/shared/markdown/markdown-renderer";
import { TokenCounter } from "./token-counter";

interface OutputPanelProps {
  selectedAgent: AgentType;
  loading: boolean;
  output: string;
  parsedOutput: UntypedJson;
}

interface TabContentProps {
  parsedOutput: UntypedJson;
}

function ResponseTab({ parsedOutput }: TabContentProps) {
  return (
    <TabsContent className="mt-4 space-y-4" value="response">
      <Card className="p-4">
        <CompletionIndicator
          className="mb-4"
          message={
            parsedOutput.text ||
            parsedOutput.response ||
            parsedOutput.finalOutput ||
            parsedOutput.output
          }
          status={parsedOutput.error ? "error" : "success"}
        />
        <div className="max-w-full overflow-x-auto">
          <MemoizedReactMarkdown>
            {formatJSONString(
              parsedOutput.text ||
                parsedOutput.response ||
                parsedOutput.finalOutput ||
                parsedOutput.output,
            )}
          </MemoizedReactMarkdown>
        </div>
      </Card>
    </TabsContent>
  );
}

function StepsTab({ parsedOutput }: TabContentProps) {
  if (!parsedOutput.steps?.length) return null;
  return (
    <TabsContent className="mt-4 space-y-4" value="steps">
      {parsedOutput.steps.map((step: UntypedJson, index: number) => (
        <Card className="p-4" key={index}>
          <CompletionIndicator
            className="mb-2"
            message={`${step.step || `Step ${index + 1}`}: ${step.output ? "completed" : "success"}`}
            status="success"
          />
          <MemoizedReactMarkdown>
            {step.output || step.result || step.text}
          </MemoizedReactMarkdown>
        </Card>
      ))}
    </TabsContent>
  );
}

function ClassificationTab({ parsedOutput }: TabContentProps) {
  if (!parsedOutput.classification) return null;
  return (
    <TabsContent className="mt-4 space-y-4" value="classification">
      <Card className="p-4">
        <div className="space-y-4">
          <div>
            <h4 className="mb-2 font-medium text-sm">Query Classification</h4>
            <Badge className="mb-2">{parsedOutput.classification.type}</Badge>
            <p className="text-neutral-600 text-sm">
              {parsedOutput.classification.reasoningText}
            </p>
          </div>
          <div className="border-t pt-4">
            <h4 className="mb-2 font-medium text-sm">Routed Response</h4>
            <MemoizedReactMarkdown>
              {parsedOutput.response}
            </MemoizedReactMarkdown>
          </div>
        </div>
      </Card>
    </TabsContent>
  );
}

function ToolsTab({ parsedOutput }: TabContentProps) {
  if (!parsedOutput.toolCalls?.length) return null;
  return (
    <TabsContent className="mt-4 space-y-4" value="tools">
      {parsedOutput.toolCalls.map((tool: UntypedJson, index: number) => (
        <Card className="p-4" key={index}>
          <CompletionIndicator
            className="mb-2"
            message={`${tool.name || `Tool ${index + 1}`}`}
            status="success"
          />
          <div className="space-y-2">
            <div className="text-neutral-600 text-sm">
              <MemoizedReactMarkdown>
                {tool.input || tool.args || tool.parameters}
              </MemoizedReactMarkdown>
            </div>
            {tool.output && (
              <div className="border-t pt-2">
                <h4 className="mb-1 font-medium text-xs">Output</h4>
                <MemoizedReactMarkdown>{tool.output}</MemoizedReactMarkdown>
              </div>
            )}
          </div>
        </Card>
      ))}
    </TabsContent>
  );
}

function IterationsTab({ parsedOutput }: TabContentProps) {
  if (!parsedOutput.iterations?.length) return null;
  return (
    <TabsContent className="mt-4 space-y-4" value="iterations">
      {parsedOutput.iterations.map((iteration: UntypedJson, index: number) => (
        <Card className="p-4" key={index}>
          <CompletionIndicator
            className="mb-2"
            message={`Iteration ${index + 1}`}
            status="success"
          />
          <div className="space-y-2">
            <MemoizedReactMarkdown>
              {iteration.output || iteration.result || iteration.text}
            </MemoizedReactMarkdown>
          </div>
        </Card>
      ))}
    </TabsContent>
  );
}

export function OutputPanel({
  selectedAgent,
  loading,
  output,
  parsedOutput,
}: OutputPanelProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [milliseconds, setMilliseconds] = useState(0);

  // Timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    let msTimer: NodeJS.Timeout;

    if (loading) {
      setElapsedTime(0);
      setMilliseconds(0);
      timer = setInterval(() => setElapsedTime((prev) => prev + 1), 1000);
      msTimer = setInterval(
        () => setMilliseconds((prev) => (prev + 10) % 1000),
        10,
      );
    }

    return () => {
      if (timer) clearInterval(timer);
      if (msTimer) clearInterval(msTimer);
    };
  }, [loading]);

  const renderCustomOutput = () => {
    const outputCard =
      AgentOutputCards[selectedAgent.id as keyof typeof AgentOutputCards];
    if (outputCard && parsedOutput) {
      return (
        <div className="max-w-full space-y-4">
          <div className="max-w-full overflow-x-auto">
            {outputCard.renderOutput(
              parsedOutput as Parameters<typeof outputCard.renderOutput>[0],
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const renderTabs = () => {
    if (!output) return null;

    const customOutput = renderCustomOutput();
    if (customOutput) return customOutput;

    const availableTabs = selectedAgent.resultTabs || ["response"];

    return (
      <Tabs className="w-full" defaultValue="response">
        <TabsList
          className="grid w-full"
          style={{
            gridTemplateColumns: `repeat(${availableTabs.length}, 1fr)`,
          }}
        >
          {availableTabs.map((tab) => (
            <TabsTrigger
              disabled={
                (tab === "steps" && !parsedOutput.steps?.length) ||
                (tab === "tools" && !parsedOutput.toolCalls?.length) ||
                (tab === "iterations" && !parsedOutput.iterations?.length)
              }
              key={tab}
              value={tab}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="mt-4 space-y-4">
          <ResponseTab parsedOutput={parsedOutput} />
          <StepsTab parsedOutput={parsedOutput} />
          <ClassificationTab parsedOutput={parsedOutput} />
          <ToolsTab parsedOutput={parsedOutput} />
          <IterationsTab parsedOutput={parsedOutput} />
        </div>
      </Tabs>
    );
  };

  return (
    <motion.div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden bg-muted",
        "h-full w-full",
        "md:w-1/2 lg:w-3/5",
      )}
      variants={slideInFromRight}
    >
      <h2 className="absolute top-4 right-4 hidden font-medium text-[9px] text-neutral-400 md:block">
        {loading ? "Processing..." : "Output"}
      </h2>
      {/* Header with Indicators */}
      <div className="flex w-full flex-none items-center justify-between border-border/50 border-b px-4 py-2">
        {!loading && parsedOutput && (
          <CompletionIndicator
            className="mb-0 hidden items-center md:flex"
            message={
              parsedOutput?.error
                ? `Failed to process request ${parsedOutput?.message}`
                : "Tokens"
            }
            status={parsedOutput?.error ? "error" : "success"}
          >
            <AnimatePresence mode="wait">
              {parsedOutput?.usage && (
                <motion.div
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  initial={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <TokenCounter
                    completionTokens={parsedOutput?.usage?.outputTokens}
                    promptTokens={parsedOutput?.usage?.inputTokens}
                    totalTokens={parsedOutput?.usage?.totalTokens}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </CompletionIndicator>
        )}

        {(loading || output) && (
          <Countdown
            loading={loading}
            milliseconds={loading ? milliseconds : 0}
            seconds={elapsedTime}
          />
        )}
      </div>
      {/* Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="p-4">
          {loading ? (
            <div className="flex flex-col">
              <LoadingState agent={selectedAgent} elapsedTime={elapsedTime} />
            </div>
          ) : output ? (
            <motion.div
              animate={{ opacity: 1 }}
              className="space-y-4 pb-16"
              initial={{ opacity: 0 }}
            >
              {renderTabs()}
            </motion.div>
          ) : (
            <motion.div
              animate={{ opacity: 1 }}
              initial={{ opacity: 0 }}
              transition={{ delay: 0.2 }}
            >
              <EmptyState agent={selectedAgent} />
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
