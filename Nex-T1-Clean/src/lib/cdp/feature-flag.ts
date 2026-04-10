"use client";

const CDP_FLAG_ENABLED = (process.env.NEXT_PUBLIC_ENABLE_CDP_WALLETS ?? "").trim().toLowerCase() === "true";
const CDP_PROJECT_ID_CONFIGURED = (process.env.NEXT_PUBLIC_CDP_PROJECT_ID ?? "").trim().length > 0;

// Nex Wallet APIs enforce strict browser origin allowlists.
// In local development, this often causes CORS failures unless localhost is
// explicitly allowlisted in the Coinbase Developer Platform project.
const CDP_DEV_OPT_IN = (process.env.NEXT_PUBLIC_CDP_ENABLE_IN_DEV ?? "").trim().toLowerCase() === "true";
const IS_DEV = process.env.NODE_ENV !== "production";

export const CDP_EMBEDDED_ENABLED =
  CDP_FLAG_ENABLED &&
  CDP_PROJECT_ID_CONFIGURED &&
  (!IS_DEV || CDP_DEV_OPT_IN);
