// Polyfills for browser globals in Node.js environment
const globalObj = globalThis || global || {};

// Set up global references
if (typeof global !== 'undefined') {
  global.global = globalObj;
  global.self = globalObj;
  global.window = globalObj;
}

// Set up globalThis references
if (typeof globalThis !== 'undefined') {
  globalThis.global = globalObj;
  globalThis.self = globalObj;
  globalThis.window = globalObj;
}

// Export the polyfills
module.exports = globalObj;
