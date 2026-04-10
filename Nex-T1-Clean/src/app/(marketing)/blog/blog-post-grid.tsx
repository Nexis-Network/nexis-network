'use client';

import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { useLocale, useTranslations } from "@/components/providers/locale-provider";
import { formatDate } from "@/lib/format-date";
import { getBlogReadArticleAria } from "@/modules/blog/i18n";
import { getLocalBlogImage } from "@/modules/blog/local-image";
import type { Post } from "@/types/post";

export function BlogPostGrid({ posts }: { posts: Post[] }) {
  const locale = useLocale();
  const t = useTranslations("blog");
  const highlighted = posts.slice(0, 2);
  const moreArticles = posts.slice(2);

  return (
    <div className="mx-auto max-w-5xl px-6">
      <div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:gap-12">
        {highlighted.map((article, index) => {
          const imageSrc = getLocalBlogImage(article.slug, article.image);

          return (
            <div key={`${article.slug}-${index}`} className="group relative">
              <article className="space-y-6 rounded-xl">
                <div className="rounded-xl border border-white/20 bg-[#f4f4f4]/10 p-0.5 shadow-md backbackdrop-blur-lg transition hover:bg-[#f4f4f4]/15">
                  <div className="before:border-white/10 relative aspect-video overflow-hidden rounded-[10px] before:absolute before:inset-0 before:rounded-[10px] before:border">
                    <Image
                      src={imageSrc}
                      alt={article.title}
                      width={1280}
                      height={720}
                      className="h-full w-full object-cover"
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      priority={index === 0}
                      loading={index < 2 ? "eager" : "lazy"}
                    />
                  </div>
                </div>

                <div className="grid gap-3 p-0.5">
                  <time className="text-muted-foreground text-sm" dateTime={new Date(article.date).toISOString()}>
                    {formatDate(article.date, locale)}
                  </time>
                  <h2 className="text-foreground text-balance text-lg font-regular md:text-xl">
                    <Link href={`/blog/${article.slug}`} className="before:absolute before:inset-0">
                      {article.title}
                    </Link>
                  </h2>
                  <p className="text-muted-foreground">{article.description}</p>
                  <div className="grid grid-cols-[1fr_auto] items-end gap-2 pt-4">
                    <div className="space-y-2">
                      {article.authors.map((author) => (
                        <div key={`${article.slug}-${author.name}`} className="grid grid-cols-[auto_1fr] items-center gap-2">
                          <div className="ring-border-illustration bg-card aspect-square size-6 overflow-hidden rounded-md border border-white/40 shadow-md shadow-black/15 ring-1">
                            <Image src={author.image} alt={author.name} width={160} height={160} className="size-full object-cover" />
                          </div>
                          <span className="text-muted-foreground line-clamp-1 text-sm">{author.name}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex h-6 items-center">
                      <span
                        aria-label={getBlogReadArticleAria(t, article.title)}
                        className="text-primary group-hover:text-foreground flex items-center gap-1 text-sm font-medium transition-colors duration-200"
                      >
                        {t("read")}
                        <ChevronRight strokeWidth={2.5} aria-hidden className="size-3.5 translate-y-px duration-200 group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          );
        })}
      </div>

      {moreArticles.length > 0 && (
        <div className="mt-24">
          <h2 className="text-foreground mb-8 text-2xl font-regular">{t("moreArticles")}</h2>
          <div className="grid gap-6 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-12 lg:grid-cols-3">
            {moreArticles.map((article, index) => {
              const imageSrc = getLocalBlogImage(article.slug, article.image);

              return (
                <article key={`${article.slug}-${index}`} className="group relative space-y-4 duration-200">
                  <div className="rounded-xl border border-white/20 bg-[#f4f4f4]/10 p-0.5 shadow-md backbackdrop-blur-lg transition hover:bg-[#f4f4f4]/15">
                    <div className="before:border-white/10 relative aspect-video overflow-hidden rounded-[10px] before:absolute before:inset-0 before:rounded-[10px] before:border">
                      <Image
                        src={imageSrc}
                        alt={article.title}
                        width={1280}
                        height={720}
                        className="h-full w-full object-cover"
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 40vw, 100vw"
                        loading="lazy"
                      />
                    </div>
                  </div>

                  <time className="text-muted-foreground text-sm" dateTime={new Date(article.date).toISOString()}>
                    {formatDate(article.date, locale)}
                  </time>
                  <h3 className="text-foreground font-regular">
                    <Link href={`/blog/${article.slug}`} className="before:absolute before:inset-0">
                      {article.title}
                    </Link>
                  </h3>
                  <p className="text-muted-foreground">{article.description}</p>
                  <div className="grid grid-cols-[1fr_auto] items-end gap-2 pt-4">
                    <div className="space-y-2">
                      {article.authors.map((author) => (
                        <div key={`${article.slug}-${author.name}`} className="grid grid-cols-[auto_1fr] items-center gap-2">
                          <div className="ring-border-illustration bg-card aspect-square size-6 overflow-hidden rounded-md border border-white/40 shadow-md shadow-black/15 ring-1">
                            <Image src={author.image} alt={author.name} width={160} height={160} className="size-full object-cover" />
                          </div>
                          <span className="text-muted-foreground line-clamp-1 text-sm">{author.name}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex h-6 items-center">
                      <span
                        aria-label={getBlogReadArticleAria(t, article.title)}
                        className="text-primary group-hover:text-foreground flex items-center gap-1 text-sm font-medium transition-colors duration-200"
                      >
                        {t("read")}
                        <ChevronRight strokeWidth={2.5} aria-hidden className="size-3.5 translate-y-px duration-200 group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
