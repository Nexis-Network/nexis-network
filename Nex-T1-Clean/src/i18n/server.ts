import { cookies, headers } from "next/headers";

import type { ActiveLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { resolveLocaleFromRequestStores } from "@/i18n/request";
import { translate, type TranslationValues } from "@/i18n/translate";

export async function getRequestI18n(): Promise<{
  locale: ActiveLocale;
  messages: ReturnType<typeof getMessages>;
  t: (key: string, values?: TranslationValues) => string;
}> {
  const [headerStore, cookieStore] = await Promise.all([headers(), cookies()]);
  const locale = resolveLocaleFromRequestStores(headerStore, cookieStore);
  const messages = getMessages(locale);

  return {
    locale,
    messages,
    t: (key, values) => translate(messages, key, values),
  };
}
