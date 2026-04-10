"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/settings/shared/settings-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFollowMutation, useSocialFollows } from "@/lib/hooks/social/use-social-follows";

import { BentoCard } from "../shared/bento-card";

type SocialFollowsPanelProps = {
  userId: string;
};

export function SocialFollowsPanel({ userId }: SocialFollowsPanelProps) {
  const { data, isLoading } = useSocialFollows(userId, 40);
  const followMutation = useFollowMutation();

  const onToggleFollow = async (targetUserId: string, currentlyFollowing: boolean) => {
    try {
      await followMutation.mutateAsync({
        targetUserId,
        follow: !currentlyFollowing,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update follow status");
    }
  };

  return (
    <BentoCard>
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-[var(--bento-text-primary)]">Network</h3>
        <p className="text-xs text-[var(--bento-text-muted)]">
          See who follows you and who you follow.
        </p>
      </div>

      <Tabs defaultValue="followers" className="mt-3">
        <TabsList className="w-full">
          <TabsTrigger value="followers" className="flex-1">
            Followers ({data?.followers.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="following" className="flex-1">
            Following ({data?.following.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="followers" className="mt-3 space-y-2">
          {isLoading ? (
            <LoadingState />
          ) : data?.followers.length ? (
            data.followers.map((profile) => (
              <FollowRow
                key={`follower-${profile.id}`}
                name={profile.displayName || profile.username || "User"}
                userId={profile.id}
                username={profile.username}
                avatarUrl={profile.avatarUrl}
                following={profile.viewerIsFollowing}
                onToggleFollow={() => onToggleFollow(profile.id, profile.viewerIsFollowing)}
                disabled={followMutation.isPending}
              />
            ))
          ) : (
            <EmptyState message="No followers yet." />
          )}
        </TabsContent>

        <TabsContent value="following" className="mt-3 space-y-2">
          {isLoading ? (
            <LoadingState />
          ) : data?.following.length ? (
            data.following.map((profile) => (
              <FollowRow
                key={`following-${profile.id}`}
                name={profile.displayName || profile.username || "User"}
                userId={profile.id}
                username={profile.username}
                avatarUrl={profile.avatarUrl}
                following={profile.viewerIsFollowing}
                onToggleFollow={() => onToggleFollow(profile.id, profile.viewerIsFollowing)}
                disabled={followMutation.isPending}
              />
            ))
          ) : (
            <EmptyState message="Not following anyone yet." />
          )}
        </TabsContent>
      </Tabs>
    </BentoCard>
  );
}

function FollowRow({
  name,
  userId,
  username,
  avatarUrl,
  following,
  onToggleFollow,
  disabled,
}: {
  name: string;
  userId: string;
  username: string | null;
  avatarUrl: string | null;
  following: boolean;
  onToggleFollow: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--bento-border)] bg-[var(--bento-bg)] px-2.5 py-2">
      <Link
        href={`/settings/profile?userId=${encodeURIComponent(userId)}`}
        className="flex min-w-0 items-center gap-2.5 rounded-md p-1 transition-colors hover:bg-white/5"
      >
        <Avatar className="h-8 w-8 border border-[var(--bento-border)]">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
          <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-[var(--bento-text-primary)]">{name}</p>
          <p className="truncate text-[11px] text-[var(--bento-text-muted)]">{username ? `@${username}` : "No username"}</p>
        </div>
      </Link>
      <Button size="sm" variant={following ? "secondary" : "outline"} onClick={onToggleFollow} disabled={disabled}>
        {following ? "Following" : "Follow"}
      </Button>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-dashed border-[var(--bento-border)] px-3 py-4 text-center text-xs text-[var(--bento-text-muted)]">
      {message}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="rounded-md border border-[var(--bento-border)] px-3 py-5 text-center text-xs text-[var(--bento-text-muted)]">
      <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" />
      Loading...
    </div>
  );
}
