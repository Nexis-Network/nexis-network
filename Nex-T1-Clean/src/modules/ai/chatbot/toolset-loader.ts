import type { Tool } from "ai";
import { logAnalyticsBreadcrumb } from "@/modules/analytics/server";
import { resolveAllowedToolIds } from "@/modules/ai/system-guidance";
import { isToolBlocked } from "@/modules/ai/tool-risk-registry";
import { z } from "zod";

import { ALL_TOOL_LOADERS, CATEGORY_TOOLS } from "./tool-registry";
import type { ToolCategory } from "./tool-registry.types";
import { recordToolHealth } from "./toolset-health";
import { logger } from "@/lib/logger";

const ALWAYS_ALLOWED_TOOL_IDS = new Set<string>();
const loadedToolsCache = new Map<string, Tool>();
const loggedDisallowedTools = new Set<string>();

let allowedToolIdsCache: Set<string> | null = null;
let chatbotToolsetCache: Record<string, Tool> | null = null;
let chatbotToolsetPromise: Promise<Record<string, Tool>> | null = null;

const ToolSchema = z.object({
  description: z.string().min(6),
  execute: z.function().args(z.any()).returns(z.any()),
  inputSchema: z.any().optional(),
  parameters: z.any().optional(),
});

const resolveAllowedToolIdsSet = async (): Promise<Set<string>> => {
  if (allowedToolIdsCache) {
    return allowedToolIdsCache;
  }

  allowedToolIdsCache = new Set(await resolveAllowedToolIds());
  return allowedToolIdsCache;
};

const isToolAllowed = async (toolId: string): Promise<boolean> => {
  if (isToolBlocked(toolId)) {
    return false;
  }

  const allowedToolIds = await resolveAllowedToolIdsSet();
  return allowedToolIds.size === 0 || allowedToolIds.has(toolId) || ALWAYS_ALLOWED_TOOL_IDS.has(toolId);
};

const logDisallowedTool = (toolId: string, source: string) => {
  if (loggedDisallowedTools.has(toolId)) {
    return;
  }

  loggedDisallowedTools.add(toolId);
  logAnalyticsBreadcrumb("ai_tool_disallowed", { toolId, source });
};

const isValidTool = (tool: UntypedJson, toolId: string): tool is Tool => {
  try {
    const parsed = ToolSchema.superRefine((value, ctx) => {
      const schema = value.inputSchema ?? value.parameters;
      if (!schema || typeof schema !== "object") {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "missing input schema" });
      }
    }).parse(tool);

    if (typeof parsed.execute !== "function") {
      throw new Error("execute must be a function");
    }

    return true;
  } catch (error) {
    logger.error(`[toolset] Validation failed for tool "${toolId}":`, error instanceof Error ? error.message : error);
    return false;
  }
};

const loadTool = async (toolId: string): Promise<Tool | null> => {
  const cached = loadedToolsCache.get(toolId);
  if (cached) {
    return cached;
  }

  const loader = ALL_TOOL_LOADERS[toolId];
  if (!loader) {
    logger.warn(`[toolset] No loader found for tool "${toolId}"`);
    return null;
  }

  try {
    if (loader.enabled && !(await loader.enabled())) {
      return null;
    }

    const tool = await loader.load();
    if (!isValidTool(tool, toolId)) {
      recordToolHealth(toolId, false, "validation_failed");
      return null;
    }

    loadedToolsCache.set(toolId, tool);
    recordToolHealth(toolId, true);
    return tool;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[toolset] Failed to load tool "${toolId}":`, message);
    recordToolHealth(toolId, false, message);
    return null;
  }
};

async function loadToolEntries(toolIds: string[], source: string): Promise<Array<[string, Tool]>> {
  const results = await Promise.all(
    toolIds.map(async (toolId) => {
      if (!(await isToolAllowed(toolId))) {
        logDisallowedTool(toolId, source);
        return null;
      }

      const tool = await loadTool(toolId);
      return tool ? ([toolId, tool] as [string, Tool]) : null;
    }),
  );

  return results.filter((entry): entry is [string, Tool] => Array.isArray(entry));
}

export const getChatbotToolset = async (): Promise<Record<string, Tool>> => {
  if (chatbotToolsetCache) {
    return chatbotToolsetCache;
  }

  if (!chatbotToolsetPromise) {
    chatbotToolsetPromise = (async () => {
      try {
        const entries = await loadToolEntries(Object.keys(ALL_TOOL_LOADERS), "core");
        logger.debug(`[toolset] Loaded ${entries.length} tools: ${entries.map(([id]) => id).join(", ")}`);
        return Object.freeze(Object.fromEntries(entries) as Record<string, Tool>);
      } catch (error) {
        logger.error("[toolset] Failed to build toolset:", error);
        return Object.freeze({} as Record<string, Tool>);
      }
    })();
  }

  chatbotToolsetCache = await chatbotToolsetPromise;
  return chatbotToolsetCache;
};

export const loadToolsForCategory = async (category: ToolCategory): Promise<Record<string, Tool>> => {
  const entries = await loadToolEntries(CATEGORY_TOOLS[category] ?? [], category);
  return Object.fromEntries(entries);
};

export const loadToolsForCategories = async (
  categories: ToolCategory[],
): Promise<Record<string, Tool>> => {
  const toolsets = await Promise.all(categories.map(loadToolsForCategory));
  return Object.assign({}, ...toolsets);
};

export const loadToolsByIds = async (toolIds: string[]): Promise<Record<string, Tool>> => {
  const uniqueToolIds = Array.from(new Set(toolIds.map((toolId) => toolId.trim()).filter(Boolean)));
  const entries = await loadToolEntries(uniqueToolIds, "direct");
  return Object.fromEntries(entries);
};

export const filterLoadableToolIds = async (toolIds: string[]): Promise<string[]> => {
  const uniqueToolIds = Array.from(new Set(toolIds.map((toolId) => toolId.trim()).filter(Boolean)));
  const results = await Promise.all(
    uniqueToolIds.map(async (toolId) => {
      const loader = ALL_TOOL_LOADERS[toolId];
      if (!loader) {
        return null;
      }

      if (!(await isToolAllowed(toolId))) {
        return null;
      }

      if (loader.enabled && !(await loader.enabled())) {
        return null;
      }

      return toolId;
    }),
  );

  return results.filter((toolId): toolId is string => typeof toolId === "string");
};

export const clearToolsetCache = () => {
  chatbotToolsetCache = null;
  chatbotToolsetPromise = null;
  allowedToolIdsCache = null;
  loadedToolsCache.clear();
  loggedDisallowedTools.clear();
};
