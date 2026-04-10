
import dotenv from "dotenv";

import { logger } from '@/lib/logger';
dotenv.config({ path: ".env.local" }); 
dotenv.config({ path: ".env" });

async function main() {
  const { getSupabaseAdminClient } = await import("@/server/services/supabase/supabase-admin");
  // const { resolveUserWallets } = await import("@/server/wallets/user-wallets"); // Fails in script due to cookies

  const targetUserId = process.argv.find(arg => arg.startsWith("--user="))?.split("=")[1];

  if (!targetUserId) {
     logger.debug("No user specified.");
     return;
  }

  const supabase = getSupabaseAdminClient();
  logger.debug(`Checking DB for user: ${targetUserId}`);
  
  const { data: wallets, error } = await supabase
    .from("wallet_accounts")
    .select("chain_id, wallet_type, address, safe_address, status, metadata")
    .eq("user_id", targetUserId)
    .in("wallet_type", ["safe", "smart_wallet"]);

  if (error) {
      logger.error("DB Error:", error);
      return;
  }

  logger.debug(`Found ${wallets.length} safe/smart_wallet records.`);
  // console.table is preserved for CLI scripts as it provides formatted output
   
  console.table(wallets.map(w => ({
      id: `safe:${w.chain_id}`,
      address: w.address,
      safe_address: w.safe_address, // CRITICAL: Check if this is null
      status: w.status
  })));
}

main().catch(logger.error);
