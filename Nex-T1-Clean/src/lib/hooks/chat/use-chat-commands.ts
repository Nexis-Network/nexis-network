/**
 * Chat Commands Hook
 * Handles execution of slash commands (/analyze, /ideate, /summarize)
 */

import { useCallback } from "react";
import { parallelProcessing } from "@/server/actions";
import { generateAgentIdeaAction, generateTextAction } from "@/app/(marketing)/actions";
import { generateImageAction } from "@/app/actions/image-actions";
import type { ConversationMessage, ChatCommand } from "@/components/chat/types";

function createId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function useChatCommands() {
  const executeCommand = useCallback(
    async (
      command: ChatCommand,
      args: string,
      history: Array<{ role: string; content: string }>
    ): Promise<ConversationMessage> => {
      switch (command) {
        case "analyze": {
          if (!args) {
            throw new Error(
              "Add the content you want me to analyze, e.g. `/analyze pricing strategy for the pro tier`."
            );
          }
          const analysis = await parallelProcessing(args);
          if (!analysis.success || !analysis.data) {
            throw new Error(analysis.error ?? "Unable to analyze right now.");
          }

          const { results, metadata, usage } = analysis.data;
          const sections = results
            .map((result) => `### ${result.task}\n${result.result}`)
            .join("\n\n");

          const metadataLine = `**Workers:** ${metadata.workers} • **Input length:** ${metadata.inputLength} characters • **Processed:** ${new Date(
            metadata.processedAt
          ).toLocaleString()}`;

          const usageLine = usage
            ? `**Token usage:** ${usage.totalTokens} (input ${usage.inputTokens} / output ${usage.outputTokens})`
            : undefined;

          const content = [
            "## Multi-perspective analysis",
            sections,
            metadataLine,
            usageLine,
          ]
            .filter(Boolean)
            .join("\n\n");

          return {
            id: createId(),
            role: "assistant",
            content,
            status: "ready",
            thoughts: [],
            sources: [],
            payloads: [
              {
                type: "analysis",
                topic: args,
                data: analysis.data,
              },
              {
                type: "search",
                query: args,
                data: {
                  text: sections,
                  sources: [],
                },
              },
            ],
            query: args,
            toolInvocation: {
              name: "/analyze",
              description: "Ran marketing, product, and technical review",
            },
          };
        }

        case "ideate": {
          const { object } = await generateAgentIdeaAction(args || undefined);
          const featuresList = object.features.map((feature) => `- ${feature}`).join("\n");
          const content = [
            `## Concept: ${object.name}`,
            `_${object.tagline}_`,
            "",
            `**Description:** ${object.description}`,
            `**Use Case:** ${object.useCase}`,
            `**Unique Value:** ${object.uniqueValue}`,
            "",
            "**Key Features:**",
            featuresList,
          ]
            .filter(Boolean)
            .join("\n");

          return {
            id: createId(),
            role: "assistant",
            content,
            status: "ready",
            thoughts: [],
            agent: object,
            sources: [],
            toolInvocation: {
              name: "/ideate",
              description: "Generated an AI agent concept",
            },
          };
        }

        case "summarize": {
          const context = args
            ? args
            : history
                .slice(-6)
                .map((turn) => `${turn.role.toUpperCase()}: ${turn.content}`)
                .join("\n");

          if (!context) {
            throw new Error(
              "There's nothing to summarize yet. Add text after /summarize or provide more context first."
            );
          }

          const { text } = await generateTextAction(
            `Summarize the following information into a concise paragraph that highlights key decisions, insights, and next steps.\n\n${context}`
          );

          const content = `## Summary\n${text}`;

          return {
            id: createId(),
            role: "assistant",
            content,
            status: "ready",
            thoughts: [],
            sources: [],
            toolInvocation: {
              name: "/summarize",
              description: "Generated conversation summary",
            },
          };
        }

        case "generate-image": {
          if (!args) {
            throw new Error(
              "Describe the image you want to generate, e.g. `/generate-image a futuristic city at sunset`."
            );
          }

          const result = await generateImageAction(args);

          if (!result.success) {
            throw new Error(result.error || "Failed to generate image");
          }

          const content = `Generated image: "${args}"`;

          return {
            id: createId(),
            role: "assistant",
            content,
            status: "ready",
            thoughts: [],
            sources: [],
            payloads: [
              {
                type: "image-artifact",
                url: result.url!,
                prompt: args,
                revisedPrompt: result.revisedPrompt,
              },
            ],
            toolInvocation: {
              name: "/generate-image",
              description: "Generated image with DALL-E 3",
            },
          };
        }

        default:
          throw new Error(`Unknown command: /${command}`);
      }
    },
    []
  );

  return { executeCommand };
}
