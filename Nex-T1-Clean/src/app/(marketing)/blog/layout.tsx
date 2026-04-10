import type { ReactNode } from "react";

import { LandingHeaderV2 } from "@/components/landing/landing-header-v2";
import { SiteFooter } from "@/components/marketing/site-footer";

export default function BlogLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <section className="flex min-h-screen flex-col bg-[#09090B] text-[#F4F4F4]">
      <LandingHeaderV2 />
      <main className="flex-1">{children}</main>
      <SiteFooter className="mt-12 border-t border-white/5" />
    </section>
  );
}

