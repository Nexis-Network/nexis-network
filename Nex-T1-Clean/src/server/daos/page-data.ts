import { cache } from "react";

import type { DaoDirectoryFilters } from "@/modules/daos/contracts";
import { getDaoOverview, listDaoDirectory } from "@/modules/daos/services/directory-service";

// DAO pages are user- and org-scoped. They should not participate in Cache Components
// persistence because that creates stale or cross-user risk under `cacheComponents: true`.
// React cache gives us request-local deduplication without cross-request persistence.
export const getCachedDaoDirectoryData = cache(async (options: {
  userId: string;
  orgId: string;
  filters: Partial<DaoDirectoryFilters>;
}) => {
  return listDaoDirectory(options);
});

export const getCachedDaoOverviewData = cache(async (options: {
  userId: string;
  orgId: string;
  daoId: string;
}) => {
  return getDaoOverview(options);
});
