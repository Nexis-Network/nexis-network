// Load global polyfills first
import "@/lib/global-polyfill";
import "./globals.css";

import type { Metadata, Viewport } from "next";
import { Suspense, type ReactNode } from "react";

import { fontVariablesClassName } from "@/lib/fonts";
import { RequestScopedBody } from "@/app/request-scoped-body";
import { RequestScopedHead } from "@/app/request-scoped-head";
import {
  DEFAULT_LOCALE,
  generateRootMetadata,
  rootViewport,
} from "@/app/root-layout-metadata";
import { ThemeProvider } from "@/components/theme-provider";

export async function generateMetadata(): Promise<Metadata> {
  return generateRootMetadata();
}

export const viewport: Viewport = rootViewport;

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang={DEFAULT_LOCALE} suppressHydrationWarning>
      <head>
        <Suspense fallback={null}>
          <RequestScopedHead />
        </Suspense>
        {/* DNS Prefetch for external APIs */}
        <link rel="dns-prefetch" href="//public-api.birdeye.so" />
        <link rel="dns-prefetch" href="//api.coingecko.com" />
        <link rel="dns-prefetch" href="//quote-api.jup.ag" />

        {/* Preconnect to Supabase for faster auth/data calls */}
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <link
            rel="preconnect"
            href={process.env.NEXT_PUBLIC_SUPABASE_URL}
          />
        )}

        {/* Preconnect to video storage for faster initial connection */}
        <link
          rel="preconnect"
          href="https://meribtk8qpfzbmbf.public.blob.vercel-storage.com"
          crossOrigin="anonymous"
        />
      </head>
      <body
        suppressHydrationWarning
        className={`font-sans ${fontVariablesClassName}`}
      >
        <Suspense fallback={null}>
          <ThemeProvider>
            <RequestScopedBody>{children}</RequestScopedBody>
          </ThemeProvider>
        </Suspense>
      </body>
    </html>
  );
}
