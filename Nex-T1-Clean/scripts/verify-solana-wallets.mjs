#!/usr/bin/env node

/**
 * Verification script to check Solana wallet provisioning status
 * 
 * This script queries the database to verify:
 * 1. How many users exist
 * 2. How many users have Solana wallets
 * 3. Which users are missing Solana wallets
 */

import { getSupabaseServiceClient } from './solana-wallet-utils.mjs';

const supabase = getSupabaseServiceClient();

async function verifySolanaWallets() {
  console.log('🔍 Verifying Solana Wallet Provisioning Status\n');
  console.log('='.repeat(60));

  try {
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('user')
      .select('id, primary_email, supabase_uid, created_at')
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('❌ Failed to fetch users:', usersError);
      throw usersError;
    }

    const totalUsers = users?.length || 0;
    console.log(`\n📊 Total users in database: ${totalUsers}\n`);

    if (totalUsers === 0) {
      console.log('ℹ️  No users found in database. Nothing to verify.');
      return;
    }

    // Get all Solana wallets
    const { data: solanaWallets, error: walletsError } = await supabase
      .from('user_wallets')
      .select('user_id, wallet_type, address, created_at')
      .in('wallet_type', ['thirdweb_solana_mainnet', 'thirdweb_solana_devnet'])
      .order('created_at', { ascending: false });

    if (walletsError) {
      console.error('❌ Failed to fetch Solana wallets:', walletsError);
      throw walletsError;
    }

    const totalSolanaWallets = solanaWallets?.length || 0;
    console.log(`📊 Total Solana wallets found: ${totalSolanaWallets}\n`);

    // Group wallets by user
    const walletsByUser = new Map();
    solanaWallets?.forEach(wallet => {
      if (!walletsByUser.has(wallet.user_id)) {
        walletsByUser.set(wallet.user_id, []);
      }
      walletsByUser.get(wallet.user_id).push(wallet);
    });

    // Analyze each user
    const usersWithSolana = new Set();
    const usersWithoutSolana = [];
    const usersWithPartialSolana = [];

    users?.forEach(user => {
      const userId = user.supabase_uid || user.id;
      const userWallets = walletsByUser.get(userId) || [];
      
      const hasMainnet = userWallets.some(w => w.wallet_type === 'thirdweb_solana_mainnet');
      const hasDevnet = userWallets.some(w => w.wallet_type === 'thirdweb_solana_devnet');

      if (hasMainnet && hasDevnet) {
        usersWithSolana.add(userId);
      } else if (hasMainnet || hasDevnet) {
        usersWithPartialSolana.push({
          user,
          wallets: userWallets,
          missing: hasMainnet ? 'devnet' : 'mainnet',
        });
      } else {
        usersWithoutSolana.push(user);
      }
    });

    // Print summary
    console.log('='.repeat(60));
    console.log('📊 Verification Summary');
    console.log('='.repeat(60));
    console.log(`Total users: ${totalUsers}`);
    console.log(`✅ Users with complete Solana wallets (mainnet + devnet): ${usersWithSolana.size}`);
    console.log(`⚠️  Users with partial Solana wallets: ${usersWithPartialSolana.length}`);
    console.log(`❌ Users without Solana wallets: ${usersWithoutSolana.length}`);
    console.log(`📦 Total Solana wallets: ${totalSolanaWallets} (expected: ${usersWithSolana.size * 2})\n`);

    // Show users without Solana wallets
    if (usersWithoutSolana.length > 0) {
      console.log('='.repeat(60));
      console.log('❌ Users Missing Solana Wallets:');
      console.log('='.repeat(60));
      usersWithoutSolana.slice(0, 20).forEach((user, idx) => {
        console.log(`   ${idx + 1}. ${user.primary_email || user.id} (ID: ${user.id})`);
      });
      if (usersWithoutSolana.length > 20) {
        console.log(`   ... and ${usersWithoutSolana.length - 20} more users`);
      }
      console.log('');
    }

    // Show users with partial wallets
    if (usersWithPartialSolana.length > 0) {
      console.log('='.repeat(60));
      console.log('⚠️  Users with Partial Solana Wallets:');
      console.log('='.repeat(60));
      usersWithPartialSolana.slice(0, 10).forEach((item, idx) => {
        console.log(`   ${idx + 1}. ${item.user.primary_email || item.user.id}`);
        console.log(`      Missing: ${item.missing}`);
        console.log(`      Has: ${item.wallets.map(w => w.wallet_type).join(', ')}`);
      });
      if (usersWithPartialSolana.length > 10) {
        console.log(`   ... and ${usersWithPartialSolana.length - 10} more users`);
      }
      console.log('');
    }

    // Show sample of users with complete wallets
    if (usersWithSolana.size > 0) {
      console.log('='.repeat(60));
      console.log('✅ Sample Users with Complete Solana Wallets:');
      console.log('='.repeat(60));
      const sampleUsers = Array.from(usersWithSolana).slice(0, 5);
      for (const userId of sampleUsers) {
        const user = users.find(u => (u.supabase_uid || u.id) === userId);
        const wallets = walletsByUser.get(userId) || [];
        console.log(`   ${user?.primary_email || userId}:`);
        wallets.forEach(wallet => {
          console.log(`      - ${wallet.wallet_type}: ${wallet.address}`);
        });
      }
      if (usersWithSolana.size > 5) {
        console.log(`   ... and ${usersWithSolana.size - 5} more users with complete wallets`);
      }
      console.log('');
    }

    // Get all wallet types for comparison
    const { data: allWallets, error: allWalletsError } = await supabase
      .from('user_wallets')
      .select('wallet_type')
      .order('created_at', { ascending: false });

    if (!allWalletsError && allWallets) {
      const walletTypeCounts = {};
      allWallets.forEach(w => {
        walletTypeCounts[w.wallet_type] = (walletTypeCounts[w.wallet_type] || 0) + 1;
      });

      console.log('='.repeat(60));
      console.log('📦 All Wallet Types in Database:');
      console.log('='.repeat(60));
      Object.entries(walletTypeCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, count]) => {
          const icon = type.includes('solana') ? '🟣' : type.includes('evm') ? '🔵' : '⚪';
          console.log(`   ${icon} ${type}: ${count}`);
        });
      console.log('');
    }

    // Final status
    console.log('='.repeat(60));
    if (usersWithoutSolana.length === 0 && usersWithPartialSolana.length === 0) {
      console.log('✅ SUCCESS: All users have complete Solana wallets!');
    } else if (usersWithoutSolana.length > 0) {
      console.log(`⚠️  ACTION NEEDED: ${usersWithoutSolana.length} users need Solana wallets provisioned.`);
      console.log(`   Run: pnpm backfill:solana`);
    } else {
      console.log(`⚠️  PARTIAL: Some users have incomplete Solana wallets.`);
    }
    console.log('='.repeat(60));
    console.log('');

  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  }
}

verifySolanaWallets().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
