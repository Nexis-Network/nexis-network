// Mock @opentelemetry/core for Edge Runtime
const NoopTracer = class NoopTracer {
  startSpan() {
    return {
      setStatus: () => {},
      setAttributes: () => {},
      addEvent: () => {},
      end: () => {},
    };
  }
};

const NoopSpan = class NoopSpan {
  setStatus() {}
  setAttributes() {}
  addEvent() {}
  end() {}
};

// CommonJS export
module.exports = {
  NoopTracer,
  NoopSpan,
};

// ES Module export
export { NoopTracer, NoopSpan };
const opentelemetryCoreMock = {
  NoopTracer,
  NoopSpan,
};

export default opentelemetryCoreMock;
