/**
 * Lightweight Base64 ⇄ ArrayBuffer helpers that avoid relying on Node Buffer.
 * Works in browsers and Node (if btoa/atob are polyfilled by Next.js runtime).
 */

function ensureAtob(): (value: string) => string {
  if (typeof atob !== "undefined") return atob;
  // Minimal fallback using global Buffer if available (SSR safety)
  if (typeof Buffer !== "undefined") {
    return (value: string) => Buffer.from(value, "base64").toString("binary");
  }
  throw new Error("Base64 decode not available in this environment");
}

function ensureBtoa(): (value: string) => string {
  if (typeof btoa !== "undefined") return btoa;
  if (typeof Buffer !== "undefined") {
    return (value: string) => Buffer.from(value, "binary").toString("base64");
  }
  throw new Error("Base64 encode not available in this environment");
}

const _atob = ensureAtob();
const _btoa = ensureBtoa();

export function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return _btoa(binary);
}

export function base64ToUint8Array(value: string): Uint8Array {
  const binary = _atob(value);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function stringToUint8Array(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

export function uint8ArrayToString(value: Uint8Array): string {
  return new TextDecoder().decode(value);
}
