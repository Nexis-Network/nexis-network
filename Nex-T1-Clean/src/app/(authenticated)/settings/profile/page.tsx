import { SocialProfilePage } from "@/components/settings/social/social-profile-page";
import { SettingsProfileSection } from "@/components/settings-v2/sections/profile/settings-profile-section";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function resolveSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0];
  }

  return undefined;
}

export default async function SettingsProfilePage({
  searchParams,
}: PageProps) {
  const params = (await searchParams) ?? {};
  const activeView = resolveSearchParam(params.view) ?? "identity";

  if (activeView === "public") {
    return (
      <SocialProfilePage
        viewedUserId={resolveSearchParam(params.userId)?.trim() || undefined}
        focusPostId={resolveSearchParam(params.focusPostId)?.trim() || undefined}
        focusCommentId={
          resolveSearchParam(params.focusCommentId)?.trim() || undefined
        }
      />
    );
  }

  return <SettingsProfileSection activeView={activeView} />;
}
