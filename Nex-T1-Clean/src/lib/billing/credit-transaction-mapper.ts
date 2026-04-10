export type CreditTransaction = {
  id: string;
  type: "deduction" | "purchase" | "refund" | "bonus";
  amount: number;
  datetime: Date;
  description?: string;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const asNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

const asString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toSafeDate = (value: string | null): Date => {
  if (!value) {
    return new Date();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

export function mapCreditUsageRows(rows: unknown[]): CreditTransaction[] {
  return rows.flatMap((row, index) => {
    const record = asRecord(row);
    if (!record) {
      return [];
    }

    const windowStart = asString(record.window_start);
    const createdAt = asString(record.created_at);
    const updatedAt = asString(record.updated_at);

    const id = asString(record.id) ?? (windowStart ? `tx-${windowStart}-${index}` : `tx-row-${index}`);
    const amount = Math.max(0, asNumber(record.used) ?? 0);

    return [
      {
        id,
        type: "deduction",
        amount,
        datetime: toSafeDate(createdAt ?? updatedAt ?? windowStart),
        description: windowStart ? `Usage for ${windowStart}` : "Credit usage",
      },
    ];
  });
}
