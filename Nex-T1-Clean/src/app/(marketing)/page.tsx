import { LandingV2Root } from "@/components/landing/landing-v2-root";
import { Metadata } from "next";
import { cookies, headers } from "next/headers";

import { getMessages } from "@/i18n/messages";
import { resolveLocaleFromRequestStores } from "@/i18n/request";
import { translate } from "@/i18n/translate";

export async function generateMetadata(): Promise<Metadata> {
  const headerStore = await headers();
  const cookieStore = await cookies();
  const locale = resolveLocaleFromRequestStores(headerStore, cookieStore);
  const messages = getMessages(locale);

  return {
    title: translate(messages, "meta.homeTitle"),
    description: translate(messages, "meta.homeDescription"),
    other: {
      "talentapp:project_verification":
        "b12246422d92c62c9108c9f9163209c107a239024f4293b5ee9367cd62a44ab3281892eb5e6761181f43fd752dff5123a5d9f4eaef64fa41b7b39810854eecb9",
    },
  };
}

export default function LandingPage() {
  return <LandingV2Root />;
}
