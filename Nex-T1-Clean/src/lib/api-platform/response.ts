import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * Standard API Response format
 */
export interface ApiResponse<T = UntypedJson> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: UntypedJson;
    requestId?: string;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
    nextCursor?: string | number | null;
  };
}

export const apiResponse = {
  /**
   * Success response (200 OK)
   */
  success: <T>(data: T, meta?: ApiResponse["meta"]) => {
    return NextResponse.json(
      { success: true, data, meta },
      { status: 200 }
    );
  },

  /**
   * Created response (201 Created)
   */
  created: <T>(data: T) => {
    return NextResponse.json(
      { success: true, data },
      { status: 201 }
    );
  },

  /**
   * No Content response (204 No Content)
   */
  noContent: () => {
    return new NextResponse(null, { status: 204 });
  },

  /**
   * Error response
   */
  error: (
    code: string,
    message: string,
    status: number = 400,
    details?: UntypedJson,
    requestId?: string
  ) => {
    return NextResponse.json(
      {
        success: false,
        error: { code, message, details, requestId },
      },
      { status }
    );
  },

  /**
   * Validation Error response (400 Bad Request)
   */
  validationError: (error: ZodError) => {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Input validation failed",
          details: error.flatten().fieldErrors,
        },
      },
      { status: 400 }
    );
  },

  /**
   * Unauthorized response (401 Unauthorized)
   */
  unauthorized: (message = "Unauthorized") => {
    return NextResponse.json(
      {
        success: false,
        error: { code: "UNAUTHORIZED", message },
      },
      { status: 401 }
    );
  },

  /**
   * Forbidden response (403 Forbidden)
   */
  forbidden: (message = "Forbidden") => {
    return NextResponse.json(
      {
        success: false,
        error: { code: "FORBIDDEN", message },
      },
      { status: 403 }
    );
  },

  /**
   * Not Found response (404 Not Found)
   */
  notFound: (message = "Resource not found") => {
    return NextResponse.json(
      {
        success: false,
        error: { code: "NOT_FOUND", message },
      },
      { status: 404 }
    );
  },

  /**
   * Bad Request response (400 Bad Request) - distinct from validationError
   */
  badRequest: (message = "Bad Request", code = "BAD_REQUEST") => {
    return NextResponse.json(
      {
        success: false,
        error: { code, message },
      },
      { status: 400 }
    );
  },

  /**
   * Payment Required response (402 Payment Required)
   */
  paymentRequired: (message = "Payment Required", code = "PAYMENT_REQUIRED") => {
    return NextResponse.json(
      {
        success: false,
        error: { code, message },
      },
      { status: 402 }
    );
  },

  /**
   * Service Unavailable response (503 Service Unavailable)
   */
  serviceUnavailable: (message = "Service Unavailable", code = "SERVICE_UNAVAILABLE") => {
    return NextResponse.json(
      {
        success: false,
        error: { code, message },
      },
      { status: 503 }
    );
  },

  /**
   * Internal Server Error response (500 Internal Server Error)
   */
  internalError: (message = "Internal Server Error", requestId?: string) => {
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message, requestId },
      },
      { status: 500 }
    );
  },
};
