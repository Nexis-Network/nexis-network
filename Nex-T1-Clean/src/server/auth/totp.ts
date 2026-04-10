/**
 * TOTP (Time-based One-Time Password) implementation using Node.js crypto.
 *
 * Implements RFC 6238 (TOTP) and RFC 4226 (HOTP) using only Node.js built-in
 * crypto module. No external dependencies required.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc6238
 * @see https://datatracker.ietf.org/doc/html/rfc4226
 */

import { createHmac, randomBytes } from "node:crypto";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/** TOTP time step in seconds. */
const TOTP_PERIOD = 30;

/** Number of digits in the TOTP code. */
const TOTP_DIGITS = 6;

/** Base32 alphabet for secret encoding (RFC 4648). */
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/* ------------------------------------------------------------------ */
/*  Base32 encoding/decoding                                           */
/* ------------------------------------------------------------------ */

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let result = "";

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      result += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    result += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return result;
}

function base32Decode(input: string): Buffer {
  const cleaned = input.replace(/=+$/, "").toUpperCase();
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) {
      throw new Error(`Invalid base32 character: ${cleaned[i]}`);
    }
    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/* ------------------------------------------------------------------ */
/*  HOTP / TOTP core                                                   */
/* ------------------------------------------------------------------ */

function generateHotp(secret: Buffer, counter: bigint): string {
  // Convert counter to 8-byte big-endian buffer
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(counter);

  // HMAC-SHA1
  const hmac = createHmac("sha1", secret).update(counterBuffer).digest();

  // Dynamic truncation (RFC 4226 Section 5.3)
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = code % 10 ** TOTP_DIGITS;
  return otp.toString().padStart(TOTP_DIGITS, "0");
}

function getCurrentCounter(timestamp?: number): bigint {
  const seconds = Math.floor((timestamp ?? Date.now()) / 1000);
  return BigInt(Math.floor(seconds / TOTP_PERIOD));
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Generate a random TOTP secret encoded in base32.
 * Default 20 bytes (160 bits) of randomness.
 */
export function generateTotpSecret(bytes: number = 20): string {
  return base32Encode(randomBytes(bytes));
}

/**
 * Generate the current TOTP code for a given base32 secret.
 */
export function generateTotpCode(
  base32Secret: string,
  timestamp?: number,
): string {
  const secret = base32Decode(base32Secret);
  const counter = getCurrentCounter(timestamp);
  return generateHotp(secret, counter);
}

/**
 * Verify a TOTP code against a base32 secret.
 *
 * Checks the current time window and one window before/after to account
 * for clock skew (total window = +/- 30 seconds).
 */
export function verifyTotpCode(
  base32Secret: string,
  code: string,
  timestamp?: number,
): boolean {
  const secret = base32Decode(base32Secret);
  const counter = getCurrentCounter(timestamp);

  // Check current window and one window in each direction
  for (let offset = -1n; offset <= 1n; offset++) {
    const candidateCode = generateHotp(secret, counter + offset);
    if (timingSafeEqual(candidateCode, code)) {
      return true;
    }
  }

  return false;
}

/**
 * Generate the otpauth:// URI for QR code display.
 *
 * @param accountName - The user's account identifier (e.g., email)
 * @param issuer      - The application name (e.g., "Nex-T1")
 * @param base32Secret - The base32-encoded TOTP secret
 */
export function generateOtpauthUri(
  accountName: string,
  issuer: string,
  base32Secret: string,
): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(accountName);
  const params = new URLSearchParams({
    secret: base32Secret,
    issuer,
    algorithm: "SHA1",
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD),
  });

  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?${params.toString()}`;
}

/* ------------------------------------------------------------------ */
/*  Timing-safe string comparison                                      */
/* ------------------------------------------------------------------ */

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
