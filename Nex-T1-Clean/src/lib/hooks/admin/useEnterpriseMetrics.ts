'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'


import { logger } from '@/lib/logger';
interface EnterpriseMetrics {
  activeUsers: number
  totalConversations: number
  aiRequests: number
  securityEvents: number
  walletTransactions: number
  systemHealth: number
  avgResponseTime: number
  pendingApprovals: number
  totalRevenue?: number
  errorRate?: number
  cacheHitRate?: number
}

interface ConversationAnalyticsRow {
  total_messages?: number | null
  total_tokens?: number | null
  duration_seconds?: number | null
}

interface AiUsageRow {
  total_tokens?: number | null
  response_time_ms?: number | null
  success?: boolean | null
}

interface SecurityEventRow {
  event_type?: string | null
  severity?: string | null
}

interface WalletSnapshotRow {
  balance_normalized?: string | null
}

interface HealthCheckRow {
  status?: string | null
}

interface ToolApprovalRow {
  status?: string | null
}

const toNumber = (value: UntypedJson): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function useEnterpriseMetrics() {
  const [metrics, setMetrics] = useState<EnterpriseMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    async function fetchMetrics() {
      try {
        setLoading(true)

        // Fetch all metrics in parallel
        const [
          { data: conversations, error: convError },
          { data: aiUsage, error: aiError },
          { data: security, error: secError },
          { data: wallets, error: walletError },
          { data: health, error: healthError },
          { data: approvals, error: apprError },
          { count: activeUserCount, error: activityError },
          { data: revenueRows, error: revenueError },
          { data: cacheRows, error: cacheError }
        ] = await Promise.all([
          // Conversation analytics
          supabase
            .from('conversation_analytics')
            .select('total_messages, total_tokens, duration_seconds')
            .gte('started_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),

          // AI model usage
          supabase
            .from('ai_model_usage')
            .select('total_tokens, response_time_ms, success')
            .gte('requested_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),

          // Security events
          supabase
            .from('security_events')
            .select('event_type, severity')
            .gte('occurred_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),

          // Wallet analytics
          supabase
            .from('wallet_balance_snapshots')
            .select('balance_normalized')
            .gte('snapshot_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),

          // System health
          supabase
            .from('system_health_checks')
            .select('status')
            .gte('checked_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),

          // Tool approvals
          supabase
            .from('tool_approvals')
            .select('status')
            .eq('status', 'pending'),

          // Active users (distinct user_id activity in last 30d)
          supabase
            .from('user_activity')
            .select('user_id', { count: 'exact', head: true })
            .gte('last_seen_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),

          // Revenue from transactions (USD normalized if present)
          supabase
            .from('transactions')
            .select('amount_usd, amount')
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),

          // Cache metrics (hits/misses)
          supabase
            .from('cache_metrics')
            .select('hits, misses')
        ])

        if (convError || aiError || secError || walletError || healthError || apprError || activityError || revenueError || cacheError) {
          logger.error('Metrics fetch errors:', { convError, aiError, secError, walletError, healthError, apprError, activityError, revenueError, cacheError })
        }

        // Calculate metrics
        const conversationRows = (conversations ?? []) as ConversationAnalyticsRow[]
        const aiUsageRows = (aiUsage ?? []) as AiUsageRow[]
        const securityRows = (security ?? []) as SecurityEventRow[]
        const walletRows = (wallets ?? []) as WalletSnapshotRow[]
        const healthRows = (health ?? []) as HealthCheckRow[]
        const approvalRows = (approvals ?? []) as ToolApprovalRow[]
        const cacheRowsSafe = (cacheRows ?? []) as Array<{ hits?: number | string | null; misses?: number | string | null }>
        const revenueSafe = (revenueRows ?? []) as Array<{ amount_usd?: UntypedJson; amount?: UntypedJson }>

        const activeUsers = typeof activeUserCount === 'number' ? activeUserCount : 0

        const totalRevenue = revenueSafe.reduce((acc, row) => {
          const usd = toNumber(row.amount_usd)
          const fallback = toNumber(row.amount)
          return acc + (usd ?? fallback ?? 0)
        }, 0)

        const cacheHits = cacheRowsSafe.reduce((acc, row) => acc + (toNumber(row.hits) ?? 0), 0)
        const cacheMisses = cacheRowsSafe.reduce((acc, row) => acc + (toNumber(row.misses) ?? 0), 0)
        const cacheHitRate = cacheHits + cacheMisses > 0 ? (cacheHits / (cacheHits + cacheMisses)) * 100 : null

        const healthyChecks = healthRows.filter((record) => record.status === 'healthy').length
        const systemHealth = healthRows.length ? (healthyChecks / healthRows.length) * 100 : 0

        const averageResponseTime = aiUsageRows.length
          ? aiUsageRows.reduce((acc, usage) => acc + (usage.response_time_ms ?? 0), 0) / aiUsageRows.length
          : 0

        const errorRate = aiUsageRows.length
          ? (aiUsageRows.filter((usage) => usage.success === false).length / aiUsageRows.length) * 100
          : 0

        const calculatedMetrics: EnterpriseMetrics = {
          activeUsers,
          totalConversations: conversationRows.length,
          aiRequests: aiUsageRows.length,
          securityEvents: securityRows.length,
          walletTransactions: walletRows.length,
          systemHealth,
          avgResponseTime: averageResponseTime,
          pendingApprovals: approvalRows.length,
          totalRevenue,
          errorRate,
          cacheHitRate: cacheHitRate ?? undefined
        }

        setMetrics(calculatedMetrics)
        setError(null)
      } catch (err) {
        logger.error('Failed to fetch enterprise metrics:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch metrics')
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()

    // Refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000)
    return () => clearInterval(interval)
  }, [supabase])

  return { metrics, loading, error, refetch: () => window.location.reload() }
}
