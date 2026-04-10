"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { SocialFollowsPanel } from "@/components/settings/social/social-follows-panel";
import { SocialMessagesPanel } from "@/components/settings/social/social-messages-panel";
import { SocialPostCard } from "@/components/settings/social/social-post-card";
import { SocialPostComposer } from "@/components/settings/social/social-post-composer";
import { SocialPostFeed } from "@/components/settings/social/social-post-feed";
import { SocialPostKindTabs } from "@/components/settings/social/social-post-kind-tabs";
import { SocialProfileHero } from "@/components/settings/social/social-profile-hero";
import { SocialConnectionsCard } from "@/components/settings/social/social-connections-card";
import { SocialWalletAccountsCard } from "@/components/settings/social/social-wallet-accounts-card";
import { SocialWalletSummaryCard } from "@/components/settings/social/social-wallet-summary-card";
import {
  SettingsMainColumn,
  SettingsPage,
  SettingsPageBody,
  SettingsPageHeader,
  SettingsSection,
  SettingsSideColumn,
} from "@/components/settings-v2/primitives/page";
import { Button } from "@/components/settings/shared/settings-button";
import { useProfileAggregate } from "@/hooks/user/use-profile-aggregate";
import { useInfiniteSocialPosts, useSocialPost } from "@/lib/hooks/social/use-social-posts";
import { useSocialProfile } from "@/lib/hooks/social/use-social-profile";
import type { SocialPostKind } from "@/lib/social/types";

const TAB_TO_KIND: Record<string, SocialPostKind | "all"> = {
  all: "all",
  post: "post",
  prompt_template: "prompt_template",
  skill_template: "skill_template",
};

type SocialProfilePageProps = {
  viewedUserId?: string;
  focusPostId?: string;
  focusCommentId?: string;
};

export function SocialProfilePage({
  viewedUserId,
  focusPostId,
  focusCommentId,
}: SocialProfilePageProps) {
  const [activeTab, setActiveTab] = useState<SocialPostKind | "all" | "bookmarks" | "shared">("all");
  const viewingExplicitUser = Boolean(viewedUserId);

  const { data: profile, isLoading: profileLoading } = useSocialProfile(viewedUserId);
  const { data: focusedPost, isLoading: focusedPostLoading } = useSocialPost(focusPostId);
  const isOwnProfile = profile?.viewer.isOwnProfile ?? !viewingExplicitUser;
  const postUserId = viewedUserId ?? profile?.id;
  const shouldLoadOwnerAggregate = !viewingExplicitUser || profile?.viewer.isOwnProfile === true;
  const { data: ownerProfileAggregate, isLoading: ownerProfileLoading } =
    useProfileAggregate({
      enabled: shouldLoadOwnerAggregate,
    });

  useEffect(() => {
    if (!isOwnProfile && activeTab === "bookmarks") {
      setActiveTab("all");
    }
  }, [activeTab, isOwnProfile]);

  const postScope =
    activeTab === "bookmarks"
      ? "bookmarks"
      : activeTab === "shared"
        ? "shared"
        : viewingExplicitUser || !isOwnProfile
          ? "user"
          : "me";
  const postKind =
    activeTab === "bookmarks" || activeTab === "shared" ? "all" : TAB_TO_KIND[activeTab] ?? "all";

  const {
    posts,
    isLoading: postsLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteSocialPosts({
    scope: postScope,
    kind: postKind,
    userId:
      postScope === "user" || postScope === "shared"
        ? postUserId
        : undefined,
    limit: 20,
  });

  const emptyCopy = useMemo(() => {
    if (activeTab === "bookmarks") {
      return {
        title: "No bookmarks yet",
        description: "Save posts from Explore and they will appear here.",
      };
    }
    if (activeTab === "shared") {
      return {
        title: "No shared posts yet",
        description: isOwnProfile
          ? "Share posts from Explore and they will appear here."
          : "This user has not shared any posts yet.",
      };
    }
    if (activeTab === "prompt_template") {
      return {
        title: "No prompt templates yet",
        description: "Publish your best prompts so others can reuse them.",
      };
    }
    if (activeTab === "skill_template") {
      return {
        title: "No skill.md templates yet",
        description: "Share skill.md files for your automation workflows.",
      };
    }
    return {
      title: isOwnProfile ? "No posts yet" : "No posts yet",
      description: isOwnProfile
        ? "Create your first post to start building your profile."
        : "This user has not published posts yet.",
    };
  }, [activeTab, isOwnProfile]);

  if (profileLoading || !profile) {
    return (
      <SettingsPage>
        <SettingsPageHeader title="Profile" />
        <div className="rounded-lg border border-[var(--bento-border)] bg-[var(--bento-card)] p-6 text-sm text-[var(--bento-text-muted)]">
          Loading profile...
        </div>
      </SettingsPage>
    );
  }

  return (
    <SettingsPage>
      <SettingsPageHeader
        title="Profile"
        description={
          isOwnProfile
            ? "Manage your public profile, posts, prompts, skills, followers, and bookmarks."
            : "View this user's profile, posts, prompts, skills, and network."
        }
        action={
          <div className="flex flex-wrap gap-2">
            {!isOwnProfile ? (
              <Button asChild variant="outline" className="settings-surface-button rounded-[10px]">
                <Link href="/settings/profile">Back to my profile</Link>
              </Button>
            ) : null}
            <Button asChild variant="outline" className="settings-surface-button rounded-[10px]">
              <Link href="/settings/explore">Explore</Link>
            </Button>
            <Button asChild variant="outline" className="settings-surface-button rounded-[10px]">
              <Link href="/settings/notifications">Notifications</Link>
            </Button>
          </div>
        }
      />

      <SettingsPageBody>
        <SettingsMainColumn className="space-y-4">
          <SocialProfileHero profile={profile} />

          {isOwnProfile ? <SocialPostComposer /> : null}

          {focusPostId ? (
            <SettingsSection
              tone="ledger"
              title="Notification target"
              description="Jumped here from a notification. This is the exact post target."
            >
              {focusedPostLoading ? (
                <div className="px-5 py-8 text-xs text-[var(--settings-foreground-muted)]">
                  Loading post...
                </div>
              ) : focusedPost ? (
                <SocialPostCard
                  post={focusedPost}
                  showAuthor={true}
                  initialCommentsOpen={Boolean(focusCommentId)}
                  highlightCommentId={focusCommentId ?? null}
                />
              ) : (
                <div className="px-5 py-8 text-xs text-[var(--settings-foreground-muted)]">
                  This post is no longer available.
                </div>
              )}
            </SettingsSection>
          ) : null}

          <SettingsSection tone="ledger">
            <SocialPostKindTabs
              value={activeTab}
              onValueChange={setActiveTab}
              includeBookmarks={isOwnProfile}
              includeShared={true}
            />
            <SocialPostFeed
              posts={posts}
              isLoading={postsLoading}
              emptyTitle={emptyCopy.title}
              emptyDescription={emptyCopy.description}
              showAuthor={true}
              focusPostId={focusPostId}
              focusCommentId={focusCommentId}
              autoScrollToFocus={Boolean(focusPostId)}
              hasMore={Boolean(hasNextPage)}
              onLoadMore={() => {
                void fetchNextPage();
              }}
              isLoadingMore={isFetchingNextPage}
            />
          </SettingsSection>
        </SettingsMainColumn>

        <SettingsSideColumn className="space-y-4">
          <SocialFollowsPanel userId={profile.id} />
          {isOwnProfile ? <SocialMessagesPanel /> : null}
          {isOwnProfile ? (
            <SocialWalletSummaryCard
              profile={ownerProfileAggregate}
              isLoading={ownerProfileLoading}
            />
          ) : null}
          {isOwnProfile ? (
            <SocialWalletAccountsCard
              profile={ownerProfileAggregate}
              isLoading={ownerProfileLoading}
            />
          ) : null}
          {isOwnProfile ? (
            <SocialConnectionsCard
              profile={ownerProfileAggregate}
              isLoading={ownerProfileLoading}
            />
          ) : null}
        </SettingsSideColumn>
      </SettingsPageBody>
    </SettingsPage>
  );
}
