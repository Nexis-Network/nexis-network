import {
  ArtifactError,
  artifact as createSdkArtifact,
} from "@ai-sdk-tools/artifacts";
import type { UIMessage, UIMessageStreamWriter } from "ai";

import {
  applyArtifactPatch,
  applyArtifactPatches,
  type ArtifactPatchOperation,
} from "@/lib/ai/artifact-patch";

export type ArtifactStatus =
  | "idle"
  | "loading"
  | "streaming"
  | "complete"
  | "error";

export type BaseContext<UI_MESSAGE extends UIMessage = UIMessage> = {
  writer: UIMessageStreamWriter<UI_MESSAGE>;
};

export type ArtifactData<T extends object = Record<string, never>> = {
  id: string;
  type: string;
  status: ArtifactStatus;
  payload: T;
  version: number;
  progress?: number;
  error?: string;
  createdAt: number;
  updatedAt: number;
};

export type ArtifactSchema<T extends object> = {
  parse: (value: unknown) => T;
};

type ArtifactConfig<T extends object> = {
  id: string;
  schema: ArtifactSchema<T>;
};

type ContextValidator<T extends BaseContext> = (context: T) => boolean | string;

export type ArtifactScope<TContext extends BaseContext = BaseContext> = {
  getContext: () => TContext;
  getWriter: () => TContext["writer"];
  setContext: (context: TContext) => void;
  updateContext: (updater: (context: TContext) => void) => void;
  isActive: () => boolean;
};

type VendorStreamingArtifact<T extends object> = {
  data: T;
  id: string;
  progress?: number;
  update: (updates: Partial<T> & { progress?: number }) => Promise<void>;
  complete: (finalData?: T) => Promise<void>;
  error: (message: string) => Promise<void>;
  cancel: () => Promise<void>;
  timeout: (ms: number) => void;
};

type ArtifactDefinition<T extends object> = {
  id: string;
  schema: ArtifactSchema<T>;
  create: (data?: Partial<T>) => ArtifactData<T>;
  stream: <TContext extends BaseContext>(
    scope: ArtifactScope<TContext>,
    data?: Partial<T>,
  ) => StreamingArtifact<T>;
  validate: (data: unknown) => T;
  isValid: (data: unknown) => data is T;
};

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function validateContext<TContext extends BaseContext>(
  context: TContext,
  validator?: ContextValidator<TContext>,
) {
  if (!validator) {
    return;
  }

  const result = validator(context);
  if (result === false) {
    throw new ArtifactError(
      "CONTEXT_VALIDATION_FAILED",
      "Artifact context validation failed.",
    );
  }

  if (typeof result === "string") {
    throw new ArtifactError("CONTEXT_VALIDATION_FAILED", result);
  }
}

export function createArtifactScope<TContext extends BaseContext>(
  initialContext: TContext,
  validator?: ContextValidator<TContext>,
): ArtifactScope<TContext> {
  validateContext(initialContext, validator);

  let currentContext = initialContext;

  return {
    getContext() {
      return currentContext;
    },
    getWriter() {
      if (!currentContext.writer) {
        throw new ArtifactError(
          "WRITER_NOT_AVAILABLE",
          "No artifact writer available. Set artifact context before streaming.",
        );
      }

      return currentContext.writer;
    },
    setContext(context) {
      validateContext(context, validator);
      currentContext = context;
    },
    updateContext(updater) {
      updater(currentContext);
      validateContext(currentContext, validator);
    },
    isActive() {
      return true;
    },
  };
}

export class StreamingArtifact<T extends object> {
  private readonly config: ArtifactConfig<T>;
  private readonly streamImpl: VendorStreamingArtifact<T>;

  constructor(
    config: ArtifactConfig<T>,
    streamImpl: VendorStreamingArtifact<T>,
  ) {
    this.config = config;
    this.streamImpl = streamImpl;
  }

  get data() {
    return this.streamImpl.data;
  }

  get id() {
    return this.streamImpl.id;
  }

  get progress() {
    return this.streamImpl.progress;
  }

  set progress(value: number | undefined) {
    this.streamImpl.progress = value;
  }

  async update(
    updates: Partial<T> & {
      progress?: number;
    },
  ) {
    const nextUpdates = { ...updates };
    const nextProgress = nextUpdates.progress;

    if ("progress" in nextUpdates) {
      delete nextUpdates.progress;
    }

    const nextPayload = this.config.schema.parse({
      ...cloneValue(this.streamImpl.data),
      ...nextUpdates,
    });

    await this.streamImpl.update({
      ...nextPayload,
      ...(nextProgress !== undefined ? { progress: nextProgress } : {}),
    });
  }

  async applyPatch(
    patch: ArtifactPatchOperation,
    options?: {
      progress?: number;
    },
  ) {
    const nextPayload = this.config.schema.parse(
      applyArtifactPatch(this.streamImpl.data as UntypedJson, patch),
    );

    await this.streamImpl.update({
      ...nextPayload,
      ...(options?.progress !== undefined
        ? { progress: options.progress }
        : {}),
    });
  }

  async applyPatches(
    patches: ArtifactPatchOperation[],
    options?: {
      progress?: number;
    },
  ) {
    if (patches.length === 0) {
      return;
    }

    const nextPayload = this.config.schema.parse(
      applyArtifactPatches(this.streamImpl.data as UntypedJson, patches),
    );

    await this.streamImpl.update({
      ...nextPayload,
      ...(options?.progress !== undefined
        ? { progress: options.progress }
        : {}),
    });
  }

  async complete(finalData?: T) {
    const nextPayload =
      finalData !== undefined
        ? this.config.schema.parse(finalData)
        : this.config.schema.parse(cloneValue(this.streamImpl.data));

    await this.streamImpl.complete(nextPayload);
  }

  async error(message: string) {
    await this.streamImpl.error(message);
  }

  async cancel() {
    await this.streamImpl.cancel();
  }

  timeout(ms: number) {
    this.streamImpl.timeout(ms);
  }
}

export function artifact<T extends object>(
  id: string,
  schema: ArtifactSchema<T>,
): ArtifactDefinition<T> {
  const config: ArtifactConfig<T> = { id, schema };
  const sdkArtifact = createSdkArtifact(
    id,
    schema as never,
  ) as {
    create(data?: Partial<T>): ArtifactData<T>;
    stream(data: Partial<T>, writer: UIMessageStreamWriter): VendorStreamingArtifact<T>;
    validate(data: unknown): T;
    isValid(data: unknown): data is T;
  };

  return {
    id,
    schema,
    create(data: Partial<T> = {}) {
      return sdkArtifact.create(data) as ArtifactData<T>;
    },
    stream<TContext extends BaseContext>(
      scope: ArtifactScope<TContext>,
      data: Partial<T> = {},
    ) {
      const writer = scope.getWriter();
      const safeWriter: UIMessageStreamWriter = {
        ...writer,
        write: (chunk) => writer.write(cloneValue(chunk)),
      };
      const streamImpl = sdkArtifact.stream(
        data,
        safeWriter,
      ) as VendorStreamingArtifact<T>;
      return new StreamingArtifact(config, streamImpl);
    },
    validate(data: unknown) {
      return sdkArtifact.validate(data) as T;
    },
    isValid(data: unknown): data is T {
      return sdkArtifact.isValid(data);
    },
  };
}
