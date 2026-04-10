import { logger } from '@/lib/logger';

// Safe window access utilities for server-side rendering

export function getWindowLocation() {
  if (typeof window === 'undefined') {
    return {
      protocol: 'https:',
      host: 'localhost:3000',
      hostname: 'localhost',
      port: '3000',
      pathname: '/',
      search: '',
      hash: '',
      href: 'https://localhost:3000/',
      origin: 'https://localhost:3000',
    };
  }
  
  return {
    protocol: window.location.protocol,
    host: window.location.host,
    hostname: window.location.hostname,
    port: window.location.port,
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
    href: window.location.href,
    origin: window.location.origin,
  };
}

export function safeWindowAccess<T>(callback: () => T, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback;
  }
  
  try {
    return callback();
  } catch (error) {
    logger.warn('Window access failed:', error);
    return fallback;
  }
}

export function isClientSide(): boolean {
  return typeof window !== 'undefined';
}

export function isServerSide(): boolean {
  return typeof window === 'undefined';
}
