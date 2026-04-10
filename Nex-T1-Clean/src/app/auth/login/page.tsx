import { redirect } from "next/navigation";

import { buildAuthSignInUrl } from "@/lib/constants";

type SearchParams = Record<string, string | string[] | undefined>;

type PageProps = {
  searchParams?: Promise<SearchParams>;
};

function normalizeRedirectTarget(value?: string | string[]) {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === "string") {
    const candidate = value[0].trim();
    return candidate.length > 0 ? candidate : undefined;
  }
  return undefined;
}

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const redirectTo = normalizeRedirectTarget(resolvedSearchParams?.redirectTo ?? resolvedSearchParams?.next);
  const target = buildAuthSignInUrl(redirectTo ? { redirectTo } : undefined);
  redirect(target);
}
