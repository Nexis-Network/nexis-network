/**
 * Persistent Memory System
 *
 * Cross-session memory with 4-type taxonomy:
 * - user: Role, goals, preferences
 * - feedback: Corrections and validated approaches
 * - project: Ongoing work, initiatives, deadlines
 * - reference: Pointers to external resources
 *
 * Storage: ~/.nex-t1/projects/<slug>/memory/
 */

export type {
  MemoryType,
  MemoryFrontmatter,
  MemoryFile,
  MemoryConfig,
  MemoryIndexEntry,
} from "./types";

export {
  MEMORY_TYPES,
  DEFAULT_MEMORY_CONFIG,
  MAX_FRONTMATTER_FIELD_LENGTH,
} from "./types";

export {
  getMemoryDir,
  ensureMemoryDir,
  scanMemoryFiles,
  readIndex,
  buildMemoryPrompt,
  writeMemoryFile,
  updateIndex,
} from "./store";
