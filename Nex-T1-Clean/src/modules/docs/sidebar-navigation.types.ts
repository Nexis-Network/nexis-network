import type { LucideIcon } from "lucide-react";

import type { DocsPageRecord } from "@/modules/docs/types";

export type DocsAudienceId = "users" | "developers" | "daos" | "traders";

export type DocsAudienceOption = {
  id: DocsAudienceId;
  title: string;
  description: string;
  icon: LucideIcon;
};

export type DocsSidebarCategory = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  pages: DocsPageRecord[];
};

export type DocsSidebarGroup = {
  id: string;
  title: string;
  categories: DocsSidebarCategory[];
};

export type DocsAudienceNavigation = DocsAudienceOption & {
  groups: DocsSidebarGroup[];
};

export type CategoryDefinition = Omit<DocsSidebarCategory, "id" | "pages"> & {
  pageIds: string[];
};

export type AudienceBlueprint = DocsAudienceOption & {
  groups: Array<{
    id: string;
    title: string;
    categoryIds: string[];
  }>;
};
