import type { MemoryEntry } from "./bedrock-memory.types";

export function formatBedrockMemoriesForPrompt(
  memories: MemoryEntry[],
): string {
  if (memories.length === 0) {
    return "";
  }

  const sections: string[] = [];
  const coreMemories = memories.filter((memory) => memory.type === "core");
  const longTermMemories = memories.filter(
    (memory) => memory.type === "long_term",
  );
  const shortTermMemories = memories.filter(
    (memory) => memory.type === "short_term",
  );

  if (coreMemories.length > 0) {
    sections.push(
      "## User Profile\n" + coreMemories.map((memory) => `- ${memory.content}`).join("\n"),
    );
  }

  if (longTermMemories.length > 0) {
    sections.push(
      "## User Preferences\n" +
        longTermMemories.map((memory) => `- ${memory.content}`).join("\n"),
    );
  }

  if (shortTermMemories.length > 0) {
    sections.push(
      "## Recent Context\n" +
        shortTermMemories.map((memory) => `- ${memory.content}`).join("\n"),
    );
  }

  return sections.join("\n\n");
}
