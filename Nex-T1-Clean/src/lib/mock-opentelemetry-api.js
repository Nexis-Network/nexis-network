// Mock @opentelemetry/api for Edge Runtime
const mockTracer = {
  startSpan: () => ({
    setStatus: () => {},
    setAttributes: () => {},
    addEvent: () => {},
    end: () => {},
  }),
  startActiveSpan: (name, fn) => fn({}),
};

const mockTrace = {
  getTracer: () => mockTracer,
  getActiveSpan: () => null,
  setSpan: () => {},
  withSpan: (span, fn) => fn(),
};

const mockContext = {
  active: () => ({}),
  with: (ctx, fn) => fn(),
  bind: (fn) => fn,
};

const mockDiag = {
  setLogger: () => {},
  setLogLevel: () => {},
  createConsoleLogger: () => ({
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  }),
};

// Mock SpanStatusCode enum
const SpanStatusCode = {
  UNSET: 0,
  OK: 1,
  ERROR: 2,
};

// Mock other commonly used exports
const SpanKind = {
  INTERNAL: 0,
  SERVER: 1,
  CLIENT: 2,
  PRODUCER: 3,
  CONSUMER: 4,
};

const TraceFlags = {
  NONE: 0,
  SAMPLED: 1,
};

const DiagLogLevel = {
  NONE: 0,
  ERROR: 30,
  WARN: 50,
  INFO: 60,
  DEBUG: 70,
  VERBOSE: 80,
  ALL: 9999,
};

// CommonJS export
module.exports = {
  trace: mockTrace,
  context: mockContext,
  diag: mockDiag,
  SpanStatusCode,
  SpanKind,
  TraceFlags,
  DiagLogLevel,
};

// ES Module export
export { 
  mockTrace as trace, 
  mockContext as context, 
  mockDiag as diag,
  SpanStatusCode,
  SpanKind,
  TraceFlags,
  DiagLogLevel,
};
const opentelemetryApiMock = {
  trace: mockTrace,
  context: mockContext,
  diag: mockDiag,
  SpanStatusCode,
  SpanKind,
  TraceFlags,
  DiagLogLevel,
};

export default opentelemetryApiMock;
