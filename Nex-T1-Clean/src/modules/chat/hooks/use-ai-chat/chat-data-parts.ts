import { z } from "zod";

import {
  CANONICAL_ARTIFACT_CARD_TYPES,
  CANONICAL_IDE_ARTIFACT_TYPES,
} from "@/modules/chat/ui-message-parts";

const APP_CHAT_DATA_PART_NAMES = [
  "aievent",
  "payload",
  "status",
  "handoff",
  "agent-handoff",
  "agent-status",
  "ide-session",
  "workflow-canvas",
  "artifact-card",
  "task",
  "queue",
  "checkpoint",
  "test-results",
  ...CANONICAL_IDE_ARTIFACT_TYPES.map((type) => `artifact-${type}`),
  ...CANONICAL_ARTIFACT_CARD_TYPES.map((type) => `artifact-${type}`),
] as const;

type AppChatDataPartName = (typeof APP_CHAT_DATA_PART_NAMES)[number];

export type AppChatDataParts = {
  [K in AppChatDataPartName]: unknown;
};

export const APP_CHAT_DATA_PART_SCHEMAS = Object.fromEntries(
  APP_CHAT_DATA_PART_NAMES.map((name) => [name, z.unknown()]),
) as {
  [K in AppChatDataPartName]: z.ZodType<AppChatDataParts[K]>;
};
