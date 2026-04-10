"use client";

import { useMemo, useState } from "react";

import { SocialPostFeed } from "@/components/settings/social/social-post-feed";
import { BentoCard } from "@/components/settings/shared/bento-card";
import { SettingsPage, SettingsPageHeader } from "@/components/settings-v2/primitives/page";
import { useInfiniteSocialPosts } from "@/lib/hooks/social/use-social-posts";
import type { SocialPostKind } from "@/lib/social/types";

const TABS = [
  { value: "all", label: "All" },
  { value: "following", label: "Following" },
  { value: "post", label: "Posts" },
  { value: "prompt_template", label: "Prompts" },
  { value: "skill_template", label: "Skill.md" },
] as const;

type ExploreTab = (typeof TABS)[number]["value"];

export function SocialExplorePage() {
  const [activeTab, setActiveTab] = useState<ExploreTab>("all");

  const scope = activeTab === "following" ? "following" : "explore";
  const kind: SocialPostKind | "all" =
    activeTab === "following" || activeTab === "all" ? "all" : activeTab;

  const {
    posts,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteSocialPosts({
    scope,
    kind,
    limit: 20,
  });

  const emptyCopy = useMemo(() => {
    if (activeTab === "following") {
      return {
        title: "No posts from people you follow",
        description: "Follow creators in this feed to see their latest updates here.",
      };
    }
    if (activeTab === "prompt_template") {
      return {
        title: "No prompt templates found",
        description: "Check back soon for new prompt templates from other users.",
      };
    }
    if (activeTab === "skill_template") {
      return {
        title: "No skill.md templates found",
        description: "Check back soon for new skill.md templates from other users.",
      };
    }
    return {
      title: "No posts found",
      description: "No social posts are available right now.",
    };
  }, [activeTab]);

  return (
    <SettingsPage>
      <SettingsPageHeader
        title="Explore"
        description="Discover posts, prompt templates, and skill.md templates from other users."
      />

      <BentoCard className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={`h-8 cursor-pointer rounded-md border px-3 text-xs transition-colors ${
                activeTab === tab.value
                  ? "border-white/25 bg-white/10 text-[var(--bento-text-primary)]"
                  : "border-[var(--bento-border)] text-[var(--bento-text-muted)] hover:border-white/20 hover:text-[var(--bento-text-primary)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <SocialPostFeed
          posts={posts}
          isLoading={isLoading}
          emptyTitle={emptyCopy.title}
          emptyDescription={emptyCopy.description}
          showAuthor={true}
          hasMore={Boolean(hasNextPage)}
          onLoadMore={() => {
            void fetchNextPage();
          }}
          isLoadingMore={isFetchingNextPage}
        />
      </BentoCard>
    </SettingsPage>
  );
}
