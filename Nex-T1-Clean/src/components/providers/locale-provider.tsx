"use client";

import { createContext, useContext, useMemo } from "react";

import type { ActiveLocale } from "@/i18n/config";
import type { TranslationTree, TranslationValues } from "@/i18n/translate";
import { translate } from "@/i18n/translate";

type LocaleContextValue = {
  locale: ActiveLocale;
  messages: TranslationTree;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  children,
  locale,
  messages,
}: {
  children: React.ReactNode;
  locale: ActiveLocale;
  messages: TranslationTree;
}) {
  const value = useMemo(() => ({ locale, messages }), [locale, messages]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocaleContext() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocaleContext must be used within a LocaleProvider");
  }
  return context;
}

export function useLocale() {
  return useLocaleContext().locale;
}

export function useTranslations(namespace?: string) {
  const { messages } = useLocaleContext();

  return (key: string, values?: TranslationValues) => {
    const path = namespace ? `${namespace}.${key}` : key;
    return translate(messages, path, values);
  };
}

