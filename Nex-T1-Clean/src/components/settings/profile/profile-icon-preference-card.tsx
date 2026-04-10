"use client";

import { Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useSupabaseAuth } from "@/components/providers/supabase-auth-provider";
import { SettingsPanel } from "@/components/settings-v2/primitives/panel";
import {
  DynamicAvatar,
  type IconPreference,
} from "@/components/ui/dynamic-avatar";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { logger } from "@/lib/logger";
import type { Identity } from "@/lib/user/profile";
import {
  resolveIconPreferenceFromMetadata,
  resolveUserAvatarSeed,
} from "@/lib/user/avatar-preferences";
import { cn } from "@/lib/utils";

type ProfileIconPreferenceCardProps = {
  identity?: Identity;
  isLoading?: boolean;
};

type IconOption = {
  id: string;
  title: string;
  description: string;
  type: IconPreference;
};

const ICON_OPTIONS: IconOption[] = [
  {
    id: "icon-polycon",
    title: "Polycon",
    description:
      "Geometric identity icon with a cleaner, structured silhouette.",
    type: "polycon",
  },
  {
    id: "icon-jazzicon",
    title: "Jazzicon",
    description: "Abstract circular identicon based on your account seed.",
    type: "jazzicon",
  },
  {
    id: "icon-blockies",
    title: "Blockies",
    description:
      "Pixel-based identicon for a more technical, wallet-style look.",
    type: "blockies",
  },
];

export function ProfileIconPreferenceCard({
  identity,
  isLoading,
}: ProfileIconPreferenceCardProps) {
  const { supabase } = useSupabaseAuth();
  const queryClient = useQueryClient();
  const currentPreference = resolveIconPreferenceFromMetadata(
    identity?.metadata,
  );
  const seed = resolveUserAvatarSeed(identity, "default-user");
  const currentOption = ICON_OPTIONS.find(
    (option) => option.type === currentPreference,
  );

  const updatePreference = useMutation({
    mutationFn: async (nextPreference: IconPreference) => {
      if (!supabase) {
        throw new Error("Supabase is not configured");
      }

      const existingMetadata =
        identity?.metadata &&
        typeof identity.metadata === "object" &&
        !Array.isArray(identity.metadata)
          ? identity.metadata
          : {};

      const nextMetadata = {
        ...existingMetadata,
        iconPreference: nextPreference,
      };

      const { error } = await supabase.auth.updateUser({
        data: {
          profile: nextMetadata,
        },
      });

      if (error) {
        throw error;
      }

      const profileResponse = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ metadata: nextMetadata }),
      });

      if (!profileResponse.ok) {
        const body = await profileResponse.json().catch(() => null);
        const detail =
          body?.error ?? body?.message ?? `HTTP ${profileResponse.status}`;
        logger.warn("Icon preference PATCH failed", {
          status: profileResponse.status,
          detail,
        });
        throw new Error(`Failed to save icon preference: ${detail}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile-aggregate"] });
      toast.success("Icon style updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update icon style");
    },
  });

  const isBusy = updatePreference.isPending || isLoading;

  return (
    <SettingsPanel
      title="Icon style"
      description="Choose the generated identity icon used across your account and wallets."
      className="h-full"
    >
      {isBusy ? (
        <div className="flex h-[240px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--settings-foreground-muted)]" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[140px_minmax(0,1fr)]">
          <div className="space-y-3">
            <div className="flex justify-center rounded-lg border border-[var(--settings-border)] px-4 py-5">
              <DynamicAvatar
                address={seed}
                size={72}
                type={currentPreference}
                className="h-[72px] w-[72px]"
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-[var(--settings-foreground-strong)]">
                Current style
              </p>
              <p className="text-sm text-[var(--settings-foreground-muted)]">
                {currentOption?.title ?? "Generated icon"}
              </p>
            </div>
          </div>

          <RadioGroup
            value={currentPreference}
            onValueChange={(value) =>
              updatePreference.mutate(value as IconPreference)
            }
            className="space-y-3"
            disabled={isBusy}
          >
            {ICON_OPTIONS.map((option) => {
              const selected = currentPreference === option.type;

              return (
                <Label
                  key={option.id}
                  htmlFor={option.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-4 rounded-lg border px-4 py-3",
                    selected
                      ? "border-[var(--settings-foreground-strong)] bg-[var(--settings-elevated)]"
                      : "border-[var(--settings-border)] hover:bg-[var(--settings-elevated)]",
                  )}
                >
                  <DynamicAvatar
                    address={seed}
                    size={44}
                    type={option.type}
                    className="h-11 w-11 shrink-0"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-[var(--settings-foreground-strong)]">
                        {option.title}
                      </span>
                      <RadioGroupItem
                        value={option.type}
                        id={option.id}
                        className="border-[var(--settings-border)] text-[var(--settings-foreground-strong)]"
                      />
                    </div>
                    <p className="text-sm text-[var(--settings-foreground-muted)]">
                      {option.description}
                    </p>
                  </div>
                </Label>
              );
            })}
          </RadioGroup>
        </div>
      )}
    </SettingsPanel>
  );
}
