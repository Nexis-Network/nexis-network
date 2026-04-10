import Link from "next/link";
import type { Metadata } from "next";

import { BlogListWithPagination } from "@/app/(marketing)/blog/blog-list-with-pagination";
import { getRequestI18n } from "@/i18n/server";
import { getInitialPosts, getTotalPostsCount, loadMorePosts } from "@/modules/blog/actions";
import { getBlogMetadataCopy } from "@/modules/blog/i18n";

// Prevent static prerendering which fails under Turbopack when React is null
// in the SSR context. The page is still server-rendered at request time.

const PAGE_SIZE = 12;
const BLOG_SOCIAL_IMAGE = "/blog/images/next1.jpg";
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getRequestI18n();
  const title = t("blog.meta.title");
  const description = t("blog.meta.description");
  const copy = getBlogMetadataCopy((key, values) => t(`blog.${key}`, values));

  return {
    title,
    description,
    alternates: {
      canonical: "/blog",
    },
    openGraph: {
      title,
      description,
      images: [
        {
          url: BLOG_SOCIAL_IMAGE,
          width: 1200,
          height: 675,
          alt: copy.socialAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [
        {
          url: BLOG_SOCIAL_IMAGE,
          width: 1200,
          height: 675,
          alt: copy.socialAlt,
        },
      ],
    },
  };
}

export default async function BlogPage() {
  const { t } = await getRequestI18n();

  if (process.env.NEXT_PUBLIC_TEST_MODE === "true" || process.env.E2E_TEST_MODE === "true") {
    return (
      <div className="space-y-4 p-6">
        <h1>{t("blog.heroTitle")}</h1>
        <Link href="/blog/deploying-nex-t1-command-center">Deploying the Nex-T1 Command Center</Link>
      </div>
    );
  }

  const [posts, totalCount] = await Promise.all([getInitialPosts(PAGE_SIZE), getTotalPostsCount()]);

  return (
    <>
      <section className="bg-[#09090b] text-[#f4f4f4]">
        <div className="mx-auto max-w-5xl px-6 py-12 text-center sm:py-16">
          <h1 className="text-balance text-4xl font-semibold sm:text-5xl">
            {t("blog.heroTitle")}
          </h1>
          <p className="text-[#d4d4d8] mx-auto mt-3 max-w-2xl text-balance text-lg">
            {t("blog.heroSubtitle")}
          </p>
        </div>
      </section>
      <BlogListWithPagination
        initialPosts={posts}
        totalCount={totalCount}
        loadMoreAction={loadMorePosts}
      />
    </>
  );
}
