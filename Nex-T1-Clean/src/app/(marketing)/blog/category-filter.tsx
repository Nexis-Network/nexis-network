'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Rss } from "lucide-react";

import { BlogCommandDialog } from "@/components/landing/blog-command";
import { useTranslations } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getBlogFilterCopy } from "@/modules/blog/i18n";
import type { Post } from "@/types/post";

export type Category = {
  slug: string;
  title: string;
};

export type BlogFilterProps = {
  categories: Category[];
  posts: Post[];
};

export const BlogFilter = ({ categories, posts }: BlogFilterProps) => {
  const t = useTranslations("blog");
  const copy = getBlogFilterCopy(t);
  const pathname = usePathname() ?? "";
  const router = useRouter();

  const activeCategory = pathname === "/blog"
    ? "all"
    : pathname.startsWith("/blog/category/")
      ? pathname.replace("/blog/category/", "").split("/")[0] || "all"
      : "all";

  const handleClick = (slug: string) => {
    if (slug === "all") router.push("/blog");
    else router.push(`/blog/category/${slug}`);
  };

  return (
    <div className="mx-auto my-8 max-w-5xl md:px-6">
      <div className="flex items-center justify-between gap-4">
        <div
          className="-ml-0.5 flex snap-x snap-mandatory overflow-x-auto py-3 max-md:pl-6 flex-nowrap"
          role="tablist"
          aria-label={copy.categoriesLabel}
        >
          <FilterButton
            key="all"
            category={{ slug: "all", title: copy.allCategories }}
            activeCategory={activeCategory}
            handleClick={handleClick}
          />

          {categories.map((category) => (
            <FilterButton
              key={category.slug}
              category={category}
              activeCategory={activeCategory}
              handleClick={handleClick}
            />
          ))}
        </div>

        <div className="flex gap-1 max-md:pr-3">
          <BlogCommandDialog categories={categories} posts={posts} />
          <Button
            size="sm"
            variant="ghost"
            aria-label={copy.rssFeed}
          >
            <Link href="/rss.xml">
              <Rss />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

const FilterButton = ({ category, activeCategory, handleClick }: { category: Category; activeCategory: string; handleClick: (slug: string) => void }) => {
  const isActive = activeCategory === category.slug;

  return (
    <button
      onClick={() => handleClick(category.slug)}
      role="tab"
      aria-selected={isActive}
      className="group snap-center px-1 disabled:pointer-events-none disabled:opacity-50"
    >
      <span
        className={cn(
          "flex w-fit items-center gap-2 rounded-full border border-transparent px-4 py-1 text-sm font-medium text-white/60 transition-colors whitespace-nowrap",
          "hover:border-sky-400/20 hover:bg-sky-400/10 hover:text-sky-400",
          isActive && "border-sky-400/20 bg-sky-400/10 text-sky-400 shadow-sm"
        )}
      >
        <span className="capitalize">{category.title}</span>
      </span>
    </button>
  );
};
