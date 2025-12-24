import "server-only";

import type { RequestIdentity } from "@/lib/server/identity";

export type ServiceAuthHeaders = Record<string, string>;

export function buildIdentityHeaders(identity: RequestIdentity | null | undefined): ServiceAuthHeaders {
  if (!identity) return {};
  return {
    "X-Nexis-User-Id": identity.id,
    "X-Nexis-Auth-Method": identity.method,
  };
}
