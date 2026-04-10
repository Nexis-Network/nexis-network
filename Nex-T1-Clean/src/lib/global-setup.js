// Global setup for Node.js environment
// This ensures browser globals are available in server-side context

// Create a mock window.location object for server-side rendering
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

if (typeof globalThis !== 'undefined') {
  // Set up global references
  if (typeof global === 'undefined') {
    globalThis.global = globalThis;
  }
  if (typeof self === 'undefined') {
    globalThis.self = globalThis;
  }
  if (typeof window === 'undefined') {
    globalThis.window = {
      ...globalThis,
      location: mockLocation
    };
  }
}

if (typeof global !== 'undefined') {
  // Set up global references
  if (typeof global.self === 'undefined') {
    global.self = global;
  }
  if (typeof global.global === 'undefined') {
    global.global = global;
  }
  if (typeof global.window === 'undefined') {
    global.window = {
      ...global,
      location: mockLocation
    };
  }
}
