// Global polyfill for self variable
// This ensures self is available in all contexts including webpack bundles

if (typeof global !== 'undefined') {
  // Ensure global is available
  if (typeof globalThis !== 'undefined') {
    globalThis.global = global;
  }
}

// Set up self global if not defined
if (typeof self === 'undefined') {
  if (typeof global !== 'undefined') {
    global.self = global.window || global;
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.self = globalThis.window || globalThis;
  }
}

// Ensure self is available in all contexts
if (typeof self === 'undefined') {
  // Create a minimal self object
  const selfObj = {
    window: typeof window !== 'undefined' ? window : {},
    document: typeof document !== 'undefined' ? document : {},
    location: typeof location !== 'undefined' ? location : {},
    navigator: typeof navigator !== 'undefined' ? navigator : {},
    console: typeof console !== 'undefined' ? console : {},
    setTimeout: typeof setTimeout !== 'undefined' ? setTimeout : () => {},
    clearTimeout: typeof clearTimeout !== 'undefined' ? clearTimeout : () => {},
    setInterval: typeof setInterval !== 'undefined' ? setInterval : () => {},
    clearInterval: typeof clearInterval !== 'undefined' ? clearInterval : () => {},
    fetch: typeof fetch !== 'undefined' ? fetch : () => Promise.resolve(),
  };

  if (typeof global !== 'undefined') {
    global.self = selfObj;
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.self = selfObj;
  }
  if (typeof window !== 'undefined') {
    window.self = selfObj;
  }
}