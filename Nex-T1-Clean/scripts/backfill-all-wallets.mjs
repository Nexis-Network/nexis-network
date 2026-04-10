#!/usr/bin/env node

/**
 * Backfill script to provision ALL wallet types for existing users:
 * - 1 EVM wallet (supports all EVM chains)
 * - 1 Solana Mainnet wallet
 * - 1 Solana Devnet wallet
 * 
 * This script:
 * 1. Queries all users from the database
 * 2. Checks which wallets each user already has
 * 3. Provisions missing wallets via the admin API
 * 4. Reports detailed progress and results
 * 
 * Usage:
 *   node scripts/backfill-all-wallets.mjs [options]
 *   # or
 *   npx tsx scripts/backfill-all-wallets.mjs [options]
 * 
 * Options:
 *   --dry-run          Preview changes without making them
 *   --batch-size=N     Process N users at a time (default: 10)
 *   --user-id=UUID     Process a single user by ID
 *   --evm-only         Only provision EVM wallets
 *   --solana-only      Only provision Solana wallets
 *   --verbose          Show detailed logs
 * 
 * Environment:
 *   NEXT_PUBLIC_APP_URL      - App URL (default: http://localhost:3000)
 *   SUPABASE_SERVICE_ROLE_KEY - Required for authentication
 *   ADMIN_API_TOKEN          - Alternative auth method
 */

import { getSupabaseServiceClient } from './solana-wallet-utils.mjs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const verbose = args.includes('--verbose');
const evmOnly = args.includes('--evm-only');
const solanaOnly = args.includes('--solana-only');
const batchSize = parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '10', 10);
const singleUserId = args.find(arg => arg.startsWith('--user-id='))?.split('=')[1];

// Determine which wallet types to provision
function getWalletTypes() {
  if (evmOnly) return ['evm'];
  if (solanaOnly) return ['solana_mainnet', 'solana_devnet'];
  return ['evm', 'solana_mainnet', 'solana_devnet'];
}

const supabase = getSupabaseServiceClient();

// Call the admin API endpoint for backfilling
async function callBackfillAPI(options) {
  const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminToken = process.env.ADMIN_API_TOKEN;
  
  let authHeader;
  if (serviceRoleKey) {
    authHeader = `ServiceRole ${serviceRoleKey}`;
  } else if (adminToken) {
    authHeader = `Bearer ${adminToken}`;
  } else {
    throw new Error('Either ADMIN_API_TOKEN or SUPABASE_SERVICE_ROLE_KEY environment variable is required.');
  }
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 600000); // 10 minute timeout
  
  try {
    const response = await fetch(`${apiUrl}/api/admin/backfill-solana-wallets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(options),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unable to read error response');
      throw new Error(`API returned ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeout);
    
    if (error.name === 'AbortError' || error.code === 'UND_ERR_HEADERS_TIMEOUT') {
      throw new Error(`Request timed out. Check if your Next.js server is running at ${apiUrl}`);
    }
    
    if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
      throw new Error(`Cannot connect to server at ${apiUrl}. Make sure your Next.js server is running (pnpm dev)`);
    }
    
    throw error;
  }
}

async function checkExistingWallets(userId) {
  const { data, error } = await supabase
    .from('user_wallets')
    .select('wallet_type, address')
    .eq('user_id', userId)
    .like('wallet_type', 'thirdweb_%');

  if (error) {
    console.warn(`⚠️  Failed to check existing wallets for user ${userId}:`, error.message);
    return { evm: false, solanaMainnet: false, solanaDevnet: false };
  }

  return {
    evm: data?.some(w => w.wallet_type === 'thirdweb_evm') ?? false,
    solanaMainnet: data?.some(w => w.wallet_type === 'thirdweb_solana_mainnet') ?? false,
    solanaDevnet: data?.some(w => w.wallet_type === 'thirdweb_solana_devnet') ?? false,
    hyperliquid: data?.some(w => w.wallet_type === 'thirdweb_hyperliquid') ?? false,
  };
}

async function getUserCount() {
  const { count, error } = await supabase
    .from('user')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error('❌ Failed to count users:', error);
    return 0;
  }
  return count || 0;
}

async function main() {
  console.log('\n🚀 Comprehensive Wallet Backfill Script\n');
  console.log('═'.repeat(60));
  
  const walletTypes = getWalletTypes();
  console.log(`\n📋 Configuration:`);
  console.log(`   Wallet types: ${walletTypes.join(', ')}`);
  console.log(`   Batch size: ${batchSize}`);
  console.log(`   Dry run: ${dryRun ? 'Yes' : 'No'}`);
  console.log(`   Verbose: ${verbose ? 'Yes' : 'No'}`);
  if (singleUserId) {
    console.log(`   Target user: ${singleUserId}`);
  }

  if (dryRun) {
    console.log('\n🔍 DRY RUN MODE - No changes will be made\n');
  }

  // If processing a single user, show their current wallet status
  if (singleUserId) {
    console.log('\n📊 Checking existing wallets for user...');
    const existing = await checkExistingWallets(singleUserId);
    console.log(`   EVM wallet: ${existing.evm ? '✅' : '❌'}`);
    console.log(`   Solana Mainnet: ${existing.solanaMainnet ? '✅' : '❌'}`);
    console.log(`   Solana Devnet: ${existing.solanaDevnet ? '✅' : '❌'}`);
    console.log(`   Hyperliquid: ${existing.hyperliquid ? '✅' : '❌'}`);
  } else {
    const userCount = await getUserCount();
    console.log(`\n👥 Found ${userCount} users in database`);
  }

  console.log('\n🔄 Calling backfill API endpoint...\n');

  try {
    const result = await callBackfillAPI({
      dryRun,
      batchSize,
      userId: singleUserId,
      walletTypes,
    });

    // Print summary
    console.log('\n' + '═'.repeat(60));
    console.log('📊 BACKFILL SUMMARY');
    console.log('═'.repeat(60));
    
    if (singleUserId) {
      // Single user result
      console.log(`\nUser ID: ${result.userId}`);
      if (result.wallets) {
        console.log(`\nWallets provisioned:`);
        console.log(`   EVM: ${result.wallets.evm}`);
        console.log(`   Solana Mainnet: ${result.wallets.solanaMainnet}`);
        console.log(`   Solana Devnet: ${result.wallets.solanaDevnet}`);
        console.log(`   Hyperliquid: ${result.wallets.hyperliquid}`);
      }
      if (result.solanaError) {
        console.log(`\n⚠️  Solana Error: ${result.solanaError}`);
      }
    } else {
      // Batch result
      console.log(`\nTotal users: ${result.total ?? 0}`);
      console.log(`✅ Fully provisioned: ${result.success ?? 0}`);
      console.log(`⚡ Partially provisioned: ${result.partial ?? 0}`);
      console.log(`⏭️  Skipped (already complete): ${result.skipped ?? 0}`);
      console.log(`❌ Failed: ${result.failed ?? 0}`);
      
      if (result.walletTotals) {
        console.log(`\n📦 Wallet totals created:`);
        console.log(`   EVM: ${result.walletTotals.evm}`);
        console.log(`   Solana Mainnet: ${result.walletTotals.solanaMainnet}`);
        console.log(`   Solana Devnet: ${result.walletTotals.solanaDevnet}`);
        console.log(`   Hyperliquid: ${result.walletTotals.hyperliquid}`);
      }
    }

    if (result.message) {
      console.log(`\nℹ️  ${result.message}`);
    }

    if (result.errors && result.errors.length > 0) {
      console.log(`\n❌ Errors encountered:`);
      const maxErrors = verbose ? result.errors.length : Math.min(10, result.errors.length);
      result.errors.slice(0, maxErrors).forEach((err, idx) => {
        console.log(`   ${idx + 1}. User ${err.userId || 'unknown'}:`);
        console.log(`      ${err.error}`);
        if (err.walletCounts && verbose) {
          console.log(`      Wallets: ${JSON.stringify(err.walletCounts)}`);
        }
      });
      if (result.errors.length > maxErrors) {
        console.log(`   ... and ${result.errors.length - maxErrors} more errors (use --verbose to see all)`);
      }
    }

    console.log('\n✨ Backfill complete!\n');

    if (dryRun) {
      console.log('ℹ️  This was a dry run. Run without --dry-run to provision wallets.\n');
    }

    // Provide next steps
    console.log('📝 Next steps:');
    console.log('   1. Verify wallets in Settings > Wallets page');
    console.log('   2. Check /api/nex/wallets/summary for API verification');
    console.log('   3. Review any failed users and retry if needed\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Is your Next.js server running? (pnpm dev)');
    console.error('   2. Is SUPABASE_SERVICE_ROLE_KEY set in .env.local?');
    console.error('   3. Is ENABLE_THIRDWEB_SERVER_PROVISIONING=true?');
    console.error('   4. Are THIRDWEB_SERVICE_KEY and THIRDWEB_WALLET_SECRET_SALT set?');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
