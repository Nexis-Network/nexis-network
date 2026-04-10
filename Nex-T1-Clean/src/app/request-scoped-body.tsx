import type { ReactElement, ReactNode } from "react";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { UmamiScript } from "@/components/analytics/umami-script";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { PromoteGlobalsPreload } from "@/components/system/globals-preload-fix";
import { getMessages } from "@/i18n/messages";

import {
  getRequestLocale,
  shouldLoadVercelInsights,
} from "./root-layout-metadata";
export async function RequestScopedBody({
  children,
}: Readonly<{
  children: ReactNode;
}>): Promise<ReactElement> {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);

  return (
    <LocaleProvider locale={locale} messages={messages}>
      <PromoteGlobalsPreload />
      <ThemeProvider
        attribute="class"
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
      {shouldLoadVercelInsights ? <Analytics /> : null}
      {shouldLoadVercelInsights ? <SpeedInsights /> : null}
      <UmamiScript />
    </LocaleProvider>
  );
}
