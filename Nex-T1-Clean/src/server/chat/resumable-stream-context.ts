import { EventEmitter } from "node:events";

import {
  createResumableStreamContext as createGenericResumableStreamContext,
  type Publisher,
  type ResumableStreamContext,
  type Subscriber,
} from "resumable-stream/generic";
import { createResumableStreamContext as createIoredisResumableStreamContext } from "resumable-stream/ioredis";
import { after } from "next/server";

import { createIoredisClient } from "@/server/services/redis/factory";
import { isRedisInMemoryFallback, redis } from "@/server/services/redis";

const STREAM_KEY_PREFIX = "nex-chat-ui-stream";

declare global {
  var __nexChatResumableStreamContext: ResumableStreamContext | undefined;
  var __nexChatResumableStreamEmitter: EventEmitter | undefined;
}

function getEmitter(): EventEmitter {
  if (!globalThis.__nexChatResumableStreamEmitter) {
    globalThis.__nexChatResumableStreamEmitter = new EventEmitter();
  }

  return globalThis.__nexChatResumableStreamEmitter;
}

function registerWaitUntil(promise: Promise<unknown>): void {
  try {
    after(async () => {
      await promise;
    });
  } catch {
    void promise;
  }
}

function createInMemoryPublisher(): Publisher {
  const emitter = getEmitter();

  return {
    connect: async () => undefined,
    publish: async (channel, message) => {
      emitter.emit(channel, message);
      return emitter.listenerCount(channel);
    },
    set: async (key, value, options) => {
      await redis.set(key, value, { ex: options?.EX });
      return "OK";
    },
    get: async (key) => {
      const value = await redis.get<string | number>(key);
      return value ?? null;
    },
    incr: async (key) => redis.incr(key),
  };
}

function createInMemorySubscriber(): Subscriber {
  const emitter = getEmitter();
  const callbacks = new Map<string, (message: string) => void>();

  return {
    connect: async () => undefined,
    subscribe: async (channel, callback) => {
      callbacks.set(channel, callback);
      emitter.on(channel, callback);
    },
    unsubscribe: async (channel) => {
      const callback = callbacks.get(channel);
      if (!callback) {
        return;
      }

      emitter.off(channel, callback);
      callbacks.delete(channel);
    },
  };
}

function createResumableContext(): ResumableStreamContext {
  if (!isRedisInMemoryFallback) {
    const publisher = createIoredisClient();
    const subscriber = createIoredisClient();

    if (publisher && subscriber) {
      return createIoredisResumableStreamContext({
        waitUntil: registerWaitUntil,
        keyPrefix: STREAM_KEY_PREFIX,
        publisher,
        subscriber,
      });
    }
  }

  return createGenericResumableStreamContext({
    waitUntil: registerWaitUntil,
    keyPrefix: STREAM_KEY_PREFIX,
    publisher: createInMemoryPublisher(),
    subscriber: createInMemorySubscriber(),
  });
}

export function getChatResumableStreamContext(): ResumableStreamContext {
  if (!globalThis.__nexChatResumableStreamContext) {
    globalThis.__nexChatResumableStreamContext = createResumableContext();
  }

  return globalThis.__nexChatResumableStreamContext;
}
