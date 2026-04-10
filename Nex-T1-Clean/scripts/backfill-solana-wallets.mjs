#!/usr/bin/env node

/**
 * Backfill script to provision Solana wallets for existing users
 * 
 * This script:
 * 1. Queries all users from the database
 * 2. For each user, attempts to provision Solana wallets
 * 3. Logs progress and handles errors gracefully
 * 4. Supports dry-run mode and batching
 * 
 * Usage:
 *   pnpm tsx scripts/backfill-solana-wallets.mjs [--dry-run] [--batch-size=10] [--delay=1000]
 */

import { getSupabaseServiceClient } from './solana-wallet-utils.mjs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const batchSize = parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '10', 10);
const delayMs = parseInt(args.find(arg => arg.startsWith('--delay='))?.split('=')[1] || '1000', 10);

const supabase = getSupabaseServiceClient();

// Call the admin API endpoint for backfilling
async function callBackfillAPI(options) {
  const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const adminToken = process.env.ADMIN_API_TOKEN;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  // Prefer service role key for script execution, fallback to admin token
  let authHeader;
  if (serviceRoleKey) {
    authHeader = `ServiceRole ${serviceRoleKey}`;
  } else if (adminToken) {
    authHeader = `Bearer ${adminToken}`;
  } else {
    throw new Error('Either ADMIN_API_TOKEN or SUPABASE_SERVICE_ROLE_KEY environment variable is required.');
  }
  
  // Add timeout and better error handling
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 600000); // 10 minute timeout for backfill (33 users can take time)
  
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
      throw new Error(`Request timed out. The server may be slow or not responding. Check if your Next.js server is running at ${apiUrl}`);
    }
    
    if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
      throw new Error(`Cannot connect to server at ${apiUrl}. Make sure your Next.js server is running (pnpm dev)`);
    }
    
    throw error;
  }
}

async function getAllUsers() {
  console.log('📊 Fetching all users from database...');
  
  const { data: users, error } = await supabase
    .from('user')
    .select('id, primary_email, supabase_uid')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Failed to fetch users:', error);
    throw error;
  }

  console.log(`✅ Found ${users.length} users`);
  return users || [];
}

async function getUserExistingWallets(userId) {
  const { data, error } = await supabase
    .from('user_wallets')
    .select('wallet_type, address')
    .eq('user_id', userId)
    .in('wallet_type', ['thirdweb_solana_mainnet', 'thirdweb_solana_devnet']);

  if (error) {
    console.warn(`⚠️  Failed to check existing wallets for user ${userId}:`, error.message);
    return [];
  }

  return data || [];
}

// This function is no longer used - we call the API endpoint instead

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('🚀 Solana Wallet Backfill Script\n');
  console.log('📝 Note: This script calls the admin API endpoint at /api/admin/backfill-solana-wallets');
  console.log('   Make sure your Next.js server is running and ADMIN_API_TOKEN is set.\n');
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  console.log(`Configuration:`);
  console.log(`  Batch size: ${batchSize}`);
  console.log(`  Dry run: ${dryRun ? 'Yes' : 'No'}\n`);

  try {
    console.log('🔄 Calling backfill API endpoint...\n');
    
    const result = await callBackfillAPI({
      dryRun,
      batchSize,
    });

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Backfill Summary');
    console.log('='.repeat(60));
    console.log(`Total users: ${result.total ?? 0}`);
    console.log(`✅ Successfully provisioned: ${result.success ?? 0}`);
    console.log(`⏭️  Skipped (already have wallets): ${result.skipped ?? 0}`);
    console.log(`❌ Failed: ${result.failed ?? 0}`);
    
    if (result.message) {
      console.log(`\nℹ️  ${result.message}`);
    }

    if (result.errors && result.errors.length > 0) {
      console.log(`\n❌ Errors encountered:`);
      result.errors.slice(0, 10).forEach((err, idx) => {
        console.log(`   ${idx + 1}. ${err.userId ? `User ${err.userId}: ` : ''}${err.error}`);
      });
      if (result.errors.length > 10) {
        console.log(`   ... and ${result.errors.length - 10} more errors`);
      }
    }

    console.log('\n✨ Backfill complete!\n');

    if (dryRun) {
      console.log('ℹ️  This was a dry run. Run without --dry-run to actually provision wallets.\n');
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    console.error('\n💡 Make sure:');
    console.error('   1. Your Next.js server is running (pnpm dev)');
    console.error('   2. Either ADMIN_API_TOKEN or SUPABASE_SERVICE_ROLE_KEY is set');
    console.error('   3. You have admin access to the application (if using ADMIN_API_TOKEN)');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
