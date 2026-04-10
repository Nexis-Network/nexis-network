import { revalidateTag } from "next/cache";

import type { DaoDirectoryFilters } from "@/modules/daos/contracts";

export function getDaoTag(daoId: string): string {
  return `dao:${daoId}`;
}

export function getDaoOverviewTag(daoId: string): string {
  return `dao-overview:${daoId}`;
}

export function getDaoOrgTag(orgId: string): string {
  return `dao-org:${orgId}`;
}

export function getDaoDirectoryTag(orgId: string): string {
  return `dao-directory:${orgId}`;
}

export function buildDaoDirectoryFacetKey(
  filters: Partial<DaoDirectoryFilters> | null | undefined,
): string {
  const normalized = {
    query: filters?.query?.trim().toLowerCase() ?? "",
    category: filters?.category?.trim().toLowerCase() ?? "",
    chainFamily: filters?.chainFamily ?? "",
    ownershipMode: filters?.ownershipMode ?? "",
    importSource: filters?.importSource ?? "",
    lifecycleState: filters?.lifecycleState ?? "",
    mineOnly: filters?.mineOnly === true ? "1" : "0",
  };

  return Object.entries(normalized)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

export function getDaoDirectoryFacetTag(
  orgId: string,
  filters: Partial<DaoDirectoryFilters> | null | undefined,
): string {
  return `dao-directory:${orgId}:facet:${buildDaoDirectoryFacetKey(filters)}`;
}

export function revalidateDaoDirectoryTags(
  orgId: string,
  filters?: Partial<DaoDirectoryFilters> | null,
): void {
  revalidateTag(getDaoOrgTag(orgId), "max");
  revalidateTag(getDaoDirectoryTag(orgId), "max");
  if (filters) {
    revalidateTag(getDaoDirectoryFacetTag(orgId, filters), "max");
  }
}

export function revalidateDaoTags(options: {
  orgId: string;
  daoId?: string | null;
  filters?: Partial<DaoDirectoryFilters> | null;
}): void {
  revalidateDaoDirectoryTags(options.orgId, options.filters);

  if (options.daoId) {
    revalidateTag(getDaoTag(options.daoId), "max");
    revalidateTag(getDaoOverviewTag(options.daoId), "max");
  }
}
