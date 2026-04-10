export type StripeInvoiceSummary = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  date: number;
  pdf: string | null;
  number: string;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const asString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const asNullableString = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  return asString(value);
};

const asNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return null;
};

function toStripeInvoiceSummary(value: unknown): StripeInvoiceSummary | null {
  const raw = asRecord(value);
  if (!raw) {
    return null;
  }

  const id = asString(raw.id);
  const amount = asNumber(raw.amount);
  const currency = asString(raw.currency);
  const status = asString(raw.status);
  const date = asNumber(raw.date);
  const number = asString(raw.number);
  const pdf = asNullableString(raw.pdf);

  if (!id || amount === null || !currency || !status || date === null || !number) {
    return null;
  }

  return {
    id,
    amount,
    currency,
    status,
    date,
    pdf,
    number,
  };
}

export function extractStripeInvoices(payload: unknown): StripeInvoiceSummary[] {
  if (Array.isArray(payload)) {
    return payload
      .map((row) => toStripeInvoiceSummary(row))
      .filter((row): row is StripeInvoiceSummary => row !== null);
  }

  const wrapped = asRecord(payload);
  if (!wrapped || wrapped.success !== true || !Array.isArray(wrapped.data)) {
    return [];
  }

  return wrapped.data
    .map((row) => toStripeInvoiceSummary(row))
    .filter((row): row is StripeInvoiceSummary => row !== null);
}
