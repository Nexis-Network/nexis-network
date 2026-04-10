// Comprehensive window polyfill for server-side rendering
// This handles destructuring patterns like { protocol } = window.location

// Set up all browser globals first
if (typeof global !== 'undefined') {
  // Ensure global is available
  if (typeof globalThis !== 'undefined') {
    globalThis.global = global;
  }
}

if (typeof window === 'undefined') {
  // Create a comprehensive mock window object
  const mockLocation = {
    protocol: 'https:',
    host: 'localhost:3000',
    hostname: 'localhost',
    port: '3000',
    pathname: '/',
    search: '',
    hash: '',
    href: 'https://localhost:3000/',
    origin: 'https://localhost:3000',
    assign: () => {},
    replace: () => {},
    reload: () => {},
    toString: () => 'https://localhost:3000/'
  };

  // Create a proxy to handle destructuring
  const locationProxy = new Proxy(mockLocation, {
    get(target, prop) {
      if (prop in target) {
        return target[prop];
      }
      // Handle any missing properties gracefully
      return undefined;
    }
  });

         // Create a comprehensive document mock
         const mockDocument = {
           createElement: (tagName) => ({
             addEventListener: () => {},
             removeEventListener: () => {},
             setAttribute: () => {},
             getAttribute: () => null,
             appendChild: () => {},
             removeChild: () => {},
             style: {},
             tagName: tagName?.toUpperCase() || 'DIV',
             nodeType: 1,
             parentNode: null,
             childNodes: [],
             textContent: '',
             innerHTML: '',
             className: '',
             id: '',
           }),
           addEventListener: () => {},
           removeEventListener: () => {},
           querySelector: () => null,
           querySelectorAll: () => [],
           getElementById: () => null,
           getElementsByClassName: () => [],
           getElementsByTagName: () => [],
           createTextNode: (text) => ({
             textContent: text,
             nodeType: 3,
             parentNode: null,
             appendChild: () => {},
             removeChild: () => {},
           }),
           body: {
             appendChild: () => {},
             removeChild: () => {},
             insertBefore: () => {},
             replaceChild: () => {},
             style: {},
             tagName: 'BODY',
             nodeType: 1,
             parentNode: null,
             childNodes: [],
           },
           head: {
             appendChild: () => {},
             removeChild: () => {},
             insertBefore: () => {},
             replaceChild: () => {},
             style: {},
             tagName: 'HEAD',
             nodeType: 1,
             parentNode: null,
             childNodes: [],
           },
           title: 'Nex-T1',
           cookie: '',
           location: locationProxy,
         };

  // Set up global window object
  global.window = {
    location: locationProxy,
    document: mockDocument,
    addEventListener: () => {},
    removeEventListener: () => {},
    setTimeout: global.setTimeout,
    clearTimeout: global.clearTimeout,
    setInterval: global.setInterval,
    clearInterval: global.clearInterval,
    fetch: global.fetch,
    navigator: {
      userAgent: 'Node.js',
      platform: 'Node.js',
    },
    console: global.console,
  };

  // Set up document global
  global.document = mockDocument;

// Set up self global
global.self = global.window;

// Ensure self is available in all contexts
if (typeof self === 'undefined') {
  global.self = global.window;
}

// Mock sonner library for server-side rendering
global.sonner = {
  toast: () => {},
  Toaster: () => null,
  toast: {
    success: () => {},
    error: () => {},
    warning: () => {},
    info: () => {},
    loading: () => {},
    dismiss: () => {},
    promise: () => {},
  }
};

// Also set up globalThis references
if (typeof globalThis !== 'undefined') {
  globalThis.window = global.window;
  globalThis.document = global.document;
  globalThis.self = global.self;
  globalThis.sonner = global.sonner;
}
}
