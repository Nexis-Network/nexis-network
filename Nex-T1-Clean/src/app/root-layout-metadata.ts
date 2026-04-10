import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";

import { DEFAULT_LOCALE, type ActiveLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { resolveLocaleFromRequestStores } from "@/i18n/request";
import { translate } from "@/i18n/translate";

const DEFAULT_APP_URL = "https://nex-t1.ai";

function normalizeAppUrl(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const normalized = new URL(withProtocol);
    return normalized.origin.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

export const appUrl =
  normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL) ??
  normalizeAppUrl(
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  ) ??
  DEFAULT_APP_URL;

export const shouldLoadVercelInsights = process.env.VERCEL === "1";

const socialPreviewImage = `${appUrl}/blog/images/next1.jpg`;

export async function getRequestLocale(): Promise<ActiveLocale> {
  const headerStore = await headers();
  const cookieStore = await cookies();

  return resolveLocaleFromRequestStores(headerStore, cookieStore);
}

export async function generateRootMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const title = translate(messages, "meta.appTitle");
  const description = translate(messages, "meta.appDescription");

  return {
    metadataBase: new URL(appUrl),
    title,
    description,
    applicationName: "Nex-T1 AI",
    category: "technology",
    keywords: [
      "Web3 analytics",
      "DeFAI",
      "Nex-T1 DeFAI",
      "Web3 Copilot",
      "Nex-T1 Web3 Copilot",
      "Nex-T1 DeFi Copilot",
      "Nex-T1 Crypto Copilot",
      "Nex-T1 Crypto AI agents",
      "Nex-T1 Web3 AI agent",
      "Nex-T1 DeFi AI agent",
      "DeFi analytics platform",
      "crypto portfolio tracker",
      "blockchain insights",
      "Nex-T1 AI",
      "real-time crypto dashboard",
      "DeFi companion app",
    ],
    alternates: {
      canonical: appUrl,
    },
    openGraph: {
      type: "website",
      url: appUrl,
      siteName: "Nex-T1 AI",
      title,
      description,
      images: [
        {
          url: socialPreviewImage,
          width: 1200,
          height: 630,
          alt: "Nex-T1 AI copilot social preview",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialPreviewImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
        "max-video-preview": -1,
      },
    },
    icons: {
      icon: "/favicon.ico",
      shortcut: "/favicon.ico",
      apple: "/favicon.ico",
    },
  };
}

export const rootViewport: Viewport = {
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export { DEFAULT_LOCALE };
