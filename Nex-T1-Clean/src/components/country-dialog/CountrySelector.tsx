"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import Image from "next/image";
import {
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentPropsWithoutRef,
  useEffect,
} from "react";

import { COUNTRY_OPTIONS } from "@/i18n/config";
import { useTranslations } from "@/components/providers/locale-provider";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getCountrySelectorCopy } from "@/modules/app/i18n";

type Country = {
  name: string;
  code: string;
};

type CountrySelectorProps = Omit<
  ComponentPropsWithoutRef<"button">,
  "children" | "defaultValue" | "onChange" | "value"
> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  flagSize?: number;
  showLabel?: boolean;
};

type CountrySelectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  countries: Country[];
  onSelectCountry: (country: Country) => void;
  selectedCode?: string;
  copy: ReturnType<typeof getCountrySelectorCopy>;
};

const DEFAULT_COUNTRY_CODE = "US";

const COUNTRY_LIST: Country[] = COUNTRY_OPTIONS.map((country) => ({
  name: country.label,
  code: country.value,
})).sort((a, b) => a.name.localeCompare(b.name));

function getUserRegion(): string | null {
  try {
    const locale = navigator.language || navigator.languages?.[0] || "en-US";
    const region = locale.split("-")[1] || locale.split("_")[1];
    return region?.toUpperCase() ?? null;
  } catch {
    return null;
  }
}

function CountrySelectDialog({
  open,
  onOpenChange,
  countries,
  onSelectCountry,
  selectedCode,
  copy,
}: CountrySelectDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) {
      return countries;
    }

    const normalizedQuery = searchQuery.toLowerCase();
    return countries.filter(
      (country) =>
        country.name.toLowerCase().includes(normalizedQuery) ||
        country.code.toLowerCase().includes(normalizedQuery),
    );
  }, [countries, searchQuery]);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleSelect = (country: Country) => {
    onSelectCountry(country);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-full max-h-[700px] w-[450px] max-w-none flex-col rounded-3xl border-border/20 bg-card p-0 text-foreground shadow-2xl">
        <DialogHeader className="p-5 pb-0">
          <DialogTitle className="text-base font-medium tracking-tight">
            {copy.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {copy.description}
          </DialogDescription>

          <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
            <Search className="size-5 stroke-[1.5] text-muted-foreground" />
            <input
              type="text"
              placeholder={copy.searchPlaceholder}
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full bg-transparent tracking-tight outline-none"
            />
          </div>
        </DialogHeader>

        <div className="h-full overflow-y-auto">
          {filteredCountries.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-sm text-muted-foreground">
                {searchQuery ? copy.noResults : copy.noOptions}
              </div>
            </div>
          ) : (
            <ul className="w-full">
              {filteredCountries.map((country) => (
                <li
                  key={country.code}
                  className="relative flex h-[56px] cursor-pointer items-center gap-3 px-5 transition-colors duration-150 hover:bg-accent/50"
                  onClick={() => handleSelect(country)}
                >
                  <div className="size-8 overflow-hidden rounded-full">
                    <FlagGlyph code={country.code} size={32} />
                  </div>
                  <div className="flex flex-col">
                    <p className="font-medium tracking-tight">{country.name}</p>
                  </div>

                  {selectedCode === country.code && (
                    <Check className="absolute right-5 size-5" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CountrySelector({
  value,
  defaultValue,
  onValueChange,
  placeholder,
  flagSize = 24,
  showLabel = true,
  type = "button",
  className,
  disabled = false,
  ...buttonProps
}: CountrySelectorProps) {
  const t = useTranslations("app");
  const copy = getCountrySelectorCopy(t);
  const [open, setOpen] = useState(false);
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const hasSetInitialCountry = useRef(false);

  const selectedCode = value ?? uncontrolledValue;
  const countries = COUNTRY_LIST;

  const selectedCountry = useMemo(
    () => countries.find((country) => country.code === selectedCode) ?? null,
    [countries, selectedCode],
  );
  const resolvedPlaceholder = placeholder ?? copy.placeholder;

  useEffect(() => {
    if (selectedCode || hasSetInitialCountry.current || countries.length === 0) {
      return;
    }

    const userRegion = getUserRegion();
    if (!userRegion) {
      hasSetInitialCountry.current = true;
      return;
    }

    const userCountry = countries.find((country) => country.code === userRegion);
    if (userCountry) {
      if (value === undefined) {
        setUncontrolledValue(userCountry.code);
      }
      onValueChange?.(userCountry.code);
    }

    hasSetInitialCountry.current = true;
  }, [countries, onValueChange, selectedCode, value]);

  const handleSelectCountry = (country: Country) => {
    if (value === undefined) {
      setUncontrolledValue(country.code);
    }
    onValueChange?.(country.code);
  };

  const renderedFlagSize = Math.max(Math.round(flagSize * 1.1), 12);
  const chevronSize = flagSize <= 18 ? 14 : 16;

  return (
    <>
      <button
        type={type}
        disabled={disabled}
        onClick={() => setOpen(true)}
        aria-label={
          buttonProps["aria-label"] ??
          (selectedCountry ? copy.selectedAria(selectedCountry.name) : copy.openAria)
        }
        className={cn(
          "border-input data-placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex h-9 w-full items-center rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
          showLabel ? "justify-between gap-2" : "justify-center gap-3",
          className,
        )}
        {...buttonProps}
      >
        <span className={cn("flex min-w-0 items-center", showLabel ? "gap-2" : "gap-1.5")}>
          <span
            className="shrink-0 overflow-hidden rounded-full"
            style={{ width: renderedFlagSize, height: renderedFlagSize }}
          >
            <FlagGlyph code={selectedCountry?.code ?? DEFAULT_COUNTRY_CODE} size={renderedFlagSize} />
          </span>
          {showLabel ? (
            <span
              className={cn(
                "truncate",
                !selectedCountry && "text-muted-foreground",
              )}
            >
              {selectedCountry?.name ?? resolvedPlaceholder}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className="shrink-0 opacity-50"
          style={{ width: chevronSize, height: chevronSize }}
        />
      </button>

      <CountrySelectDialog
        open={open}
        onOpenChange={setOpen}
        countries={countries}
        onSelectCountry={handleSelectCountry}
        selectedCode={selectedCode ?? DEFAULT_COUNTRY_CODE}
        copy={copy}
      />
    </>
  );
}

function FlagGlyph({ code, size }: { code: string; size: number }) {
  const [hasImageError, setHasImageError] = useState(false);
  const emoji = countryCodeToFlagEmoji(code);
  const flagUrl = getCountryFlagUrl(code);
  const fontSize = Math.max(Math.round(size * 1.08), 12);

  return (
    <span
      aria-hidden="true"
      className="relative flex size-full items-center justify-center overflow-hidden rounded-full bg-muted/30 leading-none"
    >
      {flagUrl && !hasImageError ? (
        <Image
          src={flagUrl}
          alt=""
          fill
          sizes={`${size}px`}
          className="object-cover"
          onError={() => setHasImageError(true)}
        />
      ) : (
        <span
          className="absolute inset-[-18%] flex items-center justify-center leading-none"
          style={{ fontSize }}
        >
          {emoji}
        </span>
      )}
    </span>
  );
}

function getCountryFlagUrl(code: string): string | null {
  const normalized = code.trim().toLowerCase();
  if (!/^[a-z]{2}$/.test(normalized)) {
    return null;
  }

  return `https://flagcdn.com/w80/${normalized}.png`;
}

function countryCodeToFlagEmoji(code: string): string {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) {
    return "🌐";
  }

  return String.fromCodePoint(
    ...[...normalized].map((char) => 127397 + char.charCodeAt(0)),
  );
}
