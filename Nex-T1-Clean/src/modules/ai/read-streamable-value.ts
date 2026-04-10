const STREAMABLE_VALUE_TYPE = Symbol.for("ui.streamable.value");

type StreamableRow<T> = {
  type: typeof STREAMABLE_VALUE_TYPE;
  curr?: T;
  next?: StreamableRow<T> | PromiseLike<StreamableRow<T>>;
  diff?: [number, string];
  error?: unknown;
};

/**
 * createStreamableValue – lightweight async-iterable stream with update/done.
 * Designed to be compatible with our readStreamableValue helper.
 */
export function createStreamableValue<T>(initial?: T) {
  const queue: Array<T | undefined> = [];
  if (initial !== undefined) queue.push(initial);

  let done = false;
  const waiting: Array<(result: IteratorResult<T | undefined>) => void> = [];

  const flush = () => {
    while (waiting.length > 0 && queue.length > 0) {
      const resolver = waiting.shift()!;
      const value = queue.shift();
      resolver({ value, done: false });
    }
    if (done && waiting.length > 0) {
      const resolver = waiting.shift()!;
      resolver({ value: undefined, done: true });
    }
  };

  const iterator = {
    [Symbol.asyncIterator]() {
      return {
        next(): Promise<IteratorResult<T | undefined>> {
          if (queue.length > 0) {
            const value = queue.shift();
            return Promise.resolve({ value, done: false });
          }
          if (done) {
            return Promise.resolve({ value: undefined, done: true });
          }
          return new Promise((resolve) => waiting.push(resolve));
        },
      };
    },
    type: STREAMABLE_VALUE_TYPE,
  } as StreamableRow<T>;

  const update = (value: T) => {
    queue.push(value);
    flush();
  };

  const finish = (final?: T) => {
    if (final !== undefined) queue.push(final);
    done = true;
    flush();
  };

  return { value: iterator, update, done: finish };
}

function isStreamableValue<T>(value: unknown): value is StreamableRow<T> {
  return (
    value != null &&
    typeof value === "object" &&
    "type" in value &&
    (value as { type?: unknown }).type === STREAMABLE_VALUE_TYPE
  );
}

/**
 * AI SDK's server bundle does not export readStreamableValue, so we replicate the
 * reference implementation here to keep server and client code sharing the same helper.
 */
export function readStreamableValue<T>(streamableValue: unknown) {
  // New path: anything implementing AsyncIterable is returned directly.
  const maybeAsyncIterable =
    streamableValue &&
    (typeof streamableValue === "object" || typeof streamableValue === "function")
      ? (streamableValue as { [Symbol.asyncIterator]?: unknown })
      : null;

  if (typeof maybeAsyncIterable?.[Symbol.asyncIterator] === "function") {
    const original = streamableValue as AsyncIterable<T>;
    return {
      async *[Symbol.asyncIterator]() {
        let lastString: string | null = null;
        for await (const val of original) {
          let nextVal = val as T;
          if (typeof nextVal === "string") {
            if (lastString && !nextVal.startsWith(lastString)) {
              nextVal = (lastString + nextVal) as T;
            }
            lastString = nextVal as string;
          }
          yield nextVal;
        }
      },
    } as AsyncIterable<T>;
  }

  if (!isStreamableValue<T>(streamableValue)) {
    throw new Error(
      "Invalid value: this helper only accepts values created via `createStreamableValue`.",
    );
  }

  return {
    [Symbol.asyncIterator]() {
      let row: StreamableRow<T> | PromiseLike<StreamableRow<T>> = streamableValue;
      let value = (streamableValue as StreamableRow<T>).curr as T | undefined;
      let isDone = false;
      let isFirstIteration = true;
      let lastStringValue: string | null = typeof value === "string" ? value : null;

      return {
        async next(): Promise<IteratorResult<T | undefined>> {
          if (isDone) {
            return { value, done: true };
          }

          const resolved = await row;
          if (resolved.error !== undefined) {
            throw resolved.error;
          }

          if ("curr" in resolved || resolved.diff) {
            if (resolved.diff) {
              const diff = resolved.diff;
              if (diff && diff[0] === 0) {
                if (typeof value !== "string") {
                  throw new Error(
                    "Invalid patch: can only append to string types. This is a bug in the AI SDK.",
                  );
                }
                value = (value + diff[1]) as T;
              }
            } else {
              value = resolved.curr;
            }

            // Normalize string streams to cumulative values to satisfy clients expecting full text
            if (typeof value === "string") {
              if (lastStringValue && !value.startsWith(lastStringValue)) {
                lastStringValue = `${lastStringValue}${value}`;
                value = lastStringValue as T;
              } else {
                lastStringValue = value;
              }
            }

            if (!resolved.next) {
              isDone = true;
              return { value, done: false };
            }
          }

          if (resolved.next === undefined) {
            return { value, done: true };
          }

          row = resolved.next;
          if (isFirstIteration) {
            isFirstIteration = false;
            if (value === undefined) {
              return this.next();
            }
          }

          return { value, done: false };
        },
      } satisfies AsyncIterator<T | undefined>;
    },
  } satisfies AsyncIterable<T | undefined>;
}
