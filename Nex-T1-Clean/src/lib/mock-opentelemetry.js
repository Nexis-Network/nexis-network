// Mock OpenTelemetry modules to prevent Edge Runtime errors
// This replaces the real OpenTelemetry modules with no-op implementations

// Common mock implementations
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

// Support both CommonJS and ES modules
const mockApi = {
  trace: mockTrace,
  context: mockContext,
  diag: mockDiag,
};

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  // CommonJS
  module.exports = mockApi;
  module.exports.trace = mockTrace;
  module.exports.context = mockContext;
  module.exports.diag = mockDiag;
} else if (typeof exports !== 'undefined') {
  // CommonJS alternative
  exports.trace = mockTrace;
  exports.context = mockContext;
  exports.diag = mockDiag;
}

// ES Module support
if (typeof globalThis !== 'undefined') {
  globalThis.__opentelemetry_mock__ = mockApi;
}

// Default export for ES modules
export default mockApi;
export { mockTrace as trace, mockContext as context, mockDiag as diag };
