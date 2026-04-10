import type { ChatAgentRequest, ArtifactHint } from "./types";

export type SystemPromptComposerInput = {
  userId?: string | null;
  basePrompt: string;
  latestUserMessage: string;
  automationDirective?: string;
  systemProfileInstruction?: string;
  promptModuleSegments?: string[];
  artifactHints?: ArtifactHint[];
};

/**
 * Build the system prompt by combining base prompt with modules and directives.
 * Note: Memory enrichment is handled by VariableResolver via {{MEMORY_SHORT}} and {{MEMORY_LONG}} placeholders.
 */
export const buildSystemPrompt = async ({
  basePrompt,
  automationDirective,
  systemProfileInstruction,
  promptModuleSegments,
  artifactHints,
}: SystemPromptComposerInput) => {
  const artifactHintSegment =
    artifactHints && artifactHints.length > 0 ? buildArtifactHintSegment(artifactHints) : null;
  return [basePrompt, ...(promptModuleSegments ?? []), artifactHintSegment, systemProfileInstruction, automationDirective]
    .filter((segment): segment is string => Boolean(segment && segment.trim().length > 0))
    .join("\n\n");
};

export const formatMessages = ({
  enrichedSystemPrompt,
  marketContext,
  messages,
}: {
  enrichedSystemPrompt: string;
  marketContext?: string | null;
  messages: ChatAgentRequest["messages"];
}) => {
  return [
    {
      role: "system" as const,
      content: enrichedSystemPrompt,
    },
    ...(marketContext
      ? [
          {
            role: "system" as const,
            content: marketContext,
          },
        ]
      : []),
    ...messages,
  ];
};

export const buildFinalSystemPrompt = ({
  base,
  marketContext,
  extra,
}: {
  base: string;
  marketContext?: string | null;
  extra?: string[];
}) => {
  return [base, marketContext, ...(extra ?? [])]
    .filter((segment): segment is string => Boolean(segment && segment.length > 0))
    .join("\n\n");
};

const buildArtifactHintSegment = (hints: ArtifactHint[]): string => {
  return [
    "## Artifact Streams",
    ...hints.map((hint) => `- ${hint.id}: ${hint.purpose}`),
    "Reference each artifact in your summary and direct the user to open the Right Panel for details.",
  ].join("\n");
};
