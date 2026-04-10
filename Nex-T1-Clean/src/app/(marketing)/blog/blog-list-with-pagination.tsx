'use client';

import { useState, useTransition } from "react";

import { BlogPostGrid } from "@/app/(marketing)/blog/blog-post-grid";
import { useTranslations } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import type { Post } from "@/types/post";

interface BlogListWithPaginationProps {
  initialPosts: Post[];
  totalCount: number;
  loadMoreAction: (offset: number) => Promise<Post[]>;
}

export function BlogListWithPagination({
  initialPosts,
  totalCount,
  loadMoreAction,
}: BlogListWithPaginationProps) {
  const t = useTranslations("blog");
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [isPending, startTransition] = useTransition();
  const hasMore = posts.length < totalCount;

  const loadMore = () => {
    startTransition(async () => {
      const newPosts = await loadMoreAction(posts.length);
      setPosts((prev) => [...prev, ...newPosts]);
    });
  };

  return (
    <>
      <BlogPostGrid posts={posts} />
      {hasMore ? (
        <div className="mx-auto mt-12 max-w-5xl px-6 text-center">
          <Button onClick={loadMore} disabled={isPending} variant="outline" size="lg">
            {isPending ? t("loading") : t("loadMore")}
          </Button>
        </div>
      ) : null}
    </>
  );
}
