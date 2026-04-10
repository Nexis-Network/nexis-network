import { AUDIENCE_BLUEPRINTS, CATEGORY_DEFINITIONS } from "@/modules/docs/sidebar-navigation-data";
import {
  type DocsAudienceId,
  type DocsAudienceNavigation,
  type DocsAudienceOption,
  type DocsSidebarCategory,
  type DocsSidebarGroup,
} from "@/modules/docs/sidebar-navigation.types";
import { DOCS_PAGES } from "@/modules/docs/pages";
import type { DocsPageRecord } from "@/modules/docs/types";

export type {
  DocsAudienceId,
  DocsAudienceNavigation,
  DocsAudienceOption,
  DocsSidebarCategory,
  DocsSidebarGroup,
} from "@/modules/docs/sidebar-navigation.types";

const DOCS_PAGE_MAP = new Map<string, DocsPageRecord>(
  DOCS_PAGES.map((page) => [page.id, page]),
);

function resolvePages(pageIds: string[]): DocsPageRecord[] {
  return pageIds.flatMap((pageId) => {
    const page = DOCS_PAGE_MAP.get(pageId);
    return page ? [page] : [];
  });
}

function buildCategory(categoryId: string): DocsSidebarCategory {
  const definition = CATEGORY_DEFINITIONS[categoryId];

  return {
    id: categoryId,
    title: definition.title,
    description: definition.description,
    icon: definition.icon,
    pages: resolvePages(definition.pageIds),
  };
}

function buildGroups(groups: typeof AUDIENCE_BLUEPRINTS[number]["groups"]): DocsSidebarGroup[] {
  return groups.map((group) => ({
    id: group.id,
    title: group.title,
    categories: group.categoryIds.map(buildCategory),
  }));
}

function audienceHasPath(audience: DocsAudienceNavigation, pathname: string): boolean {
  return audience.groups.some((group) =>
    group.categories.some((category) =>
      category.pages.some((page) => page.href === pathname),
    ),
  );
}

export const DOCS_AUDIENCE_OPTIONS: DocsAudienceOption[] = AUDIENCE_BLUEPRINTS.map(
  ({ groups: _groups, ...audience }) => audience,
);

export const DOCS_AUDIENCE_NAVIGATION: DocsAudienceNavigation[] =
  AUDIENCE_BLUEPRINTS.map((audience) => ({
    ...audience,
    groups: buildGroups(audience.groups),
  }));

export function getDocsAudienceNavigation(
  audienceId: DocsAudienceId,
): DocsAudienceNavigation {
  return (
    DOCS_AUDIENCE_NAVIGATION.find((audience) => audience.id === audienceId) ??
    DOCS_AUDIENCE_NAVIGATION[0]
  );
}

export function getDocsAudienceForPath(pathname: string): DocsAudienceId {
  return (
    DOCS_AUDIENCE_NAVIGATION.find((audience) => audienceHasPath(audience, pathname))
      ?.id ?? DOCS_AUDIENCE_NAVIGATION[0].id
  );
}

export function audienceContainsPath(
  audienceId: DocsAudienceId,
  pathname: string,
): boolean {
  return audienceHasPath(getDocsAudienceNavigation(audienceId), pathname);
}

export function getDocsCategoryForPath(
  audienceId: DocsAudienceId,
  pathname: string,
): string {
  const categories = getDocsAudienceNavigation(audienceId).groups.flatMap(
    (group) => group.categories,
  );

  return (
    categories.find((category) =>
      category.pages.some((page) => page.href === pathname),
    )?.id ?? categories[0]?.id ?? ""
  );
}

export function getDocsCategory(
  audienceId: DocsAudienceId,
  categoryId: string,
): DocsSidebarCategory | null {
  const categories = getDocsAudienceNavigation(audienceId).groups.flatMap(
    (group) => group.categories,
  );

  return categories.find((category) => category.id === categoryId) ?? null;
}
