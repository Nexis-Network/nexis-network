"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useSupabaseAuth } from "@/components/providers/supabase-auth-provider";
import { useTranslations } from "@/components/providers/locale-provider";
import type { Identity } from "@/lib/user/profile";
import { cn } from "@/lib/utils";
import { ProfileIdentityFormFields } from "@/components/settings/profile/profile-identity-form-fields";
import { SettingsPanel } from "@/components/settings-v2/primitives/panel";
import { Button } from "@/components/settings/shared/settings-button";
import { Form } from "@/components/ui/form";
import {
  createProfileIdentityFormValues,
  mergeProfileMetadata,
  profileIdentityFormSchema,
  resolveProfileLocales,
  resolveProfileTimeZones,
  type ProfileIdentityFormValues,
} from "@/components/settings/profile/profile-identity-form.schema";
import {
  COUNTRY_COOKIE_NAME,
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
} from "@/i18n/config";

type ProfileIdentityFormProps = {
  identity?: Identity;
  isLoading?: boolean;
};

export function ProfileIdentityForm({
  identity,
  isLoading,
}: ProfileIdentityFormProps) {
  const { supabase } = useSupabaseAuth();
  const queryClient = useQueryClient();
  const profileT = useTranslations("profile");
  const commonT = useTranslations("common");

  const form = useForm<ProfileIdentityFormValues>({
    resolver: zodResolver(profileIdentityFormSchema),
    defaultValues: createProfileIdentityFormValues(identity),
  });

  useEffect(() => {
    form.reset(createProfileIdentityFormValues(identity));
  }, [form, identity]);

  const timeZoneOptions = useMemo(() => resolveProfileTimeZones(), []);
  const localeOptions = useMemo(
    () => resolveProfileLocales(identity?.locale),
    [identity?.locale],
  );

  const updateProfile = useMutation({
    mutationFn: async (values: ProfileIdentityFormValues) => {
      if (!supabase) {
        throw new Error("Supabase is not configured");
      }

      const metadata = mergeProfileMetadata(identity?.metadata ?? null, values);
      const nextUsername = values.username?.trim() || null;
      const currentUsername = identity?.username?.trim() || null;

      if (nextUsername && nextUsername !== currentUsername) {
        const checkRes = await fetch(
          `/api/profile/check-username?username=${encodeURIComponent(nextUsername)}`,
          { credentials: "include" },
        );

        if (checkRes.ok) {
          const checkData = await checkRes.json();

          if (!checkData.available) {
            throw new Error("Username is already taken");
          }
        }
      }

      const { error: userError } = await supabase.auth.updateUser({
        data: { profile: metadata },
      });

      if (userError) {
        throw userError;
      }

      const payload = {
        displayName: values.displayName,
        username: nextUsername,
        locale: values.locale || null,
        timeZone: values.timeZone,
        bio: values.bio ?? null,
        metadata,
      } satisfies Record<string, UntypedJson>;

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to persist profile changes");
      }
    },
    onSuccess: (_data, values) => {
      document.cookie = `${LOCALE_COOKIE_NAME}=${encodeURIComponent(values.locale || DEFAULT_LOCALE)}; path=/; max-age=31536000; samesite=lax`;

      if (values.countryCode) {
        document.cookie = `${COUNTRY_COOKIE_NAME}=${encodeURIComponent(values.countryCode)}; path=/; max-age=31536000; samesite=lax`;
      }

      queryClient.invalidateQueries({ queryKey: ["profile-aggregate"] });
      toast.success(commonT("profileUpdated"));
    },
    onError: (error: UntypedJson) => {
      const message =
        error instanceof Error ? error.message : commonT("updateFailed");
      toast.error(message);
    },
  });

  const disableForm = isLoading || updateProfile.isPending;

  return (
    <SettingsPanel
      title={profileT("formTitle")}
      description={profileT("formDescription")}
      className="h-full"
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((values) => updateProfile.mutate(values))}
          className="space-y-6"
        >
          <ProfileIdentityFormFields
            form={form}
            disableForm={disableForm}
            commonT={commonT}
            profileT={profileT}
            timeZoneOptions={timeZoneOptions}
            localeOptions={localeOptions}
          />

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={disableForm}
              className={cn({ "cursor-wait": updateProfile.isPending })}
            >
              {updateProfile.isPending
                ? commonT("saving")
                : commonT("saveChanges")}
            </Button>
          </div>
        </form>
      </Form>
    </SettingsPanel>
  );
}
