import { apiResponse } from "@/lib/api-platform";

export type JsonObject = Record<string, UntypedJson>;

export function isJsonObject(value: UntypedJson): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readString(
  value: UntypedJson,
  trim = false
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  if (!trim) {
    return value;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function readNumber(value: UntypedJson): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

export function pickFirstString(
  source: JsonObject,
  ...candidates: string[]
): string | undefined {
  for (const key of candidates) {
    const candidate = readString(source[key], true);
    if (candidate) {
      return candidate;
    }
  }
  return undefined;
}

export async function parseJsonObjectBody(
  req: Request,
  errorMessage = "Request body must be a JSON object."
): Promise<{ success: true; data: JsonObject } | { success: false; response: Response }> {
  let body: UntypedJson;
  try {
    body = await req.json();
  } catch {
    return {
      success: false,
      response: apiResponse.badRequest(errorMessage),
    };
  }

  if (!isJsonObject(body)) {
    return {
      success: false,
      response: apiResponse.badRequest(errorMessage),
    };
  }

  return { success: true, data: body };
}

export async function readJsonBody(req: Request): Promise<UntypedJson> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
