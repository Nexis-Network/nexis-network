// Domain: notifications
// Responsibility: Server-only Web Push (VAPID) configuration.
// Depends on: process.env
// Notes:
// - Never log private keys.
// - Public key may be returned to clients via an authenticated endpoint.

export type VapidConfig = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

export function getVapidConfig(): VapidConfig | null {
  const publicKey = readEnv("VAPID_PUBLIC_KEY");
  const privateKey = readEnv("VAPID_PRIVATE_KEY");
  const subject = readEnv("VAPID_SUBJECT");

  if (!publicKey || !privateKey || !subject) {
    if (process.env.NODE_ENV === "production") {
      // Fail fast in prod if push is expected to work.
      // If you want to disable push in prod, leave these unset and callers should handle null.
      return null;
    }
    return null;
  }

  return { publicKey, privateKey, subject };
}

export function requireVapidConfig(): VapidConfig {
  const cfg = getVapidConfig();
  if (!cfg) {
    throw new Error("Missing VAPID config (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT)");
  }
  return cfg;
}
