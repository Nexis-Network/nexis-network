const DEFAULT_AGENT_CODE_MODEL =
  process.env.NEX_AGENT_CODE_MODEL ??
  process.env.NEX_BALANCED_MODEL ??
  "gpt-5.4";

export const agentCodeTemplates = {
  "multi-step-tool-usage": `import { openai } from "@ai-sdk/openai";
import { generateText, tool } from "ai";
import { z } from "zod";
import * as mathjs from "mathjs";

/**
 * Main entry point for testing different AI agent types
 */
export async function testAgent(
  agentType: string,
  input: string | Record<string, string>,
) {
  // Input normalization
  const inputObject: Record<string, string> =
    typeof input === "string" ? JSON.parse(input) : input;

  // Route to specialized agent implementations
  switch (agentType) {
    case "multi-step-tool-usage":
      return multiStepToolUsage(inputObject.prompt);
    default:
      throw new Error(\`Unknown agent type: \${agentType}\`);
  }
}

async function multiStepToolUsage(input: string) {
  const {
    text: answer,
    toolCalls,
    usage,
    steps,
  } = await generateText({
    model: openai("${DEFAULT_AGENT_CODE_MODEL}"),
    tools: {
      // Mathematical expression evaluator
      calculate: {
        description:
          "A tool for evaluating mathematical expressions. " +
          "Example expressions: " +
          "'1.2 * (2 + 4.5)', '12.7 cm to inch', 'sin(45 deg) ^ 2'.",
        inputSchema: z.object({
          expression: z.string(),
        }),
        execute: async ({ expression }) => {
          try {
            const sanitizedExpression = expression.trim();
            if (!sanitizedExpression) {
              throw new Error("Expression cannot be empty");
            }
            const result = mathjs.evaluate(sanitizedExpression);
            if (typeof result === "number") {
              return Number(result.toFixed(6));
            }
            return result;
          } catch (error) {
            if (error instanceof Error) {
              throw new Error(
                \`Invalid mathematical expression: \${error.message}\`,
              );
            }
            throw new Error("Failed to evaluate mathematical expression");
          }
        },
      },
      // Travel planning assistant
      planTrip: {
        description:
          "A tool for planning trip activities and itineraries. " +
          "Provides suggestions for destinations, activities, and timing.",
        inputSchema: z.object({
          destination: z.string(),
          duration: z.string(),
          preferences: z.string(),
        }),
        execute: async ({ destination, duration, preferences = "" }) => {
          return {
            destination,
            duration,
            suggestedActivities: [
              "Visit popular attractions",
              "Try local cuisine",
              "Experience cultural events",
              "Explore nature spots",
              "Shop at local markets",
            ].map((activity) => ({
              activity,
              timing: "Flexible",
              notes: \`Great option for experiencing \${destination}\`,
            })),
            tips: [
              \`Best time to visit \${destination}\`,
              "Local transportation options",
              "Cultural customs to know",
              "Weather considerations",
            ],
          };
        },
      },
    },
    system:
      "You are solving problems step by step. " +
      "Use the calculator for mathematical calculations and the trip planner for travel itineraries. " +
      "When you give the final answer, provide a detailed explanation of your process.",
    prompt: input,
  });

  // Transform raw steps into a structured format for UI rendering
  const formattedSteps = steps.map((step: Record<string, unknown>, index: number) => {
    const toolCall = step.toolCalls?.[0];
    return {
      step: index + 1,
      text: step.text || step.content || "",
      tool: toolCall?.name || "thinking",
      input: toolCall?.input,
      result: toolCall?.output,
    };
  });

  return JSON.stringify(
    {
      answer,
      steps: formattedSteps,
      usage,
    },
    null,
    2,
  );
}`,

  "sequential-processing": `import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

/**
 * Main entry point for testing different AI agent types
 */
export async function testAgent(
  agentType: string,
  input: string | Record<string, string>,
) {
  // Input normalization
  const inputObject: Record<string, string> =
    typeof input === "string" ? JSON.parse(input) : input;

  // Route to specialized agent implementations
  switch (agentType) {
    case "sequential-processing":
      return sequentialProcessing(
        inputObject.content,
        inputObject.instructions,
      );
    default:
      throw new Error(\`Unknown agent type: \${agentType}\`);
  }
}

async function sequentialProcessing(
  content: string,
  instructions: string,
) {
  // Define processing pipeline steps
  const steps = [
    {
      name: "Analyze",
      description: \`Analyze the following content:\\n\${content}\`,
    },
    { name: "Summarize", description: "Summarize the analysis" },
    {
      name: "Conclude",
      description: \`Apply the instructions: \${instructions}\`,
    },
  ];

  let result = content;
  const stepResults = [];
  const totalUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

  // Execute each step sequentially
  for (const step of steps) {
    const { text, usage } = await generateText({
      model: openai("${DEFAULT_AGENT_CODE_MODEL}"),
      system: \`You are performing the "\${step.name}" step. \${step.description}\`,
      prompt: result,
    });
    result = text;
    stepResults.push({ step: step.name, output: text });

    // Track token usage across steps
    if (usage) {
      totalUsage.inputTokens += usage.inputTokens;
      totalUsage.outputTokens += usage.outputTokens;
      totalUsage.totalTokens += usage.totalTokens;
    }
  }

  return JSON.stringify(
    { steps: stepResults, finalOutput: result, usage: totalUsage },
    null,
    2,
  );
}`,

  routing: `import { openai } from "@ai-sdk/openai";
import { generateText, generateObject } from "ai";
import { z } from "zod";

/**
 * Main entry point for testing different AI agent types
 */
export async function testAgent(
  agentType: string,
  input: string | Record<string, string>,
) {
  // Input normalization
  const inputObject: Record<string, string> =
    typeof input === "string" ? JSON.parse(input) : input;

  // Route to specialized agent implementations
  switch (agentType) {
    case "routing":
      return routingAgent(inputObject.query);
    default:
      throw new Error(\`Unknown agent type: \${agentType}\`);
  }
}

async function routingAgent(input: string) {
  // Classify query type
  const { object: classification, usage: classificationUsage } =
    (await generateObject({
      model: openai("${DEFAULT_AGENT_CODE_MODEL}"),
      schema: z.object({
        type: z.enum(["general", "technical", "creative"]),
        reasoningText: z.string(),
      }),
      prompt: \`Classify this query: \${input}\\n\\nProvide the type (general, technical, or creative) and a brief reasoning.\`,
    })) as {
      object: {
        type: "general" | "technical" | "creative";
        reasoningText: string;
      };
      usage: Record<string, unknown>;
    };

  // Define specialized prompts for each query type
  const routePrompt = {
    general:
      "You are a general knowledge expert. Provide a comprehensive answer.",
    technical:
      "You are a technical expert. Provide a detailed technical explanation.",
    creative:
      "You are a creative writer. Provide an imaginative and engaging response.",
  }[classification.type];

  // Generate specialized response
  const { text: response, usage: responseUsage } = await generateText({
    model: openai("${DEFAULT_AGENT_CODE_MODEL}"),
    system: routePrompt,
    prompt: input,
  });

  // Aggregate token usage
  const totalUsage = {
    inputTokens:
      (classificationUsage?.inputTokens || 0) +
      (responseUsage?.inputTokens || 0),
    outputTokens:
      (classificationUsage?.outputTokens || 0) +
      (responseUsage?.outputTokens || 0),
    totalTokens:
      (classificationUsage?.totalTokens || 0) +
      (responseUsage?.totalTokens || 0),
  };

  return JSON.stringify(
    { classification, response, usage: totalUsage },
    null,
    2,
  );
}`,

  "parallel-processing": `import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

/**
 * Main entry point for testing different AI agent types
 */
export async function testAgent(
  agentType: string,
  input: string | Record<string, string>,
) {
  // Input normalization
  const inputObject: Record<string, string> =
    typeof input === "string" ? JSON.parse(input) : input;

  // Route to specialized agent implementations
  switch (agentType) {
    case "parallel-processing":
      return parallelProcessing(inputObject.content, inputObject.aspects);
    default:
      throw new Error(\`Unknown agent type: \${agentType}\`);
  }
}

async function parallelProcessing(
  content: string,
  aspects: string = "",
) {
  // Parse aspects or use defaults
  const aspectList = aspects
    ? aspects.split(",").map((a) => a.trim())
    : ["summary", "analysis", "critique"];
  const totalUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

  // Configure tasks with visual metadata
  const tasks = aspectList.map((aspect) => ({
    name: aspect.charAt(0).toUpperCase() + aspect.slice(1),
    prompt: \`Analyze the following content from the perspective of \${aspect}:\`,
    icon: aspect.includes("summary")
      ? "list"
      : aspect.includes("analysis")
        ? "search"
        : "sparkles",
    color: aspect.includes("summary")
      ? "blue"
      : aspect.includes("analysis")
        ? "green"
        : "purple",
  }));

  // Execute all analysis tasks concurrently
  const results = await Promise.all(
    tasks.map(async (task) => {
      const { text, usage } = await generateText({
        model: openai("${DEFAULT_AGENT_CODE_MODEL}"),
        system: \`You are performing the "\${task.name}" task. Focus on providing clear, concise, and insightful analysis from this perspective.\`,
        prompt: \`\${task.prompt}\\n\\n\${content}\`,
      });

      if (usage) {
        totalUsage.inputTokens += usage.inputTokens;
        totalUsage.outputTokens += usage.outputTokens;
        totalUsage.totalTokens += usage.totalTokens;
      }

      return {
        task: task.name,
        result: text,
        icon: task.icon,
        color: task.color,
      };
    }),
  );

  return JSON.stringify(
    {
      results,
      metadata: {
        inputLength: content.length,
        processedAt: new Date().toISOString(),
        workers: tasks.length,
        aspects: aspectList,
      },
      usage: totalUsage,
    },
    null,
    2,
  );
}`,

  "orchestrator-worker": `import { openai } from "@ai-sdk/openai";
import { generateText, generateObject } from "ai";
import { z } from "zod";

/**
 * Main entry point for testing different AI agent types
 */
export async function testAgent(
  agentType: string,
  input: string | Record<string, string>,
) {
  // Input normalization
  const inputObject: Record<string, string> =
    typeof input === "string" ? JSON.parse(input) : input;

  // Route to specialized agent implementations
  switch (agentType) {
    case "orchestrator-worker":
      return orchestratorWorker(
        inputObject.requirements,
        inputObject.constraints,
      );
    default:
      throw new Error(\`Unknown agent type: \${agentType}\`);
  }
}

async function orchestratorWorker(
  requirements: string,
  constraints: string = "",
) {
  const prompt = \`Requirements:\\n\${requirements}\${
    constraints ? \`\\n\\nConstraints:\\n\${constraints}\` : ""
  }\`;
  const totalUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

  // Orchestrator: Generate execution plan
  const { object: plan, usage: planUsage } = (await generateObject({
    model: openai("${DEFAULT_AGENT_CODE_MODEL}"),
    schema: z.object({
      tasks: z.array(
        z.object({
          name: z.string(),
          description: z.string(),
        }),
      ),
    }),
    prompt: \`Create a plan to address the following:\\n\\n\${prompt}\\n\\nProvide a list of tasks, each with a name and description.\`,
  })) as {
    object: { tasks: { name: string; description: string }[] };
    usage: Record<string, unknown>;
  };

  if (planUsage) {
    totalUsage.inputTokens += planUsage.promptTokens;
    totalUsage.outputTokens += planUsage.completionTokens;
    totalUsage.totalTokens += planUsage.totalTokens;
  }

  // Workers: Execute planned tasks
  const results = await Promise.all(
    plan.tasks.map(async (task) => {
      const { text, usage } = await generateText({
        model: openai("${DEFAULT_AGENT_CODE_MODEL}"),
        system: \`You are a specialized worker performing the "\${task.name}" task.\`,
        prompt: \`\${task.description}\\n\\nRequirements: \${requirements}\${
          constraints ? \`\\nConstraints: \${constraints}\` : ""
        }\`,
      });

      if (usage) {
        totalUsage.inputTokens += usage.inputTokens;
        totalUsage.outputTokens += usage.outputTokens;
        totalUsage.totalTokens += usage.totalTokens;
      }

      return { task: task.name, result: text };
    }),
  );

  return JSON.stringify({ plan, results, usage: totalUsage }, null, 2);
}`,

  "evaluator-optimizer": `import { openai } from "@ai-sdk/openai";
import { generateText, generateObject } from "ai";
import { z } from "zod";


import { logger } from '@/lib/logger';
/**
 * Main entry point for testing different AI agent types
 */
export async function testAgent(
  agentType: string,
  input: string | Record<string, string>,
) {
  // Input normalization
  const inputObject: Record<string, string> =
    typeof input === "string" ? JSON.parse(input) : input;

  // Route to specialized agent implementations
  switch (agentType) {
    case "evaluator-optimizer":
      return evaluatorOptimizer(inputObject.content, inputObject.criteria);
    default:
      throw new Error(\`Unknown agent type: \${agentType}\`);
  }
}

async function evaluatorOptimizer(
  content: string,
  criteria: string,
) {
  const iterations = [];
  const totalUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  let currentContent = content;

  // Maximum of 2 improvement iterations
  for (let i = 0; i < 2; i++) {
    // Evaluation phase
    const { object: evaluation, usage: evaluationUsage } =
      (await generateObject({
        model: openai("${DEFAULT_AGENT_CODE_MODEL}"),
        schema: z.object({
          quality: z.number().min(0).max(10),
          feedback: z.string(),
        }),
        prompt: \`Evaluate the following content based on these criteria:\\n\${criteria}\\n\\nContent:\\n\${currentContent}\\n\\nProvide a quality score (0-10) and detailed yet concise feedback.\`,
      })) as { object: { quality: number; feedback: string }; usage: Record<string, unknown> };

    if (evaluationUsage) {
      totalUsage.inputTokens += evaluationUsage.promptTokens;
      totalUsage.outputTokens += evaluationUsage.completionTokens;
      totalUsage.totalTokens += evaluationUsage.totalTokens;
    }

    // Optimization phase
    const { text: improvedContent, usage: improvementUsage } =
      await generateText({
        model: openai("${DEFAULT_AGENT_CODE_MODEL}"),
        system:
          "You are an optimizer focused on improving content based on specific criteria.",
        prompt: \`Improve the following content based on the evaluation:\\n\\nContent:\\n\${currentContent}\\n\\nCriteria:\\n\${criteria}\\n\\nCurrent Evaluation:\\n\${evaluation.feedback}\`,
      });

    if (improvementUsage) {
      totalUsage.inputTokens += improvementUsage.inputTokens;
      totalUsage.outputTokens += improvementUsage.outputTokens;
      totalUsage.totalTokens += improvementUsage.totalTokens;
    }

    iterations.push({
      iteration: i + 1,
      evaluation,
      output: improvedContent,
    });

    // Early stopping if quality threshold reached
    if (evaluation.quality >= 9) break;

    currentContent = improvedContent;
  }

  return JSON.stringify(
    {
      iterations,
      finalOutput: iterations.at(-1)?.output,
      usage: totalUsage,
    },
    null,
    2,
  );
}`,
};

/**
 * Get formatted agent code for copying
 * @param agentType - The type of agent to get code for
 * @returns Formatted TypeScript code string
 */
export function getAgentCode(agentType: string): string {
  const code = agentCodeTemplates[agentType as keyof typeof agentCodeTemplates];

  if (!code) {
    return `// Agent type "${agentType}" not found`;
  }

  return code;
}

/**
 * Get agent code with additional context and imports
 * @param agentType - The type of agent to get code for
 * @returns Complete formatted TypeScript code with imports and context
 */
export function getCompleteAgentCode(agentType: string): string {
  const baseCode = getAgentCode(agentType);

  return `/**
 * ${agentType.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())} Agent
 * 
 * This agent implementation demonstrates the ${agentType} pattern
 * using the AI SDK with OpenAI models.
 */

${baseCode}

// Usage example:
// const result = await testAgent("${agentType}", { prompt: "your input here" });
// logger.debug(result);`;
}
