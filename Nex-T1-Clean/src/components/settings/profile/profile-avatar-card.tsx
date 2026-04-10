"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Loader2, Upload } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useSupabaseAuth } from "@/components/providers/supabase-auth-provider";
import {
  propagateAvatarUpdate,
  resetAvatarInput,
} from "@/components/settings/profile/profile-avatar-card.actions";
import { SettingsPanel } from "@/components/settings-v2/primitives/panel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/settings/shared/settings-button";
import { Input } from "@/components/ui/input";
import type { Identity } from "@/lib/user/profile";
import { logger } from "@/lib/logger";

type ProfileAvatarCardProps = {
  identity?: Identity;
  isLoading?: boolean;
};

const MAX_FILE_SIZE_BYTES = 1.5 * 1024 * 1024;

export function ProfileAvatarCard({
  identity,
  isLoading,
}: ProfileAvatarCardProps) {
  const { supabase, user: supabaseUser } = useSupabaseAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    identity?.avatarUrl ?? null,
  );

  useEffect(() => {
    setPreviewUrl(identity?.avatarUrl ?? null);
  }, [identity?.avatarUrl]);

  const updateAvatar = useMutation({
    mutationFn: async (file: File) => {
      if (!supabase) {
        throw new Error("Supabase is not configured");
      }

      const bucket =
        process.env.NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET ?? "avatars";
      const userIdentifier =
        supabaseUser?.id ?? identity?.userId ?? "anonymous";
      const extension = file.type.includes("png")
        ? "png"
        : file.type.includes("jpeg")
          ? "jpg"
          : "webp";
      const path = `user-${userIdentifier}/${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);
      const publicUrl = publicUrlData?.publicUrl;

      if (!publicUrl) {
        throw new Error("Unable to resolve avatar URL");
      }

      await propagateAvatarUpdate(supabase, identity, publicUrl);
      return publicUrl;
    },
    onSuccess: (url) => {
      setPreviewUrl(url);
      queryClient.invalidateQueries({ queryKey: ["profile-aggregate"] });
      toast.success("Profile image updated");
    },
    onError: (error: UntypedJson) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update avatar",
      );
    },
  });

  const removeAvatar = useMutation({
    mutationFn: async () => {
      await propagateAvatarUpdate(supabase, identity, null);
    },
    onSuccess: () => {
      setPreviewUrl(null);
      queryClient.invalidateQueries({ queryKey: ["profile-aggregate"] });
      toast.success("Profile image removed");
    },
    onError: (error: UntypedJson) => {
      toast.error(
        error instanceof Error ? error.message : "Unable to remove image",
      );
    },
  });

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      resetAvatarInput(fileInputRef);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error("Image must be 1.5MB or smaller.");
      resetAvatarInput(fileInputRef);
      return;
    }

    try {
      setPreviewUrl(URL.createObjectURL(file));
      await updateAvatar.mutateAsync(file);
    } catch (error) {
      logger.error("avatar upload failed", error);
      toast.error("Failed to update profile image.");
      setPreviewUrl(identity?.avatarUrl ?? null);
    } finally {
      resetAvatarInput(fileInputRef);
    }
  };

  const initials = identity?.displayName?.[0] ?? identity?.email?.[0] ?? "?";
  const isBusy = updateAvatar.isPending || removeAvatar.isPending;
  const displayName =
    identity?.displayName ?? identity?.username ?? identity?.email ?? "Profile";

  return (
    <SettingsPanel
      title="Profile photo"
      description="Upload a square image up to 1.5MB. Your branded generated avatar stays in place until a photo is uploaded."
      className="h-full"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 border border-[var(--settings-border)]">
            {previewUrl ? (
              <AvatarImage
                src={previewUrl}
                alt={identity?.displayName ?? "Profile avatar"}
              />
            ) : (
              <AvatarFallback className="text-lg font-medium">
                {initials.toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>

          <div className="space-y-1">
            <p className="text-sm font-medium text-[var(--settings-foreground-strong)]">
              {displayName}
            </p>
            <p className="text-sm text-[var(--settings-foreground-muted)]">
              {previewUrl ? "Current photo in use" : "No photo uploaded yet"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 lg:ml-auto">
          <Button
            type="button"
            size="sm"
            disabled={isLoading || isBusy}
            onClick={() => fileInputRef.current?.click()}
          >
            {isBusy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Upload photo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoading || isBusy || !previewUrl}
            onClick={() => removeAvatar.mutate()}
          >
            Remove
          </Button>
        </div>

        <Input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </SettingsPanel>
  );
}
