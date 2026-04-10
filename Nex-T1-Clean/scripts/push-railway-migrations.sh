#!/bin/bash
# Supabase Railway Migration Script
# Run from: /Users/0xnexis/Downloads/Nexis-Network/Nex-T1-Enterprise

set -euo pipefail

if [ -f ".env.local" ]; then
  set -a
  # shellcheck disable=SC1091
  source ".env.local"
  set +a
fi

if [ -f ".env" ]; then
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
fi

DB_URL="${DATABASE_URL_UNPOOLED:-${RAILWAY_DATABASE_URL:-${DATABASE_URL:-}}}"
if [ -z "$DB_URL" ]; then
  echo "Set DATABASE_URL_UNPOOLED, RAILWAY_DATABASE_URL, or DATABASE_URL before running this script."
  exit 1
fi

MIGRATIONS_DIR="supabase/migrations"

# ============================================================
# STEP 1: Check current migration state
# ============================================================
echo "=== Checking current migration state ==="
psql "$DB_URL" -c "SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;"

# ============================================================
# STEP 2: Run migrations in order (skip placeholders)
# Note: Run each command individually if needed
# ============================================================

# --- Core migrations (real SQL) ---

# RLS Hardening
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251019155243_rls-hardening.sql"

# Agent Launchpad
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251026_agent_launchpad.sql"

# Strategy Builder
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251027_strategy_builder.sql"

# Fix Attestation Policy RLS
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251028080000_fix_attestation_policy_rls.sql"

# Supabase Lint Fixes
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251028090000_supabase_lint_fixes.sql"

# Strategy Builder Constraints
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251028110000_strategy_builder_constraints.sql"

# Performance Rollup
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251028123000_performance_rollup.sql"

# Trade Alerts
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251028124500_trade_alerts.sql"

# App Private Grants
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251028140000_app_private_grants.sql"

# Auto Workspace Provisioning
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251029113000_auto_workspace_provisioning.sql"

# FK Indexes Auth Wallet
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251030163000_fk_indexes_auth_wallet.sql"

# Drop Duplicate Wallet Position Index
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251030170000_drop_duplicate_wallet_position_index.sql"

# RLS Initplan Fix
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251030170500_rls_initplan_fix.sql"

# User Role Enum
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251031194500_userrole_enum.sql"

# Create Conversations
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251101000001_create_conversations.sql"

# Auto Provision Thirdweb Wallets
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251101001000_auto_provision_thirdweb_wallets.sql"

# Fix Sync User Search Path
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251101010000_fix_sync_user_search_path.sql"

# Tool Approvals HITL
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251102120000_tool_approvals_hitl.sql"

# Enhance Document RAG
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251103120000_enhance_document_rag.sql"

# FK Index Tuning
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251104103000_fk_index_tuning.sql"

# Wallet Analytics
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251106120000_wallet_analytics.sql"

# Multi Chain Automation Schema
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251108123000_multi_chain_automation_schema.sql"

# Create Analytics Event
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251109093000_create_analytics_event.sql"

# Supabase Advisor Fixes
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251109143000_supabase_advisor_fixes.sql"

# Invite Code Function Returns
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251110103000_invite_code_function_returns.sql"

# Link Wallet RPC
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251110120000_link_wallet_rpc.sql"

# Wallet Auth Challenge
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251110130000_wallet_auth_challenge.sql"

# Wallet Link RPC
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251110130200_wallet_link_rpc.sql"

# Database Performance Optimization
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251114000000_database_performance_optimization.sql"

# User Roles and Permissions
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251115000000_user_roles_and_permissions.sql"

# Performance Monitoring Tables
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251115010000_performance_monitoring_tables.sql"

# Wallet Analytics Enhancement
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251115020000_wallet_analytics_enhancement.sql"

# Chat AI Analytics Enhancement
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251115030000_chat_ai_analytics_enhancement.sql"

# Data Cleanup and Optimization
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251115040000_data_cleanup_and_optimization.sql"

# Watchlists
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251115094500_watchlists.sql"

# Agent Task Scheduler
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251115153000_agent_task_scheduler.sql"

# Data Migration User Roles
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251116000000_data_migration_user_roles.sql"

# Security RLS Hardening
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251118120000_security_rls_hardening.sql"

# Comprehensive Security Performance Fixes
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251119000000_comprehensive_security_performance_fixes.sql"

# Fix API Key and Organization Tables
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251119120000_fix_api_key_and_organization_tables.sql"

# Query Performance Optimizations
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251120000001_query_performance_optimizations.sql"

# API Key Tiers and Limits
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251121093000_api_key_tiers_and_limits.sql"

# Onboarding Schema
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251122000000_onboarding_schema.sql"

# Auth Unique Constraints
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251124153000_auth_unique_constraints.sql"

# Auth Sessions and Invites
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251124161000_auth_sessions_and_invites.sql"

# Performance Optimization
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251125151500_performance_optimization.sql"

# Fix Org Creation Slug
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251125160000_fix_org_creation_slug.sql"

# Create MCP Tools
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251127000000_create_mcp_tools.sql"

# Wallet Session Keys
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251205000000_wallet_session_keys.sql"

# Credit System
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251206000001_credit_system.sql"

# XP Leaderboard System
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251207000001_xp_leaderboard_system.sql"

# Referral XP 500
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251207000002_referral_xp_500.sql"

# Fix Get Leaderboard Column
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251207000003_fix_get_leaderboard_column.sql"

# Safe Wallets Core Tables
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251212014307_safe_wallets_core_tables_without_wallet_accounts_conflict.sql"

# Wallet Accounts Safe Support
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251212014904_wallet_accounts_safe_support.sql"

# Wallet Accounts Safe Provisioning Fields
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251212021000_wallet_accounts_safe_provisioning_fields.sql"

# Wallet Accounts Safe Retry Support
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251212143000_wallet_accounts_safe_retry_support.sql"

# Wallet Passkeys
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251212160000_wallet_passkeys.sql"

# Safe TX Requests
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251212171000_safe_tx_requests.sql"

# Safe TX Requests Safe TX Data
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251212172000_safe_tx_requests_safe_tx_data.sql"

# Push Notifications Phase 4
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251212174000_push_notifications_phase4.sql"

# Wallet Recovery
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251212191000_wallet_recovery.sql"

# Agent Rental RLS Self Insert
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251213000000_agent_rental_rls_self_insert.sql"

# Agent Trade Audit Fields
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251213070000_agent_trade_audit_fields.sql"

# Fix Claim Daily XP Streak Day Ambiguity
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251214000001_fix_claim_daily_xp_streak_day_ambiguity.sql"

# Fix Auth RLS Init Plan
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251218213000_fix_auth_rls_init_plan.sql"

# Fix Multiple Permissive Policies
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251218213500_fix_multiple_permissive_policies.sql"

# Fix Unindexed FKeys
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251218214500_fix_unindexed_fkeys.sql"

# Drop Unused Indexes
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251218215000_drop_unused_indexes.sql"

# Fix Remaining RLS
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251218220000_fix_remaining_rls.sql"

# Fix All Unindexed FKeys
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251218220500_fix_all_unindexed_fkeys.sql"

# Enable Realtime
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251218221500_enable_realtime.sql"

# Enable Realtime Enhanced
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251218223000_enable_realtime_enhanced.sql"

# Fix Performance Indexes
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251219000000_fix_performance_indexes.sql"

# Fix RLS Policies
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251219000001_fix_rls_policies.sql"

# Optimize Org Member
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251219000002_optimize_org_member.sql"

# MCP Registry
psql "$DB_URL" -f "$MIGRATIONS_DIR/20251229000000_mcp_registry.sql"

# Fix Security Warnings
psql "$DB_URL" -f "$MIGRATIONS_DIR/20260214000000_fix_security_warnings.sql"

# Fix Performance Warnings (Unused Indexes, PKs)
psql "$DB_URL" -f "$MIGRATIONS_DIR/20260214000001_fix_performance_and_warnings.sql"

# ============================================================
# STEP 3: Verify final migration state
# ============================================================
echo "=== Final migration state ==="
psql "$DB_URL" -c "SELECT COUNT(*) as total_migrations FROM supabase_migrations.schema_migrations;"
psql "$DB_URL" -c "SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 10;"

echo "=== Migration push complete ==="
