"use client";

import { captureException } from "@sentry/nextjs";

type CaptureContext = Parameters<typeof captureException>[1];

function normaliseError(error: UntypedJson): Error {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === "string") {
    return new Error(error);
  }
  try {
    return new Error(JSON.stringify(error));
  } catch {
    return new Error("Unknown error");
  }
}

export function captureHandledException(error: UntypedJson, context?: CaptureContext) {
  captureException(normaliseError(error), context);
}
