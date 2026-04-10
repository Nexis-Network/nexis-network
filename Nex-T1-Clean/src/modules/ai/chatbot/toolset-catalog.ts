import { resolveToolsSpec } from "@/modules/ai/system-guidance";
import { filterBlockedToolIds } from "@/modules/ai/tool-risk-registry";

import {
  getCatalogToolCategories,
  getCatalogToolCategory,
  getCatalogToolIds,
  isCatalogToolEnabled,
} from "./tool-catalog-registry";
import type { ToolCategory } from "./tool-registry.types";

export type ChatbotToolCatalogEntry = {
  id: string;
  label: string;
  description: string;
  category: ToolCategory;
};

const humanizeToolId = (value: string): string =>
  value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((segment) => `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`)
    .join(" ");

const getLoadableCatalogToolIds = (): string[] =>
  filterBlockedToolIds(getCatalogToolIds()).filter((toolId) =>
    isCatalogToolEnabled(toolId),
  );

export const getChatbotToolIdentifiers = async (): Promise<string> => {
  return getLoadableCatalogToolIds().join(", ");
};

export const getChatbotToolCatalog = async (): Promise<ChatbotToolCatalogEntry[]> => {
  const [toolIds, toolsSpec] = await Promise.all([
    Promise.resolve(getLoadableCatalogToolIds()),
    resolveToolsSpec(),
  ]);
  const descriptions = new Map(
    (toolsSpec.tools ?? []).flatMap((tool) =>
      tool?.id ? [[tool.id, tool.description ?? `${humanizeToolId(tool.id)} capability.`] as const] : [],
    ),
  );

  return toolIds
    .map((toolId) => ({
      id: toolId,
      label: humanizeToolId(toolId),
      description: descriptions.get(toolId) ?? `${humanizeToolId(toolId)} capability.`,
      category: getCatalogToolCategory(toolId),
    }))
    .sort((left, right) => {
      const categoryDiff =
        getCatalogToolCategories().indexOf(left.category) -
        getCatalogToolCategories().indexOf(right.category);
      return categoryDiff !== 0 ? categoryDiff : left.label.localeCompare(right.label);
    });
};
