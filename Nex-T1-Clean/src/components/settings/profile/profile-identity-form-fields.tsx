import type { UseFormReturn } from "react-hook-form";

import { CountrySelector } from "@/components/country-dialog/CountrySelector";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  SYSTEM_LOCALE_SENTINEL,
  type ProfileIdentityFormValues,
} from "@/components/settings/profile/profile-identity-form.schema";

type TranslationFn = (key: string) => string;

type LocaleOption = {
  value: string;
  nativeLabel: string;
};

type ProfileIdentityFormFieldsProps = {
  form: UseFormReturn<ProfileIdentityFormValues>;
  disableForm: boolean;
  commonT: TranslationFn;
  profileT: TranslationFn;
  timeZoneOptions: string[];
  localeOptions: LocaleOption[];
};

export function ProfileIdentityFormFields({
  form,
  disableForm,
  commonT,
  profileT,
  timeZoneOptions,
  localeOptions,
}: ProfileIdentityFormFieldsProps) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{commonT("displayName")}</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ada Lovelace"
                  disabled={disableForm}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{commonT("username")}</FormLabel>
              <FormControl>
                <Input
                  placeholder="nex-builder"
                  disabled={disableForm}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="locale"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{profileT("localeLabel")}</FormLabel>
              <Select
                disabled={disableForm}
                onValueChange={(value) =>
                  field.onChange(
                    value === SYSTEM_LOCALE_SENTINEL ? undefined : value,
                  )
                }
                value={field.value ?? SYSTEM_LOCALE_SENTINEL}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={profileT("localePlaceholder")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={SYSTEM_LOCALE_SENTINEL}>
                    {commonT("systemDefault")}
                  </SelectItem>
                  {localeOptions.map((locale) => (
                    <SelectItem key={locale.value} value={locale.value}>
                      {locale.nativeLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="countryCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{profileT("countryLabel")}</FormLabel>
              <FormControl>
                <CountrySelector
                  disabled={disableForm}
                  onValueChange={field.onChange}
                  placeholder={profileT("countryPlaceholder")}
                  value={field.value}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="timeZone"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>{commonT("timeZone")}</FormLabel>
              <Select
                disabled={disableForm}
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={profileT("timeZonePlaceholder")}
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="max-h-60">
                  {timeZoneOptions.map((timeZone) => (
                    <SelectItem key={timeZone} value={timeZone}>
                      {timeZone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="bio"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{commonT("bio")}</FormLabel>
            <FormControl>
              <Textarea
                placeholder={profileT("bioPlaceholder")}
                disabled={disableForm}
                className="min-h-[112px]"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
