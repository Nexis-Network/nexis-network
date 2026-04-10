/**
 * Context Assembly Pipeline
 *
 * Cache-aware, ordered context assembly for the Nex chat pipeline.
 * Replaces monolithic prompt construction with a pipeline of registered
 * context sources, each with explicit cache scope and provenance tracking.
 */

// Types
export type {
  CacheScope,
  ContextSource,
  ContextResolveInput,
  ProvenanceEntry,
  PromptSection,
  ResolvedContext,
  ContextPipelineConfig,
} from "./types";

// Source Registry
export {
  ContextSourceRegistry,
  assemblePromptFromSections,
} from "./sources";

// Built-in sources
export { BUILT_IN_SOURCES } from "./built-in-sources";

// Source utilities
export { SCOPE_ORDER } from "./source-utils";

// Prompt Assembler
export {
  PromptAssembler,
} from "./assembler";

export type {
  ResolvedContextSection,
  AssemblyResult,
  UserContextPayload,
  ToolSchemaInjectionOptions,
} from "./assembler";

// User context
export {
  buildUserContextPart,
  buildUserContextProvenance,
} from "./user-context";

// Message Builder
export {
  prependUserContext,
  injectAttachments,
  prepareMessages,
} from "./message-builder";

export type {
  PipelineMessage,
  UserContext,
  PrepareMessagesOptions,
  PrepareMessagesResult,
} from "./message-builder";

// Attachments
export {
  buildAttachmentMessage,
} from "./attachments";

export type {
  AttachmentType,
  AttachmentScope,
  Attachment,
  AttachmentMessage,
} from "./attachments";
