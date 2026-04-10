import "server-only";


import { logger } from '@/lib/logger';
type AttributePrimitive = string | number | boolean;
type AttributeValue = AttributePrimitive | undefined;
type SpanAttributeValueRecord = AttributePrimitive;
type SpanAttributesRecord = Record<string, SpanAttributeValueRecord>;

export type InstrumentationSpan = {
  setAttributes: (attributes: SpanAttributesRecord | undefined) => void;
  setAttribute: (key: string, value: SpanAttributeValueRecord | undefined) => void;
  setStatus: (status: { code: 1 | 2; message?: string }) => void;
};

type SentryModule = typeof import("@sentry/nextjs");
type CaptureContext = Parameters<SentryModule["captureException"]>[1];

let sentryPromise: Promise<SentryModule | null> | null = null;
let hasLoggedMissingSentry = false;

const isModuleNotFoundError = (error: UntypedJson): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }
  const nodeError = error as NodeJS.ErrnoException;
  return nodeError.code === "MODULE_NOT_FOUND";
};

const loadSentry = async (): Promise<SentryModule | null> => {
  if (!sentryPromise) {
    sentryPromise = (async () => {
      try {
        return await import("@sentry/nextjs");
      } catch (error) {
        if (isModuleNotFoundError(error)) {
          if (!hasLoggedMissingSentry) {
            hasLoggedMissingSentry = true;
            logger.warn(
              "[observability] Sentry SDK is unavailable (missing optional dependency). Continuing without tracing.",
              error,
            );
          }
          return null;
        }
        logger.error("[observability] Failed to load Sentry SDK", error);
        return null;
      }
    })();
  }
  return sentryPromise;
};

const createNoopSpan = (): InstrumentationSpan => ({
  setAttributes: () => undefined,
  setAttribute: () => undefined,
  setStatus: () => undefined,
});

export type SentrySpanOptions = {
  name: string;
  op?: string;
  attributes?: Record<string, AttributeValue>;
  tags?: Record<string, string>;
  captureException?: boolean;
};

function normalizeAttributeValue(value: AttributeValue): SpanAttributeValueRecord | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  return undefined;
}

function sanitizeAttributes(attributes?: Record<string, AttributeValue>): SpanAttributesRecord | undefined {
  if (!attributes) {
    return undefined;
  }

  const sanitized: SpanAttributesRecord = {};
  for (const [key, value] of Object.entries(attributes)) {
    const normalized = normalizeAttributeValue(value);
    if (normalized !== undefined) {
      sanitized[key] = normalized;
    }
  }

  return Object.keys(sanitized).length ? sanitized : undefined;
}

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

function applyMetadata(span: InstrumentationSpan, options: SentrySpanOptions, sanitized?: SpanAttributesRecord) {
  const attributes = sanitized ?? sanitizeAttributes(options.attributes);
  if (attributes) {
    span.setAttributes(attributes);
  }
  if (options.tags) {
    for (const [key, value] of Object.entries(options.tags)) {
      span.setAttribute(`tag.${key}`, value);
    }
  }
}

async function executeWithSpan<T>(
  span: InstrumentationSpan,
  options: SentrySpanOptions,
  runner: (span: InstrumentationSpan) => Promise<T> | T,
  onError?: (error: Error) => void,
  sanitizedAttributes?: SpanAttributesRecord,
): Promise<T> {
  applyMetadata(span, options, sanitizedAttributes);
  try {
    const result = await runner(span);
    span.setStatus({ code: 1 as const });
    return result;
  } catch (error) {
    const normalized = normaliseError(error);
    span.setStatus({ code: 2 as const, message: normalized.message });
    span.setAttribute("error", true);
    if (onError) {
      onError(normalized);
    }
    throw normalized;
  }
}

export async function runWithSentrySpan<T>(
  options: SentrySpanOptions,
  runner: (span: InstrumentationSpan) => Promise<T> | T,
): Promise<T> {
  const sanitizedAttributes = sanitizeAttributes(options.attributes);
  const Sentry = await loadSentry();

  if (!Sentry) {
    return executeWithSpan(createNoopSpan(), options, runner, undefined, sanitizedAttributes);
  }

  return Sentry.startSpan(
    {
      name: options.name,
      op: options.op ?? "task",
      attributes: sanitizedAttributes,
    },
    (span) =>
      executeWithSpan(
        span as UntypedJson as InstrumentationSpan,
        options,
        runner,
        options.captureException === false
          ? undefined
          : (error) =>
              Sentry.captureException(error, {
                tags: options.tags,
                extra: options.attributes,
              }),
        sanitizedAttributes,
      ),
  );
}

export function captureHandledException(error: UntypedJson, context?: CaptureContext) {
  void loadSentry().then((Sentry) => {
    if (!Sentry) {
      return;
    }
    Sentry.captureException(normaliseError(error), context);
  });
}

export function instrumentRouteHandler<
  Handler extends (request: Request, ...args: UntypedJson[]) => Promise<Response> | Response,
>(
  name: string,
  handler: Handler,
  options: {
    op?: string;
    requestAttributes?: (request: Request, ...args: Parameters<Handler>) => Record<string, AttributeValue>;
    tags?: Record<string, string>;
  } = {},
): Handler {
  return (async (request: Request, ...args: Parameters<Handler>) => {
    const attributes = {
      "http.request.method": request.method,
      "http.request.url": request.url,
      "http.request.client_ip": request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
      ...(options.requestAttributes ? options.requestAttributes(request, ...args) : {}),
    };

    return runWithSentrySpan(
      {
        name,
        op: options.op ?? "http.server",
        attributes,
        tags: options.tags,
      },
      async (span) => {
        const response = await handler(request, ...args);
        if (response instanceof Response) {
          span.setAttribute("http.response.status_code", response.status);
        }
        return response;
      },
    );
  }) as Handler;
}

export function runToolSpan<T>(
  toolName: string,
  runner: (span: InstrumentationSpan) => Promise<T> | T,
  attributes?: Record<string, AttributeValue>,
) {
  return runWithSentrySpan(
    {
      name: `ai.tool.${toolName}`,
      op: "ai.tool",
      attributes: {
        "ai.tool.name": toolName,
        ...attributes,
      },
      tags: {
        "ai.tool": toolName,
      },
    },
    runner,
  );
}
