import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function publicJsonResponse<T>(
  data: T,
  init?: ResponseInit,
): Response {
  return NextResponse.json(data, init);
}

export function publicErrorResponse(args: {
  code: string;
  message: string;
  status: number;
  details?: UntypedJson;
}): Response {
  return NextResponse.json(
    {
      error: {
        code: args.code,
        message: args.message,
        ...(args.details ? { details: args.details } : {}),
      },
    },
    { status: args.status },
  );
}

export function publicValidationErrorResponse(error: ZodError): Response {
  return publicErrorResponse({
    code: "VALIDATION_ERROR",
    message: "Input validation failed.",
    status: 400,
    details: error.flatten().fieldErrors,
  });
}
