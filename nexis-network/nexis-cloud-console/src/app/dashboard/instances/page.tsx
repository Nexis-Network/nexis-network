import Link from "next/link";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { nexisFetch } from "@/lib/server/nexis-cloud";
import { normalizeCvmId } from "@/lib/cvms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";
import { InstancesTableWrapper } from "@/components/instances/instances-table-wrapper";
import type { CvmListItem } from "@/components/instances/instances-table";

type SearchParams = {
  page?: string;
  page_size?: string;
};

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function buildPageHref(page: number, pageSize: number) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("page_size", String(pageSize));
  return `/dashboard/instances?${params.toString()}`;
}

export default async function InstancesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const cookieStore = await cookies();
  const apiKey = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const page = parsePositiveInt(searchParams.page, 1);
  const pageSize = parsePositiveInt(searchParams.page_size, 20);

  if (!apiKey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Link an API key to view instances</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-text-secondary">
          <p>
            Your passkey session is active, but CVM management requires a Nexis Cloud API key.
          </p>
          <Link
            className={buttonClassName()}
            href="/login?link=api-key&redirect=/dashboard/instances"
          >
            Link API key
          </Link>
        </CardContent>
      </Card>
    );
  }

  const result = await nexisFetch(`/cvms/paginated?page=${page}&page_size=${pageSize}`, {
    apiKey,
  });

  if (!result.ok) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unable to load instances</CardTitle>
        </CardHeader>
        <CardContent className="text-text-secondary">
          {typeof result.data === "string" ? result.data : "Request failed."}
        </CardContent>
      </Card>
    );
  }

  const payload = result.data as {
    items?: Array<{
      hosted?: { app_id?: string | null; id?: string | null; app_url?: string | null } | null;
      name?: string | null;
      status?: string | null;
      in_progress?: boolean;
      node?: { name?: string | null; region_identifier?: string | null } | null;
      vcpu?: number | null;
      memory?: number | null;
      disk_size?: number | null;
      public_urls?: Array<{ app: string; instance: string }>;
    }>;
    total?: number;
    page?: number;
    page_size?: number;
    pages?: number;
  };

  const items = payload.items ?? [];
  const currentPage = payload.page ?? page;
  const totalPages = payload.pages ?? 1;
  const totalItems = payload.total ?? items.length;
  const resolvedPageSize = payload.page_size ?? pageSize;
  const rows: CvmListItem[] = items.map((cvm, index) => {
    const hosted = cvm.hosted ?? {};
    const rawAppId = hosted.app_id || hosted.id || "";
    const appId = rawAppId ? normalizeCvmId(rawAppId) : null;
    return {
      id: appId || `${cvm.name ?? "cvm"}-${rawAppId || index}`,
      appId,
      name: cvm.name || "Unnamed CVM",
      status: cvm.status || "unknown",
      region: cvm.node?.region_identifier || cvm.node?.name || null,
      vcpu: cvm.vcpu ?? null,
      memory: cvm.memory ?? null,
      diskSize: cvm.disk_size ?? null,
      inProgress: Boolean(cvm.in_progress),
      publicUrls: cvm.public_urls ?? [],
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Instances</h1>
          <p className="text-text-secondary mt-1">
            {totalItems} total CVMs in this workspace.
          </p>
        </div>
        <Link className={buttonClassName()} href="/dashboard/deploy">
          Deploy CVM
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active CVMs</CardTitle>
        </CardHeader>
        <CardContent>
          <InstancesTableWrapper items={rows} />
          {totalPages > 1 && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-text-secondary">
              <div>
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  className={
                    currentPage === 1
                      ? `${buttonClassName({ variant: "secondary", size: "sm" })} pointer-events-none opacity-60`
                      : buttonClassName({ variant: "secondary", size: "sm" })
                  }
                  href={buildPageHref(Math.max(currentPage - 1, 1), resolvedPageSize)}
                  aria-disabled={currentPage === 1}
                >
                  Previous
                </Link>
                <Link
                  className={
                    currentPage === totalPages
                      ? `${buttonClassName({ variant: "secondary", size: "sm" })} pointer-events-none opacity-60`
                      : buttonClassName({ variant: "secondary", size: "sm" })
                  }
                  href={buildPageHref(Math.min(currentPage + 1, totalPages), resolvedPageSize)}
                  aria-disabled={currentPage === totalPages}
                >
                  Next
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted">Rows</span>
                {[10, 20, 50].map((size) => (
                  <Link
                    key={size}
                    className={
                      size === resolvedPageSize
                        ? "text-accent-sky text-xs font-semibold"
                        : "text-text-muted text-xs hover:text-text-primary"
                    }
                    href={buildPageHref(1, size)}
                  >
                    {size}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
