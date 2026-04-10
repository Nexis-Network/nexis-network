"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { startTransition, useCallback, useEffect, useMemo, useState } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { SortValue } from "@/modules/prices/market-overview/sort-utils";
import { normalizeCategorySelection } from "@/modules/prices/market-overview/category-utils";

type Timeframe = "1h" | "24h" | "7d";

type StoredPreferences = {
  currency: string;
  timeframe: Timeframe;
  hiddenColumns: string[];
};

const STORAGE_KEY = "market-overview-preferences";

function arraysShallowEqual(values: string[], other: string[]) {
  if (values.length !== other.length) {
    return false;
  }
  return values.every((value, index) => value === other[index]);
}

function readStoredPreferences(): StoredPreferences | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    return {
      currency: typeof parsed.currency === "string" ? parsed.currency : "usd",
      timeframe: (parsed.timeframe as Timeframe) ?? "24h",
      hiddenColumns: Array.isArray(parsed.hiddenColumns) ? parsed.hiddenColumns : [],
    };
  } catch {
    return null;
  }
}

function writeStoredPreferences(prefs: StoredPreferences) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore storage failures
  }
}

export function useMarketOverviewControls() {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams() ?? new URLSearchParams();

  const storedPreferences = useMemo(() => readStoredPreferences(), []);

  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(
    () => new Set(storedPreferences?.hiddenColumns ?? []),
  );

  const currencyFromUrl = searchParams.get("currency");
  const timeframeFromUrl = searchParams.get("timeframe") as Timeframe | null;
  const sortCandidate = searchParams.get("sort") ?? "market_cap_desc";
  const validSortValues: SortValue[] = [
    "market_cap_desc",
    "market_cap_asc",
    "price_desc",
    "price_asc",
    "volume_desc",
    "volume_asc",
  ];
  const sortFromUrl = (validSortValues.includes(sortCandidate as SortValue)
    ? sortCandidate
    : "market_cap_desc") as SortValue;
  const searchFromUrl = searchParams.get("search") ?? "";
  const pageFromUrl = Number(searchParams.get("page") ?? "1");
  const categoriesFromUrl = searchParams.getAll("category");

  const currency = (currencyFromUrl ?? storedPreferences?.currency ?? "usd").toLowerCase();
  const timeframe: Timeframe = timeframeFromUrl && ["1h", "24h", "7d"].includes(timeframeFromUrl)
    ? timeframeFromUrl
    : storedPreferences?.timeframe ?? "24h";
  const searchValue = searchFromUrl;
  const page = Number.isNaN(pageFromUrl) ? 1 : Math.max(1, pageFromUrl);
  const categories = categoriesFromUrl.length ? Array.from(new Set(categoriesFromUrl)) : [];

  const createQueryString = useCallback(
    (updates: Record<string, string | string[] | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined) {
          params.delete(key);
          continue;
        }

        if (Array.isArray(value)) {
          params.delete(key);
          value.forEach((entry) => params.append(key, entry));
        } else {
          params.set(key, value);
        }
      }

      return params.toString();
    },
    [searchParams],
  );

  const updateUrl = useCallback(
    (updates: Record<string, string | string[] | undefined>) => {
      const queryString = createQueryString(updates);
      const currentQuery = searchParams.toString();

      if (queryString === currentQuery) {
        return;
      }

      startTransition(() => {
        router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
      });
    },
    [createQueryString, pathname, router, searchParams],
  );

  const setCurrency = useCallback(
    (next: string) => {
      const normalized = next.toLowerCase();
      if (normalized === currency) {
        return;
      }

      updateUrl({ currency: normalized });
      setHiddenColumns((prev) => new Set(prev));
      const prefs: StoredPreferences = {
        currency: normalized,
        timeframe,
        hiddenColumns: Array.from(hiddenColumns),
      };
      writeStoredPreferences(prefs);
    },
    [currency, hiddenColumns, timeframe, updateUrl],
  );

  const setTimeframe = useCallback(
    (next: Timeframe) => {
      if (next === timeframe) {
        return;
      }
      updateUrl({ timeframe: next });
      const prefs: StoredPreferences = {
        currency,
        timeframe: next,
        hiddenColumns: Array.from(hiddenColumns),
      };
      writeStoredPreferences(prefs);
    },
    [currency, hiddenColumns, timeframe, updateUrl],
  );

  const setSort = useCallback(
    (next: SortValue) => {
      if (next === sortFromUrl) {
        return;
      }
      updateUrl({ sort: next, page: "1" });
    },
    [sortFromUrl, updateUrl],
  );

  const setSearch = useCallback(
    (next: string) => {
      const normalized = next.trim();
      if (normalized === searchValue) {
        return;
      }
      updateUrl({ search: normalized || undefined, page: "1" });
    },
    [searchValue, updateUrl],
  );

  const setPage = useCallback(
    (nextPage: number) => {
      const targetPage = Math.max(1, Math.trunc(nextPage));
      if (targetPage === page) {
        return;
      }
      updateUrl({ page: String(targetPage) });
    },
    [page, updateUrl],
  );

  const setCategories = useCallback(
    (nextCategories: string[]) => {
      const trimmed = normalizeCategorySelection(nextCategories, 5);
      if (arraysShallowEqual(trimmed, categories)) {
        return;
      }
      updateUrl({ category: trimmed.length ? trimmed : undefined, page: "1" });
    },
    [categories, updateUrl],
  );

  const toggleCategory = useCallback(
    (categoryId: string) => {
      if (!categoryId) {
        return;
      }

      const nextSelection = categories.includes(categoryId)
        ? categories.filter((id) => id !== categoryId)
        : [...categories, categoryId];

      setCategories(nextSelection);
    },
    [categories, setCategories],
  );

  const clearCategories = useCallback(() => {
    setCategories([]);
  }, [setCategories]);

  const toggleColumn = useCallback((columnId: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(columnId)) {
        next.delete(columnId);
      } else {
        next.add(columnId);
      }
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    updateUrl({
      currency: undefined,
      timeframe: undefined,
      sort: undefined,
      search: undefined,
      page: undefined,
      category: undefined,
    });
    setHiddenColumns(new Set(storedPreferences?.hiddenColumns ?? []));
  }, [storedPreferences?.hiddenColumns, updateUrl]);

  useEffect(() => {
    writeStoredPreferences({
      currency,
      timeframe,
      hiddenColumns: Array.from(hiddenColumns),
    });
  }, [currency, hiddenColumns, timeframe]);

  return {
    currency,
    timeframe,
    sort: sortFromUrl,
    search: searchValue,
    page,
    categories,
    hiddenColumns,
    setCurrency,
    setTimeframe,
    setSort,
    setSearch,
    setPage,
    setCategories,
    toggleCategory,
    clearCategories,
    toggleColumn,
    resetFilters,
  };
}
