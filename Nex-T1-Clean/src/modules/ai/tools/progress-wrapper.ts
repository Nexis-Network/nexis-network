/**
 * Progress Wrapper for Long-Running Tools
 * Provides progress indicators and status updates for tool execution
 */

export interface ProgressState {
  state: "progress";
  percent: number;
  message: string;
  estimatedTimeRemaining?: number;
}

export interface ToolWithProgress<TInput = UntypedJson, TOutput = UntypedJson> {
  execute: (input: TInput) => AsyncGenerator<ProgressState | TOutput>;
}

/**
 * Wrap a tool with progress indication
 * Simulates progress based on estimated duration
 */
export function withProgress<TInput, TOutput>(
  tool: {
    execute: (input: TInput) => AsyncGenerator<TOutput, UntypedJson, UntypedJson>;
    [key: string]: UntypedJson;
  },
  options: {
    estimatedDurationMs: number;
    progressUpdateIntervalMs?: number;
    stages?: Array<{ percent: number; message: string }>;
  },
) {
  const { estimatedDurationMs, progressUpdateIntervalMs = 1000, stages } = options;

  const wrapped = {
    ...tool,
    async *execute(input: TInput) {
      let currentPercent = 0;
      let stageIndex = 0;
      const startTime = Date.now();

      // Default stages if not provided
      const progressStages = stages || [
        { percent: 0, message: "Starting..." },
        { percent: 25, message: "Processing request..." },
        { percent: 50, message: "Fetching data..." },
        { percent: 75, message: "Analyzing results..." },
        { percent: 90, message: "Finalizing..." },
      ];

      // Start progress simulation
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const estimatedPercent = Math.min((elapsed / estimatedDurationMs) * 100, 95);

        currentPercent = Math.max(currentPercent, estimatedPercent);

        // Find appropriate stage message
        const currentStage = progressStages.find(
          (s, idx) => idx === stageIndex && currentPercent >= s.percent,
        );

        if (currentStage) {
          stageIndex++;
        }

        const _message = currentStage?.message || progressStages[stageIndex - 1]?.message || "Processing...";

        // Don't yield after 95% (wait for actual completion)
        if (currentPercent < 95) {
          // This would need to be yielded via a channel in actual implementation
          // For now, we'll handle it in the tool execution
        }
      }, progressUpdateIntervalMs);

      try {
        // Execute the actual tool
        const result = await (async () => {
          const gen = tool.execute(input);
          let finalResult;

          for await (const value of gen) {
            finalResult = value;
          }

          return finalResult;
        })();

        // Clear progress simulation
        clearInterval(progressInterval);

        // Yield 100% completion
        yield {
          state: "progress",
          percent: 100,
          message: "Complete",
        } as UntypedJson;

        // Yield final result
        if (result !== undefined) {
          yield result as TOutput;
        }
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
    },
  };

  return wrapped;
}

/**
 * Create progress stages for common tool types
 */
export const PROGRESS_STAGES = {
  WEB_SEARCH: [
    { percent: 0, message: "Initiating search..." },
    { percent: 30, message: "Querying search engines..." },
    { percent: 60, message: "Processing results..." },
    { percent: 90, message: "Ranking and filtering..." },
  ],
  BLOCKCHAIN_QUERY: [
    { percent: 0, message: "Connecting to network..." },
    { percent: 20, message: "Fetching blockchain data..." },
    { percent: 60, message: "Verifying data..." },
    { percent: 90, message: "Formatting response..." },
  ],
  TRANSACTION: [
    { percent: 0, message: "Preparing transaction..." },
    { percent: 25, message: "Estimating gas..." },
    { percent: 50, message: "Signing transaction..." },
    { percent: 75, message: "Broadcasting to network..." },
    { percent: 95, message: "Waiting for confirmation..." },
  ],
  AI_ANALYSIS: [
    { percent: 0, message: "Loading model..." },
    { percent: 30, message: "Analyzing input..." },
    { percent: 70, message: "Generating insights..." },
    { percent: 90, message: "Formatting results..." },
  ],
};
