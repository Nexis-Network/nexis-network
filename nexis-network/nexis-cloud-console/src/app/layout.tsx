import type { Metadata } from "next";
import { Inter, Chivo_Mono, Space_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";
import { AnalyticsScripts } from "@/components/observability/analytics";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const chivoMono = Chivo_Mono({
  variable: "--font-chivo",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  weight: "400",
  variable: "--font-space",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Nexis Cloud Console",
    template: "%s · Nexis Cloud Console",
  },
  description: "Manage confidential compute, deployments, and AI workloads on Nexis Network.",
  applicationName: "Nexis Cloud Console",
  keywords: [
    "Nexis",
    "Confidential Computing",
    "TEE",
    "CVM",
    "AI Agents",
    "Cloud Console",
    "Web3",
  ],
  openGraph: {
    title: "Nexis Cloud Console",
    description: "Provision, monitor, and secure confidential workloads on Nexis Network.",
    url: "/",
    siteName: "Nexis Cloud Console",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Nexis Cloud Console",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nexis Cloud Console",
    description: "Provision, monitor, and secure confidential workloads on Nexis Network.",
    images: ["/opengraph-image"],
  },
  icons: {
    icon: "/favicon.png",
    apple: "/apple-icon",
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={cn(
          inter.variable,
          chivoMono.variable,
          spaceMono.variable,
          "antialiased bg-background-page text-text-primary font-sans h-screen w-screen overflow-hidden"
        )}
      >
        <Providers>
          {children}
          <AnalyticsScripts />
        </Providers>
      </body>
    </html>
  );
}
