export type SortValue =
  | "market_cap_desc"
  | "market_cap_asc"
  | "price_desc"
  | "price_asc"
  | "volume_desc"
  | "volume_asc";

const SORT_VALUE_TO_COLUMN: Record<SortValue, { id: string; desc: boolean }> = {
  market_cap_desc: { id: "marketCap", desc: true },
  market_cap_asc: { id: "marketCap", desc: false },
  price_desc: { id: "price", desc: true },
  price_asc: { id: "price", desc: false },
  volume_desc: { id: "volume24h", desc: true },
  volume_asc: { id: "volume24h", desc: false },
};

const COLUMN_TO_SORT_VALUE: Record<string, { asc: SortValue; desc: SortValue }> = {
  marketCap: { asc: "market_cap_asc", desc: "market_cap_desc" },
  price: { asc: "price_asc", desc: "price_desc" },
  volume24h: { asc: "volume_asc", desc: "volume_desc" },
};

export const REMOTE_SORTABLE_COLUMNS = new Set(Object.keys(COLUMN_TO_SORT_VALUE));

export function sortValueToColumn(sort: SortValue | string | undefined | null): { id: string; desc: boolean } | null {
  if (!sort) {
    return null;
  }
  return SORT_VALUE_TO_COLUMN[sort as SortValue] ?? null;
}

export function columnSortToValue(columnId: string, desc: boolean): SortValue | null {
  const mapping = COLUMN_TO_SORT_VALUE[columnId];
  if (!mapping) {
    return null;
  }
  return desc ? mapping.desc : mapping.asc;
}

