import { unstable_rethrow } from "next/navigation";
import { NextResponse, NextRequest } from "next/server";
import { ApiResponse } from "@/types/api";

type ApiHandler<T> = (
  req: NextRequest,
  params: Promise<Record<string, string | string[] | undefined>>
) => Promise<T>;

export function withApiRoute<T>(handler: ApiHandler<T>) {
  return async function wrappedHandler(
    req: NextRequest,
    context: { params: Promise<Record<string, string | string[] | undefined>> }
  ): Promise<NextResponse<ApiResponse<T>>> {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    try {
      const params = context?.params ?? Promise.resolve({});
      const data = await handler(req, params);
      
      const latencyMs = Date.now() - startTime;
      
      return NextResponse.json({
        success: true,
        data,
        metadata: {
          timestamp: Date.now(),
          requestId,
          latencyMs
        }
      }, { status: 200 });

    } catch (err: unknown) {
      unstable_rethrow(err);
      const error = err as { status?: number; code?: string; message?: string; details?: unknown } | Error;
      const latencyMs = Date.now() - startTime;
      console.error(`[API Error][${requestId}]`, error);

      // Determine appropriate status code and generic error fallback
      let statusCode = 500;
      let errorCode = "INTERNAL_SERVER_ERROR";
      let message = "An unexpected error occurred.";

      if ('status' in error && typeof error.status === 'number') {
        statusCode = error.status;
      }
      if ('code' in error && typeof error.code === 'string') {
        errorCode = error.code;
      }
      if ('message' in error && typeof error.message === 'string') {
        message = error.message;
      }

      return NextResponse.json({
        success: false,
        error: {
          code: errorCode,
          message,
          // Only reveal details in non-production environments to avoid leaking stack traces
          details: process.env.NODE_ENV !== 'production' ? error : undefined
        },
        metadata: {
          timestamp: Date.now(),
          requestId,
          latencyMs
        }
      }, { status: statusCode });
    }
  };
}
