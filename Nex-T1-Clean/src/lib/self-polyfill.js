// Self polyfill for Node.js environment
// Define self immediately
if (typeof self === 'undefined') {
  if (typeof globalThis !== 'undefined') {
    globalThis.self = globalThis.self || globalThis.window || globalThis;
  } else if (typeof global !== 'undefined') {
    global.self = global.self || global.window || global;
  } else if (typeof window !== 'undefined') {
    window.self = window.self || window;
  }
}

// Ensure self is available in all contexts
if (typeof self === 'undefined') {
  if (typeof globalThis !== 'undefined') {
    globalThis.self = globalThis.self || globalThis.window || globalThis;
  } else if (typeof global !== 'undefined') {
    global.self = global.self || global.window || global;
  } else if (typeof window !== 'undefined') {
    window.self = window.self || window;
  }
}

module.exports = typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : (typeof global !== 'undefined' ? global : (typeof window !== 'undefined' ? window : {})));
