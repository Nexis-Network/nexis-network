import { asJsonObject, getJsonString } from "@/lib/json";
import type { JsonObject } from "@/types/json";

export type SupabaseErrorLike = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

export function asSupabaseError(error: unknown): SupabaseErrorLike | null {
  const record = asJsonObject(error);
  if (!record) {
    return null;
  }

  return {
    code: getJsonString(record, "code") ?? undefined,
    message: getJsonString(record, "message") ?? undefined,
    details: getJsonString(record, "details") ?? undefined,
    hint: getJsonString(record, "hint") ?? undefined,
  };
}

export function getSupabaseErrorMessage(error: unknown): string | null {
  return asSupabaseError(error)?.message ?? null;
}

export function matchesSupabaseError(
  error: unknown,
  options: {
    codes?: readonly string[];
    messagePatterns?: readonly RegExp[];
  },
): boolean {
  const normalized = asSupabaseError(error);
  if (!normalized) {
    return false;
  }

  if (options.codes?.includes(normalized.code ?? "")) {
    return true;
  }

  const message = normalized.message ?? "";
  return options.messagePatterns?.some((pattern) => pattern.test(message)) ?? false;
}

export function isMissingColumnError(error: unknown): boolean {
  return matchesSupabaseError(error, {
    codes: ["42703"],
    messagePatterns: [/column .* does not exist/i],
  });
}

export function isMissingRelationError(error: unknown): boolean {
  return matchesSupabaseError(error, {
    codes: ["42P01", "PGRST200"],
    messagePatterns: [
      /relation .* does not exist/i,
      /Could not find a relationship between .* in the schema cache/i,
    ],
  });
}

export function isMissingSchemaObjectError(error: unknown): boolean {
  return matchesSupabaseError(error, {
    codes: ["42P01", "42703", "PGRST200", "PGRST205"],
    messagePatterns: [
      /relation .* does not exist/i,
      /column .* does not exist/i,
      /Could not find a relationship between .* in the schema cache/i,
      /Could not find the table .* in the schema cache/i,
    ],
  });
}

export function toSupabaseLogContext(error: unknown): JsonObject | undefined {
  const normalized = asSupabaseError(error);
  if (!normalized) {
    return undefined;
  }

  return {
    code: normalized.code ?? null,
    message: normalized.message ?? null,
    details: normalized.details ?? null,
    hint: normalized.hint ?? null,
  };
}
