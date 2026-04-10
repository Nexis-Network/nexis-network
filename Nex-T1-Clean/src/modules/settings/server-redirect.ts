import { redirect } from "next/navigation";

import { resolveLegacySettingsHref } from "./legacy-route-resolver";

type AsyncSearchParams =
  | Promise<Record<string, string | string[] | undefined> | undefined>
  | Record<string, string | string[] | undefined>
  | undefined;

export async function redirectLegacySettingsPage(
  pathname: string,
  searchParams: AsyncSearchParams,
  fallbackHref: string,
) {
  const resolvedSearchParams = searchParams instanceof Promise ? await searchParams : searchParams;
  const nextHref = resolveLegacySettingsHref(pathname, resolvedSearchParams) ?? fallbackHref;
  redirect(nextHref);
}
