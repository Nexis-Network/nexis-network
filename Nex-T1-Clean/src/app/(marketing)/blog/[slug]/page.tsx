import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PortableText } from "@portabletext/react";

import { portableTextComponents } from "@/components/landing/content-components";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { formatDate } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import { extractHeadings } from "@/lib/extract-headings";
import { getRequestI18n } from "@/i18n/server";
import { getAllPostSlugs, getPostBySlug } from "@/modules/blog/actions";
import { BLOG_POSTS } from "@/modules/blog/data/posts";
import { getBlogMetadataCopy } from "@/modules/blog/i18n";
import { getLocalBlogImage } from "@/modules/blog/local-image";

export async function generateStaticParams() {
  try {
    const slugs = await getAllPostSlugs();
    if (slugs.length > 0) {
      return slugs;
    }
  } catch {
    // Fall back to local seed content when CMS metadata is unavailable.
  }

  return [
    {
      slug: BLOG_POSTS[0]?.slug ?? "voice-mode-hands-free-defi",
    },
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { t } = await getRequestI18n();
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return { title: t("blog.meta.postNotFound") };
  }

  const heroImage = getLocalBlogImage(slug, post.image);
  const pageTitle = `${post.title} | ${t("blog.meta.blogSuffix")}`;
  const copy = getBlogMetadataCopy((key, values) => t(`blog.${key}`, values));

  return {
    title: pageTitle,
    description: post.description,
    openGraph: {
      title: pageTitle,
      description: post.description,
      images: [
        {
          url: heroImage,
          width: 1200,
          height: 675,
          alt: copy.postSocialAlt(post.title),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: post.description,
      images: [
        {
          url: heroImage,
          width: 1200,
          height: 675,
          alt: copy.postSocialAlt(post.title),
        },
      ],
    },
    alternates: {
      canonical: `/blog/${slug}`,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { locale, t } = await getRequestI18n();
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const heroImage = getLocalBlogImage(slug, post.image);
  const body = Array.isArray(post.body) ? post.body : [];
  const authors = Array.isArray(post.authors) ? post.authors : [];
  const category = post.category ?? { title: t("blog.uncategorized"), slug: "uncategorized" };
  const headings = extractHeadings(body);

  return (
    <div className="relative mx-auto w-full max-w-6xl px-6 pb-24 pt-32 md:px-8">
      <Breadcrumb>
        <BreadcrumbList className="text-sm text-white/60">
          <BreadcrumbItem>
            <BreadcrumbLink href="/blog" className="transition hover:text-sky-400">
              {t("blog.breadcrumbBlog")}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/blog/category/${category.slug}`} className="transition hover:text-sky-400">
              {category.title}
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <article className="mt-10 text-[#F4F4F4]">
        <header className="mb-12 max-w-3xl">
          <h1 className="text-balance text-4xl font-regular md:text-5xl md:leading-tight">
            {post.title}
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-white/60">
            {post.description}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-sm text-white/55">
            <div className="flex flex-wrap items-center gap-4">
              {authors.map((author) => (
                <div key={`${post.slug}-${author.name}`} className="grid grid-cols-[auto_1fr] items-center gap-2">
                  <div className="ring-border-illustration bg-card aspect-square size-10 overflow-hidden rounded-md border border-white/40 shadow-md shadow-black/15 ring-1">
                    <Image src={author.image} alt={author.name} width={120} height={120} className="size-full object-cover" />
                  </div>
                  <span className="text-sm text-white/75">{author.name}</span>
                </div>
              ))}
            </div>
            <time className="text-sm text-white/45" dateTime={new Date(post.publishedAt).toISOString()}>
              {formatDate(post.publishedAt, locale)}
            </time>
          </div>
        </header>

        <div className="flex flex-col gap-12 lg:flex-row">
          <div className="order-last ml-auto hidden max-w-xs lg:block">
            {headings.length > 0 && (
              <nav className="sticky top-24 w-56">
                <h4 className="mb-4 text-sm font-regular text-white">{t("blog.onThisPage")}</h4>
                <ul className="space-y-3 text-sm text-white/55">
                  {headings.map((heading) => (
                    <li key={heading.slug}>
                      <a
                        href={`#${heading.slug}`}
                        className={cn(
                          "block transition-colors hover:text-sky-400",
                          heading.level === 3 ? "pl-4" : ""
                        )}
                      >
                        {heading.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </div>

          <div className="max-w-3xl">
            <div className="relative mb-12 overflow-hidden rounded-[28px] border border-white/10 bg-white/5">
              <Image
                src={heroImage}
                alt={post.title}
                width={1440}
                height={900}
                priority
                className="h-full w-full object-cover"
              />
            </div>

            <div className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-white/70 prose-a:text-sky-400">
              <PortableText value={body} components={portableTextComponents} />
            </div>
          </div>
        </div>

        <footer className="mt-16 border-t border-white/10 pt-8 text-sm text-white/55">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/blog" className="transition hover:text-sky-400">
              ← {t("blog.backToBlog")}
            </Link>
            <Link href={`/blog/category/${category.slug}`} className="transition hover:text-sky-400">
              {t("blog.moreIn", { category: category.title })} →
            </Link>
          </div>
        </footer>
      </article>
    </div>
  );
}
