import { getNexAdminAccount } from "@/modules/wallets/nex/admin";

export function getDelegatedSigner() {
  // In practice, you might expose limited signing via an internal RPC instead of returning account directly.
  return getNexAdminAccount();
}

