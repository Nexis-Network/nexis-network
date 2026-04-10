// Global self polyfill - must be loaded first
(function() {
  'use strict';
  
  // Define self in all possible global contexts
  if (typeof self === 'undefined') {
    if (typeof globalThis !== 'undefined') {
      globalThis.self = globalThis.self || globalThis.window || globalThis;
    }
    if (typeof global !== 'undefined') {
      global.self = global.self || global.window || global;
    }
    if (typeof window !== 'undefined') {
      window.self = window.self || window;
    }
    if (typeof globalThis !== 'undefined') {
      globalThis.self = globalThis.self || globalThis.window || globalThis;
    }
  }
  
  // Also define it on the global object
  if (typeof global !== 'undefined' && typeof global.self === 'undefined') {
    global.self = global.self || global.window || global;
  }
  
  // Ensure it's available everywhere
  if (typeof self === 'undefined') {
    if (typeof globalThis !== 'undefined') {
      globalThis.self = globalThis.self || globalThis.window || globalThis;
    } else if (typeof global !== 'undefined') {
      global.self = global.self || global.window || global;
    } else if (typeof window !== 'undefined') {
      window.self = window.self || window;
    }
  }
})();






