// Domain: push
// Responsibility: Base64URL helpers for Web Push.
// Notes: Browser-only for PushManager applicationServerKey conversion.

export function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padded = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  const base64 = padded + "=".repeat(padLength);

  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    out[i] = raw.charCodeAt(i);
  }
  return out;
}

export function toArrayBuffer(input: Uint8Array): ArrayBuffer {
  const buffer = input.buffer;
  if (buffer instanceof ArrayBuffer) {
    return buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
  }
  // Fallback for platforms where `buffer` is typed as ArrayBufferLike (e.g. SharedArrayBuffer).
  const copy = new Uint8Array(input.byteLength);
  copy.set(input);
  return copy.buffer;
}
