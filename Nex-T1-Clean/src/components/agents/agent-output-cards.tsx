"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { CopyButton } from "@/components/shared/copy/copy-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { CryptoHeadline, PythMarketSnapshot } from "@/modules/prices/pyth/market";
import { getCompleteAgentCode } from "@/lib/agent-code-extractor";
import { AgentCodePreview } from "./agent-code-preview";
import { MemoizedReactMarkdown } from "@/components/shared/markdown/markdown-renderer";
import { CryptoSwapCard } from "@/components/market-overview/crypto-swap-card";
import { PythChart } from "@/components/dashboard/lazy-components";

const ChartSkeleton = ({ className }: { className?: string }) => (
  <div className={cn("mt-3 space-y-3 rounded-xl border border-border/40 bg-background/60 p-3", className)}>
    <div className="space-y-1">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3 w-24" />
    </div>
    <div className="rounded-lg border border-border/40 bg-background/70 p-2">
      <Skeleton className="h-[320px] w-full md:h-[380px]" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-20 w-full" />
    </div>
  </div>
);

const asString = (value: UntypedJson, fallback = ""): string =>
  typeof value === "string"
    ? value
    : value !== undefined && value !== null
      ? String(value)
      : fallback;

type AgentStep = {
  step?: string;
  tool?: string;
  text?: UntypedJson;
  output?: UntypedJson;
  result?: UntypedJson;
};

type AgentClassification = {
  type?: string;
  reasoningText?: string;
};

type AgentToolCall = {
  name?: string;
  input?: UntypedJson;
  args?: UntypedJson;
  parameters?: UntypedJson;
  output?: UntypedJson;
};

type AgentIteration = {
  output?: UntypedJson;
  result?: UntypedJson;
  text?: UntypedJson;
};

type AgentResponseText = {
  text?: {
    text?: string;
  };
};

type AgentOutputData = {
  steps?: AgentStep[];
  finalOutput?: UntypedJson;
  response?: UntypedJson;
  text?: AgentResponseText;
  classification?: AgentClassification;
  toolCalls?: AgentToolCall[];
  iterations?: AgentIteration[];
  route?: string;
  metadata?: Record<string, UntypedJson>;
  summary?: UntypedJson;
  status?: string;
  probability?: number;
  dataPoints?: Array<Record<string, UntypedJson>>;
  charts?: Array<Record<string, UntypedJson>>;
  context?: UntypedJson;
  recommendation?: UntypedJson;
  nextSteps?: UntypedJson;
  decision?: UntypedJson;
  timeline?: Array<Record<string, UntypedJson>>;
  signals?: Array<Record<string, UntypedJson>>;
  confidence?: number;
  results?: Array<Record<string, UntypedJson>>;
};

function formatMarkdownContent(content: UntypedJson): string {
  if (content == null) return "";
  if (typeof content === "string") return content;
  try {
    return JSON.stringify(content, null, 2);
  } catch {
    return String(content);
  }
}

export const AgentOutputCards = {
  "multi-step-tool-usage": {
    renderOutput: (output: AgentOutputData) => {
      const steps = output.steps ?? [];

      return (
        <div className="space-y-4 p-1">
          <div className="flex justify-end gap-2">
            <AgentCodePreview
              agentType="multi-step-tool-usage"
              className="mb-2"
              code={getCompleteAgentCode("multi-step-tool-usage")}
            />
            <CopyButton
              className="mb-2"
              text={getCompleteAgentCode("multi-step-tool-usage")}
            />
          </div>
          <AnimatePresence mode="wait">
            {steps.map((step, index) => {
              const toolLabel = asString(step.tool);
              const resultContent = step.result ?? null;
              const primaryContent =
                step.text ?? step.output ?? step.result ?? "";

              return (
                <motion.div
                  animate={{ opacity: 1, x: 0, height: "auto" }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  initial={{ opacity: 0, x: -20, height: 0 }}
                  key={index}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <Card className="relative w-full overflow-hidden rounded-2xl border-none bg-[#0C0C0C] p-4 text-white transition-all duration-300">
                    <motion.div
                      animate={{ scaleY: 1 }}
                      className="absolute top-0 left-0 h-full w-1 bg-sky-500/100"
                      initial={{ scaleY: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                    />
                    <div className="ml-2">
                      <div className="mb-2 flex items-center gap-2">
                        <motion.div
                          animate={{ scale: 1 }}
                          initial={{ scale: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            delay: index * 0.1,
                          }}
                        >
                          <Badge
                            className="transition-colors"
                            variant="outline"
                          >{`Step ${index + 1}`}</Badge>
                        </motion.div>
                        {toolLabel && (
                          <motion.div
                            animate={{ opacity: 1, x: 0 }}
                            initial={{ opacity: 0, x: -10 }}
                            transition={{
                              duration: 0.3,
                              delay: index * 0.1 + 0.2,
                            }}
                          >
                            <Badge className="text-xs" variant="secondary">
                              {toolLabel}
                            </Badge>
                          </motion.div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <MemoizedReactMarkdown>
                          {formatMarkdownContent(primaryContent)}
                        </MemoizedReactMarkdown>
                        {resultContent !== null && (
                          <div className="mt-2 border-t pt-2">
                            <div className="mb-1 font-medium text-neutral-200 text-sm">
                              Result:
                            </div>
                            <MemoizedReactMarkdown>
                              {formatMarkdownContent(resultContent)}
                            </MemoizedReactMarkdown>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      );
    },
  },

  "sequential-processing": {
    renderOutput: (output: AgentOutputData) => {
      const steps = output.steps ?? [];
      const finalOutput = output.finalOutput;

      return (
        <div className="space-y-4 p-1">
          <div className="flex justify-end gap-2">
            <AgentCodePreview
              agentType="sequential-processing"
              className="mb-2"
              code={getCompleteAgentCode("sequential-processing")}
            />
            <CopyButton
              className="mb-2"
              text={getCompleteAgentCode("sequential-processing")}
            />
          </div>
          <AnimatePresence>
            {steps.map((step, index) => {
              const label = asString(step.step, `Step ${index + 1}`);
              return (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  initial={{ opacity: 0, y: 20 }}
                  key={label}
                  transition={{ duration: 0.3, delay: index * 0.2 }}
                >
                  <Card className="w-full rounded-2xl border-none bg-[#0C0C0C] p-4 text-white transition-all duration-200">
                    <div className="mb-3 flex items-center gap-2">
                      <Badge
                        className={cn("transition-colors", {
                          "border-sky-500/20 bg-sky-500/10 hover:bg-blue-100":
                            index === 0,
                          "border-green-200 bg-green-50 hover:bg-green-100":
                            index === 1,
                          "border-purple-200 bg-purple-50 hover:bg-purple-100":
                            index === 2,
                        })}
                        variant="outline"
                      >
                        {label}
                      </Badge>
                      <motion.div
                        animate={{ width: "100%" }}
                        className="h-1 flex-1 overflow-hidden rounded bg-neutral-100"
                        initial={{ width: 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        <motion.div
                          animate={{ width: "100%" }}
                          className={cn("h-1 rounded", {
                            "bg-sky-500/100": index === 0,
                            "bg-green-500": index === 1,
                            "bg-purple-500": index === 2,
                          })}
                          initial={{ width: "0%" }}
                          transition={{ duration: 0.8 }}
                        />
                      </motion.div>
                    </div>
                    <MemoizedReactMarkdown>
                      {formatMarkdownContent(step.output)}
                    </MemoizedReactMarkdown>
                  </Card>
                </motion.div>
              );
            })}
            {finalOutput !== undefined && finalOutput !== null && (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="prose prose-sm dark:prose-invert max-w-none rounded-[1.25rem] p-1 "
                initial={{ opacity: 0, y: 20 }}
                transition={{
                  duration: 0.3,
                  delay: steps.length * 0.2,
                }}
              >
                <Card className="w-full rounded-2xl border border-white/10 bg-[#0C0C0C] p-4 text-white transition-all duration-200">
                  <div className="mb-3 flex items-center gap-2">
                    <Badge variant="secondary">Final Output</Badge>
                  </div>
                  <MemoizedReactMarkdown>
                    {formatMarkdownContent(finalOutput)}
                  </MemoizedReactMarkdown>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    },
  },

  routing: {
    renderOutput: (output: AgentOutputData) => (
      <div className="space-y-4 p-1">
        {/* Copy and Preview Buttons for Agent Code */}
        <div className="flex justify-end gap-2">
          <AgentCodePreview
            agentType="routing"
            className="mb-2"
            code={getCompleteAgentCode("routing")}
          />
          <CopyButton className="mb-2" text={getCompleteAgentCode("routing")} />
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="w-full rounded-2xl border-none bg-[#0C0C0C] p-4 text-white transition-all duration-300">
              <div className="mb-4 flex items-center gap-2">
                <motion.div
                  animate={{ scale: 1 }}
                  initial={{ scale: 0 }}
                  transition={{ type: "spring", stiffness: 500 }}
                >
                  <Badge
                    className={cn("transition-colors", {
                      "border-sky-500/20 bg-sky-500/10":
                        output.classification?.type === "general",
                      "border-green-200 bg-green-50":
                        output.classification?.type === "technical",
                      "border-purple-200 bg-purple-50":
                        output.classification?.type === "creative",
                    })}
                    variant="outline"
                  >
                    {output.classification?.type || "Processing"}
                  </Badge>
                </motion.div>
                <motion.div
                  animate={{ width: "auto", opacity: 1 }}
                  initial={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <ArrowRight className="h-4 w-4 text-neutral-400" />
                </motion.div>
                <motion.div
                  animate={{ opacity: 1, x: 0 }}
                  className="text-neutral-200 text-sm"
                  initial={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                >
                  {output.classification?.reasoningText || "Analyzing query..."}
                </motion.div>
              </div>
              <motion.div
                animate={{ opacity: 1 }}
                className="border-t pt-4"
                initial={{ opacity: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
              >
                <div className="group relative text-neutral-200 text-sm">
                  <MemoizedReactMarkdown>
                    {formatMarkdownContent(
                      output.response ||
                        output.text?.text?.text ||
                        "Processing response..."
                    )}
                  </MemoizedReactMarkdown>
                </div>
              </motion.div>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    ),
  },

  "parallel-processing": {
    renderOutput: (output: UntypedJson) => (
      <div className="space-y-4 p-1">
        {/* Copy and Preview Buttons for Agent Code */}
        <div className="flex justify-end gap-2">
          <AgentCodePreview
            agentType="parallel-processing"
            className="mb-2"
            code={getCompleteAgentCode("parallel-processing")}
          />
          <CopyButton
            className="mb-2"
            text={getCompleteAgentCode("parallel-processing")}
          />
        </div>
        <AnimatePresence mode="wait">
          {output.results?.map((result: UntypedJson, index: number) => (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              initial={{ opacity: 0, y: 20 }}
              key={index}
              transition={{ duration: 0.3, delay: index * 0.15 }}
            >
              <Card className="w-full rounded-2xl border-none bg-[#0C0C0C] p-4 text-white transition-all duration-300">
                <div className="mb-3 flex items-center gap-2">
                  <motion.div
                    animate={{ scale: 1 }}
                    initial={{ scale: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      delay: index * 0.1,
                    }}
                  >
                    <Badge
                      className={cn("transition-colors", {
                        "border-sky-500/20 bg-sky-500/10": index === 0,
                        "border-green-200 bg-green-50": index === 1,
                        "border-purple-200 bg-purple-50": index === 2,
                      })}
                      variant="outline"
                    >
                      {result.task || `Worker ${index + 1}`}
                    </Badge>
                  </motion.div>
                </div>
                <motion.div
                  animate={{ opacity: 1 }}
                  className="group relative text-neutral-200 text-sm"
                  initial={{ opacity: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.15 + 0.2 }}
                >
                  <MemoizedReactMarkdown>
                    {result.result ||
                      result.output ||
                      result.text?.text?.text ||
                      ""}
                  </MemoizedReactMarkdown>
                </motion.div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    ),
  },

  "orchestrator-worker": {
    renderOutput: (output: UntypedJson) => (
      <div className="space-y-4 p-1">
        {/* Copy and Preview Buttons for Agent Code */}
        <div className="flex justify-end gap-2">
          <AgentCodePreview
            agentType="orchestrator-worker"
            className="mb-2"
            code={getCompleteAgentCode("orchestrator-worker")}
          />
          <CopyButton
            className="mb-2"
            text={getCompleteAgentCode("orchestrator-worker")}
          />
        </div>
        <Card className="w-full rounded-2xl border-none bg-[#0C0C0C] p-4 text-white">
          <h3 className="mb-3 font-medium text-sm">Task Breakdown</h3>
          <div className="space-y-3">
            {output.plan?.tasks.map((task: UntypedJson, index: number) => (
              <div className="flex items-start gap-3" key={index}>
                <Badge variant="outline">{index + 1}</Badge>
                <div>
                  <div className="font-medium text-sm">{task.name}</div>
                  <div className="text-neutral-200 text-sm">
                    {task.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <div className="grid gap-4">
          {output.results?.map((result: UntypedJson, index: number) => (
            <Card className="w-full bg-[#0C0C0C] p-4 text-white" key={index}>
              <div className="mb-2 flex items-center gap-2">
                <Badge>{result.task}</Badge>
                <Badge variant="outline">Worker {index + 1}</Badge>
              </div>
              <MemoizedReactMarkdown>{result.result}</MemoizedReactMarkdown>
            </Card>
          ))}
        </div>
      </div>
    ),
  },

  "evaluator-optimizer": {
    renderOutput: (output: UntypedJson) => (
      <div className="space-y-4 p-1">
        {/* Copy and Preview Buttons for Agent Code */}
        <div className="flex justify-end gap-2">
          <AgentCodePreview
            agentType="evaluator-optimizer"
            className="mb-2"
            code={getCompleteAgentCode("evaluator-optimizer")}
          />
          <CopyButton
            className="mb-2"
            text={getCompleteAgentCode("evaluator-optimizer")}
          />
        </div>
        <AnimatePresence mode="wait">
          {output.iterations?.map((iteration: UntypedJson, index: number) => (
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              key={index}
              transition={{ duration: 0.3, delay: index * 0.15 }}
            >
              <Card className="w-full rounded-2xl border-none bg-[#0C0C0C] p-4 text-white transition-all duration-300">
                <div className="mb-3 flex items-center justify-between">
                  <motion.div
                    animate={{ opacity: 1, x: 0 }}
                    initial={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3, delay: index * 0.15 + 0.2 }}
                  >
                    <Badge variant="outline">
                      Iteration {iteration.iteration}
                    </Badge>
                  </motion.div>
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{ opacity: 1 }}
                      className="text-neutral-500 text-xs"
                      initial={{ opacity: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.15 + 0.3 }}
                    >
                      Quality:
                    </motion.div>
                    <motion.div
                      animate={{ width: "96px" }}
                      className="h-2 w-24 overflow-hidden rounded bg-neutral-100"
                      initial={{ width: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.15 + 0.4 }}
                    >
                      <motion.div
                        animate={{
                          width: `${(iteration.evaluation.quality / 10) * 100}%`,
                        }}
                        className={cn("h-2 rounded transition-all", {
                          "bg-red-500": iteration.evaluation.quality < 5,
                          "bg-yellow-500":
                            iteration.evaluation.quality >= 5 &&
                            iteration.evaluation.quality < 8,
                          "bg-green-500": iteration.evaluation.quality >= 8,
                        })}
                        initial={{ width: 0 }}
                        transition={{
                          duration: 0.8,
                          delay: index * 0.15 + 0.5,
                        }}
                      />
                    </motion.div>
                    <motion.div
                      animate={{ opacity: 1, x: 0 }}
                      className="font-medium text-xs"
                      initial={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3, delay: index * 0.15 + 0.6 }}
                    >
                      {iteration.evaluation.quality}/10
                    </motion.div>
                  </div>
                </div>
                <motion.div
                  animate={{ opacity: 1 }}
                  className="space-y-3"
                  initial={{ opacity: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.15 + 0.7 }}
                >
                  <div
                    className={cn(
                      "rounded-xl p-4 ",
                      {
                        "bg-red-50/30": iteration.evaluation.quality < 5,
                        "bg-yellow-50/30":
                          iteration.evaluation.quality >= 5 &&
                          iteration.evaluation.quality < 8,
                        "bg-green-50/30": iteration.evaluation.quality >= 8,
                      }
                    )}
                  >
                    <Badge variant="outline">
                      Iteration {iteration.iteration} Feedback:
                    </Badge>

                    <MemoizedReactMarkdown>
                      {iteration.evaluation.feedback}
                    </MemoizedReactMarkdown>
                  </div>
                  <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    className="pt-3"
                    initial={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.3, delay: index * 0.15 + 0.8 }}
                  >
                    <div
                      className={cn(
                        "rounded-xl p-4 ",
                        {
                          "bg-red-50/30": iteration.evaluation.quality < 5,
                          "bg-yellow-50/30":
                            iteration.evaluation.quality >= 5 &&
                            iteration.evaluation.quality < 8,
                          "bg-green-50/30": iteration.evaluation.quality >= 8,
                        }
                      )}
                    >
                      <div className="mb-1 font-bold font-mono text-neutral-500 text-xs uppercase" />
                      <Badge variant="outline">
                        Iteration {iteration.iteration} Output:
                      </Badge>
                      <div className="group relative text-neutral-200 text-sm">
                        <MemoizedReactMarkdown>
                          {iteration.output}
                        </MemoizedReactMarkdown>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    ),
  },
  "third-party-swap": {
    renderOutput: (output: UntypedJson) => <CryptoSwapCard output={output} />,
  },
  "crypto-market-analyst": {
    renderOutput: (output: UntypedJson) => <CryptoMarketAgentCard output={output} />,
  },
};


const CryptoMarketAgentCard = ({ output }: { output: UntypedJson }) => {
  const initialTicker = typeof output?.ticker === "string" ? output.ticker.trim() : "";
  const ticker = initialTicker || "BTC/USD";
  const lookbackDays = output?.snapshot?.lookbackDays ?? output?.lookbackDays ?? 7;
  const resolutionMinutes = output?.snapshot?.resolutionMinutes ?? output?.resolutionMinutes ?? 15;

  const [snapshot, setSnapshot] = useState<PythMarketSnapshot | null>(output?.snapshot ?? null);
  const [news, setNews] = useState<CryptoHeadline[]>(output?.news ?? []);
  const [error, setError] = useState<string | null>(output?.error ?? null);
  const [loading, setLoading] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ticker,
        lookbackDays: String(lookbackDays),
        resolution: String(resolutionMinutes),
      });
      const response = await fetch(`/api/pyth/summary?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!mountedRef.current) return;
      if (!response.ok) {
        throw new Error(data?.error ?? "Failed to load market data");
      }
      setSnapshot(data?.snapshot ?? null);
      setNews(Array.isArray(data?.news) ? data.news : []);
      setError(data?.error ?? null);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : "Failed to load market data");
      setSnapshot(null);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [lookbackDays, resolutionMinutes, ticker]);

  useEffect(() => {
    if (output?.snapshot) {
      setSnapshot(output.snapshot);
      setNews(Array.isArray(output.news) ? output.news : []);
      setError(output?.error ?? null);
      return;
    }
    fetchSummary().catch(() => {});
  }, [fetchSummary, output?.error, output?.news, output?.snapshot]);

  const summaryContent = useMemo(() => {
    if (typeof output?.summary === "string" && output.summary.trim()) {
      return output.summary.trim();
    }
    return null;
  }, [output?.summary]);

  return (
    <div className="space-y-4 p-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Badge variant="secondary">Live Market</Badge>
          <h3 className="font-regular text-lg text-foreground">{ticker}</h3>
          <p className="text-xs text-muted-foreground">
            Data powered by the Pyth Network • {lookbackDays}-day window • {resolutionMinutes}-minute resolution
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button onClick={fetchSummary} size="sm" variant="outline" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}Refresh
          </Button>
        </div>
      </div>

      <Card className="space-y-4 rounded-2xl border border-border/50 bg-[#0C0C0C] p-4 text-white">
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-black/40 p-2">
            {ticker ? (
              <PythChart
                ticker={ticker}
                priceFeedId={snapshot?.priceFeedId}
                lookbackDays={lookbackDays}
                resolutionMinutes={resolutionMinutes}
                className="bg-[#0C0C0C]"
              />
            ) : (
              <ChartSkeleton className="bg-[#0C0C0C]" />
            )}
          </div>

          {snapshot ? null : loading ? (
            <Skeleton className="h-20 w-full rounded-xl bg-white/10" />
          ) : null}

          {summaryContent ? (
            <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
              <MemoizedReactMarkdown>{formatMarkdownContent(summaryContent)}</MemoizedReactMarkdown>
            </div>
          ) : null}

          {news.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-xs font-regular uppercase tracking-wide text-neutral-300">
                Latest Headlines
              </h4>
              <div className="space-y-2">
                {news.slice(0, 5).map((headline, index) => (
                  <a
                    key={`${headline.url}-${index}`}
                    href={headline.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block rounded-lg border border-white/10 bg-black/10 p-3 transition-colors duration-200 hover:border-white/40 hover:bg-black/30"
                  >
                    <p className="text-sm font-medium text-white group-hover:text-primary">
                      {headline.title}
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      {(headline.source ?? "News").trim()} • {new Date(headline.publishedAt).toLocaleString()}
                    </p>
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {error && !loading ? (
            <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-200">
              {error}
            </p>
          ) : null}
        </div>
      </Card>
    </div>
  );
};
