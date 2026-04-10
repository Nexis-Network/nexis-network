// Domain: notifications
// Responsibility: Generate VAPID keys for Web Push.
// Usage: pnpm tsx scripts/generate-vapid-keys.ts

import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();

process.stdout.write(
  [
    "VAPID_PUBLIC_KEY=\"" + keys.publicKey + "\"",
    "VAPID_PRIVATE_KEY=\"" + keys.privateKey + "\"",
    "VAPID_SUBJECT=\"mailto:team@nex-t1.ai\"",
    "",
  ].join("\n"),
);
