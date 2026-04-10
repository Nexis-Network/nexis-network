import type { UnifiedMemoryEntry } from "./unified-memory-provider.types";

export function formatMemoryContextForPrompt(context: {
  shortTerm: UnifiedMemoryEntry[];
  longTerm: UnifiedMemoryEntry[];
  personalization: UnifiedMemoryEntry[];
}): string {
  const sections: string[] = [];

  if (context.longTerm.length > 0) {
    sections.push(
      "## User Context (Long-term)\n" +
        context.longTerm
          .slice(0, 3)
          .map((entry) => `- ${entry.content}`)
          .join("\n"),
    );
  }

  if (context.personalization.length > 0) {
    sections.push(
      "## User Preferences\n" +
        context.personalization
          .slice(0, 3)
          .map((entry) => `- ${entry.content}`)
          .join("\n"),
    );
  }

  if (context.shortTerm.length > 0) {
    sections.push(
      "## Recent Context\n" +
        context.shortTerm
          .slice(0, 5)
          .map((entry) => `- ${entry.content}`)
          .join("\n"),
    );
  }

  return sections.join("\n\n");
}
