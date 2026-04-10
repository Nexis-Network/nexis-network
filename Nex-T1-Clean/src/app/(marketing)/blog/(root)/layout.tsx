import Link from "next/link";
import Script from "next/script";
import { Suspense, type ReactNode } from "react";

import { BlogFilter } from "@/app/(marketing)/blog/category-filter";
import { Button } from "@/components/ui/button";
import { getRequestI18n } from "@/i18n/server";
import { getAllCategories, getInitialPosts } from "@/modules/blog/actions";
import { getBlogFilterCopy } from "@/modules/blog/i18n";
import { getCspNonce } from "@/lib/security/nonce";

const PAGE_SIZE = 12;

async function BlogUnicornScript() {
  const nonce = await getCspNonce();

  return (
    <Script
      id="unicorn-studio-embed"
      strategy="afterInteractive"
      nonce={nonce ?? undefined}
      dangerouslySetInnerHTML={{
        __html: `(()=>{const init=()=>{if(window.UnicornStudio?.init&&!window.UnicornStudio.isInitialized){window.UnicornStudio.init();window.UnicornStudio.isInitialized=true;}};if(!window.UnicornStudio||!window.UnicornStudio.init){const s=document.createElement('script');s.src='/vendor/unicornstudio/unicornStudio.umd.js';s.async=true;s.onload=init;(document.head||document.body).appendChild(s);}else{init();}})();`,
      }}
    />
  );
}

export default async function BlogRootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const { t } = await getRequestI18n();
  const copy = getBlogFilterCopy((key, values) => t(`blog.${key}`, values));
  const [posts, categories] = await Promise.all([
    getInitialPosts(PAGE_SIZE),
    getAllCategories(),
  ]);

  return (
    <div className="@container">
      <div className="relative -mt-24 min-h-[65vh] pt-24 md:-mt-28 md:pt-28">
        <div className="absolute inset-0 z-10 mx-auto flex w-full max-w-5xl flex-col items-center justify-center gap-8 px-6 text-center">
          <h1 className="text-balance text-4xl font-regular md:text-6xl">
            {copy.layoutTitleLead}
            <span className="bg-linear-to-b from-foreground/50 to-foreground/95 bg-clip-text text-transparent [-webkit-text-stroke:0.5px_var(--color-foreground)]">
              {" "}
              {copy.layoutTitleHighlight}
            </span>
          </h1>
          <Button asChild size="sm">
            <Link href="/pricing">{copy.explorePricing}</Link>
          </Button>
        </div>
        <div className="relative aspect-[4/5] overflow-hidden md:aspect-16/7">
          <div
            data-us-project="xOgYy1tuCbBlmUyXxM2F"
            data-us-project-src="/backgrounds/nex-onboarding-bg.json"
            data-us-production
            className="size-full"
            style={{ width: "100%", height: "100%" }}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#09090B] via-[#09090B]/85 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-[#09090B] via-[#09090B]/60 to-transparent" />
        </div>

        <Suspense fallback={null}>
          <BlogUnicornScript />
        </Suspense>
      </div>

      <div className="mt-12">
        <BlogFilter categories={categories} posts={posts} />
        {children}
      </div>
    </div>
  );
}
