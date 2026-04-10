"use client";

import type { ChangeEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/settings/shared/settings-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSupabaseAuth } from "@/components/providers/supabase-auth-provider";
import { useFollowMutation } from "@/lib/hooks/social/use-social-follows";
import { useUpdateSocialProfile } from "@/lib/hooks/social/use-social-profile";
import type { SocialProfile } from "@/lib/social/types";

type SocialProfileHeroProps = {
  profile: SocialProfile;
};

const MAX_BANNER_SIZE_BYTES = 2 * 1024 * 1024;

export function SocialProfileHero({ profile }: SocialProfileHeroProps) {
  const { supabase, user } = useSupabaseAuth();
  const [bioDraft, setBioDraft] = useState(profile.bio ?? "");
  const [bannerPreview, setBannerPreview] = useState(profile.bannerUrl ?? null);

  const uploadRef = useRef<HTMLInputElement | null>(null);
  const updateProfile = useUpdateSocialProfile();
  const followMutation = useFollowMutation();

  const isOwn = profile.viewer.isOwnProfile;

  useEffect(() => {
    setBioDraft(profile.bio ?? "");
  }, [profile.bio]);

  useEffect(() => {
    setBannerPreview(profile.bannerUrl ?? null);
  }, [profile.bannerUrl]);

  const saveBio = async () => {
    try {
      await updateProfile.mutateAsync({ bio: bioDraft.trim() || null });
      toast.success("Profile description updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update profile");
    }
  };

  const onFollowToggle = async () => {
    try {
      await followMutation.mutateAsync({
        targetUserId: profile.id,
        follow: !profile.viewer.isFollowing,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update follow status");
    }
  };

  const onBannerChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!supabase || !user?.id) {
      toast.error("Supabase is not configured");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > MAX_BANNER_SIZE_BYTES) {
      toast.error("Banner image must be 2MB or smaller");
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setBannerPreview(localPreview);

    try {
      const bucket = process.env.NEXT_PUBLIC_SUPABASE_BANNER_BUCKET ?? "profile-banners";
      const extension = file.type.includes("png") ? "png" : file.type.includes("jpeg") ? "jpg" : "webp";
      const path = `user-${user.id}/${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
        upsert: true,
        contentType: file.type,
        cacheControl: "3600",
      });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      const bannerUrl = data?.publicUrl;
      if (!bannerUrl) {
        throw new Error("Failed to resolve uploaded banner URL");
      }

      await updateProfile.mutateAsync({ bannerUrl });
      toast.success("Banner updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to upload banner");
      setBannerPreview(profile.bannerUrl ?? null);
    } finally {
      if (uploadRef.current) {
        uploadRef.current.value = "";
      }
      URL.revokeObjectURL(localPreview);
    }
  };

  const removeBanner = async () => {
    try {
      await updateProfile.mutateAsync({ bannerUrl: null });
      setBannerPreview(null);
      toast.success("Banner removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to remove banner");
    }
  };

  const displayName = profile.displayName || profile.username || "User";

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--bento-border)] bg-[var(--bento-card)]">
      <div
        className="relative h-44 w-full border-b border-[var(--bento-border)] bg-[#1c1c1d]"
        style={
          bannerPreview
            ? {
                backgroundImage: `url(${bannerPreview})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        {bannerPreview ? <div className="absolute inset-0 bg-[rgba(15,15,16,0.28)]" /> : null}
        {isOwn ? (
          <div className="absolute right-3 top-3 flex items-center gap-2">
            <Input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={onBannerChange} />
            <Button type="button" size="sm" tone="surface" className="h-8 gap-1" onClick={() => uploadRef.current?.click()}>
              {updateProfile.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              Edit banner
            </Button>
            {bannerPreview ? (
              <Button type="button" size="icon" tone="surface" className="h-8 w-8" onClick={removeBanner}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="-mt-10 px-4 pb-4 pt-0 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex min-w-0 items-end gap-3">
            <Avatar className="h-20 w-20 border-4 border-[var(--bento-card)] bg-[var(--bento-bg)]">
              {profile.avatarUrl ? <AvatarImage src={profile.avatarUrl} alt={displayName} /> : null}
              <AvatarFallback>{displayName.slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="pb-1">
              <h1 className="truncate text-xl font-semibold text-[var(--bento-text-primary)]">{displayName}</h1>
              <p className="text-sm text-[var(--bento-text-muted)]">
                {profile.username ? `@${profile.username}` : "No username"}
              </p>
            </div>
          </div>

          {isOwn ? null : (
            <Button
              type="button"
              tone={profile.viewer.isFollowing ? "secondary" : "primary"}
              onClick={onFollowToggle}
              disabled={followMutation.isPending}
            >
              {followMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {profile.viewer.isFollowing ? "Following" : "Follow"}
            </Button>
          )}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Metric label="Posts" value={profile.stats.posts} />
          <Metric label="Prompts" value={profile.stats.prompts} />
          <Metric label="Skills" value={profile.stats.skills} />
          <Metric label="Followers" value={profile.stats.followers} />
          <Metric label="Following" value={profile.stats.following} />
          <Metric label="Bookmarks" value={profile.stats.bookmarks} />
        </div>

        <div className="mt-4 space-y-2">
          <label htmlFor="social-profile-bio" className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--bento-text-muted)]">
            Profile description
          </label>
          <Textarea
            id="social-profile-bio"
            value={bioDraft}
            onChange={(event) => setBioDraft(event.target.value)}
            className="min-h-[96px]"
            maxLength={280}
            disabled={!isOwn || updateProfile.isPending}
            placeholder="Describe what you build, trade, or share."
          />
          <div className="flex items-center justify-between text-[11px] text-[var(--bento-text-muted)]">
            <span>{bioDraft.length}/280</span>
            {isOwn ? (
              <Button type="button" size="sm" tone="primary" onClick={saveBio} disabled={updateProfile.isPending}>
                {updateProfile.isPending ? "Saving..." : "Save profile"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[10px] border border-[var(--bento-border)] bg-[var(--bento-bg)] px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--bento-text-muted)]">{label}</p>
      <p className="font-mono text-base text-[var(--bento-text-primary)]">{value.toLocaleString("en-US")}</p>
    </div>
  );
}
