export const init = () => undefined;
export const flush = async () => undefined;
export const close = async () => true;
export const lastEventId = () => null;

type SpanRunner<T> = () => T;

export const startSpan = <T>(options: UntypedJson, runner: SpanRunner<T>): T => {
  try {
    return runner();
  } catch (error) {
    throw error;
  }
};

export const withIsolationScope = <T>(runner: SpanRunner<T>): T => runner();

export const captureException = () => undefined;
export const captureMessage = () => undefined;
export const addBreadcrumb = () => undefined;
export const withScope = (callback: (scope: { setTag: () => void }) => void) => {
  callback({ setTag: () => undefined });
};

const mockSentry = {
  init,
  flush,
  close,
  startSpan,
  withIsolationScope,
  captureException,
  captureMessage,
  withScope,
  lastEventId,
};

export class BaseClient {}
export const getClient = () => undefined;
export const getSDKSource = () => "mock";
export const applySdkMetadata = () => undefined;
export const logger = {
  log: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

// Internal utilities required by @sentry/browser
export const normalizeToSize = () => "";
export const isEvent = () => false;
export const addExceptionMechanism = () => undefined;
export const resolvedSyncPromise = (val: UntypedJson) => Promise.resolve(val);
export const isErrorEvent = () => false;
export const isDOMError = () => false;
export const isDOMException = () => false;
export const addExceptionTypeValue = () => undefined;
export const isError = () => false;
export const isPlainObject = () => false;
export const isParameterizedString = () => false;
export const extractExceptionKeysForMessage = () => undefined;
export const GLOBAL_OBJ = globalThis;

export default mockSentry;
