import { redirect } from "next/navigation";

import { SettingsWorkspaceSection } from "@/components/settings-v2/sections/workspace/settings-workspace-section";
import { resolveLegacySettingsHref } from "@/modules/settings/legacy-route-resolver";


type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SettingsWorkspacePage({ searchParams }: PageProps) {
  const params = await searchParams;

  if (params?.tab) {
    const nextHref = resolveLegacySettingsHref("/settings/workspace", params);
    if (nextHref) {
      redirect(nextHref);
    }
  }

  return <SettingsWorkspaceSection />;
}
