/**
 * Chat Hooks Index
 * Production-ready hooks for chat functionality
 */

export { useAutomationPreferences } from "./use-automation-preferences";
export { useChatMessages } from "./use-chat-messages";
export { useChatCommands } from "./use-chat-commands";

/** Model tier access control hook */
export { 
  useModelTierCheck, 
  validateModelAccess,
  type UserTier,
  type ModelTier,
} from "./use-model-tier-check";
