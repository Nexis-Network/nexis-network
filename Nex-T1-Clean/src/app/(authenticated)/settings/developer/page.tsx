import { redirect } from "next/navigation";

import { SettingsDeveloperSection } from "@/components/settings-v2/sections/developer/settings-developer-section";
import { resolveLegacySettingsHref } from "@/modules/settings/legacy-route-resolver";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};


export default async function SettingsDeveloperPage({ searchParams }: PageProps) {
  const params = await searchParams;

  if (params?.tab) {
    const nextHref = resolveLegacySettingsHref("/settings/developer", params);
    if (nextHref) {
      redirect(nextHref);
    }
  }

  return <SettingsDeveloperSection />;
}
