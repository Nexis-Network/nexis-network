import { NextRequest } from "next/server";
import { ZodSchema, ZodError } from "zod";
import { apiResponse } from "./response";

type ValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; response: Response; error: ZodError };

/**
 * Validates the request body against a Zod schema
 */
export async function validateBody<T>(
  request: Request | NextRequest,
  schema: ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (result.success) {
      return { success: true, data: result.data };
    }

    return {
      success: false,
      error: result.error,
      response: apiResponse.validationError(result.error),
    };
  } catch {
    return {
      success: false,
      error: new ZodError([]),
      response: apiResponse.error("INVALID_JSON", "Invalid JSON body", 400),
    };
  }
}

/**
 * Validates query parameters against a Zod schema
 */
export function validateQuery<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): ValidationResult<T> {
  const url = new URL(request.url);
  const queryParams: Record<string, string | string[]> = {};

  url.searchParams.forEach((value, key) => {
    // Handle array parameters (e.g., tags=a&tags=b)
    if (queryParams[key]) {
      if (Array.isArray(queryParams[key])) {
        (queryParams[key] as string[]).push(value);
      } else {
        queryParams[key] = [queryParams[key] as string, value];
      }
    } else {
      queryParams[key] = value;
    }
  });

  const result = schema.safeParse(queryParams);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    error: result.error,
    response: apiResponse.validationError(result.error),
  };
}
