import { AUTH_VIEWS, DEFAULT_AUTH_VIEW, type AuthView } from "@/components/auth/types";
import { AuthPageClient } from "@/components/auth/auth-page-client";
import { getRequestI18n } from "@/i18n/server";

type Params = { view?: string[] };

type SearchParams = Record<string, string | string[] | undefined>;

export async function generateMetadata() {
  const { t } = await getRequestI18n();

  return {
    title: t("auth.meta.title"),
    description: t("auth.meta.description"),
  };
}

export default async function AuthPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  let resolvedParams: Params;
  let resolvedSearchParams: SearchParams;

  try {
    resolvedParams = await params;
    resolvedSearchParams = await searchParams;
  } catch (error) {
    throw new Error("Failed to resolve auth route parameters", { cause: error });
  }

  const viewFromSearch = (() => {
    const raw = resolvedSearchParams?.view;
    if (typeof raw === "string") {
      return raw;
    }
    if (Array.isArray(raw) && raw.length > 0) {
      return raw[0];
    }
    return undefined;
  })();

  const viewFromPath = resolvedParams?.view?.[0];
  const rawView = (viewFromSearch ?? viewFromPath)?.toLowerCase();
  const view = AUTH_VIEWS.includes(rawView as AuthView)
    ? (rawView as AuthView)
    : DEFAULT_AUTH_VIEW;

  const redirectParam = (() => {
    const candidate = resolvedSearchParams?.redirectTo ?? resolvedSearchParams?.next;
    if (typeof candidate === "string") {
      return candidate;
    }
    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate[0];
    }
    return undefined;
  })();

  const redirectTo = redirectParam && redirectParam.length > 0 ? redirectParam : "/onboarding";

  const inviteParam = resolvedSearchParams?.invite;
  const inviteCode =
    typeof inviteParam === "string"
      ? inviteParam
      : Array.isArray(inviteParam) && inviteParam.length > 0
        ? inviteParam[0]
        : undefined;

  return <AuthPageClient view={view} redirectTo={redirectTo} inviteCode={inviteCode} />;
}
