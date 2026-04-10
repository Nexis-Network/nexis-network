'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { RefreshCw, MessageSquare, Shield, Wallet, Brain, Activity } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'


import { logger } from '@/lib/logger';
interface RealtimeEvent {
  id: string
  type: 'conversation' | 'security' | 'wallet' | 'ai' | 'system'
  title: string
  description: string
  timestamp: Date
  severity?: 'low' | 'medium' | 'high' | 'critical'
}

interface ConversationAnalyticsEventRow {
  id: string | number
  started_at: string
  total_messages?: number | null
}

interface SecurityEventRow {
  id: string | number
  event_type?: string | null
  severity?: 'low' | 'medium' | 'high' | 'critical' | null
  occurred_at: string
}

interface WalletSnapshotEventRow {
  id: string | number
  snapshot_at: string
  balance_normalized?: string | null
}

interface AIModelUsageEventRow {
  id: string | number
  requested_at: string
  total_tokens?: number | null
}

interface SystemHealthCheckEventRow {
  id: string | number
  checked_at: string
  status?: string | null
}

export function RealtimeUpdates() {
  const [events, setEvents] = useState<RealtimeEvent[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchRecentEvents() {
      try {
        // Fetch recent events from different tables
        const [
          { data: conversations },
          { data: security },
          { data: wallets },
          { data: aiUsage },
          { data: health }
        ] = await Promise.all([
          supabase
            .from('conversation_analytics')
            .select('id, started_at, total_messages')
            .order('started_at', { ascending: false })
            .limit(3),
          supabase
            .from('security_events')
            .select('id, event_type, severity, occurred_at')
            .order('occurred_at', { ascending: false })
            .limit(3),
          supabase
            .from('wallet_balance_snapshots')
            .select('id, snapshot_at, balance_normalized')
            .order('snapshot_at', { ascending: false })
            .limit(3),
          supabase
            .from('ai_model_usage')
            .select('id, requested_at, total_tokens')
            .order('requested_at', { ascending: false })
            .limit(3),
          supabase
            .from('system_health_checks')
            .select('id, status, checked_at')
            .order('checked_at', { ascending: false })
            .limit(3)
        ])

        // Combine and format events
        const recentEvents: RealtimeEvent[] = []

        const conversationRows = (conversations ?? []) as ConversationAnalyticsEventRow[]
        const securityRows = (security ?? []) as SecurityEventRow[]
        const walletRows = (wallets ?? []) as WalletSnapshotEventRow[]
        const aiRows = (aiUsage ?? []) as AIModelUsageEventRow[]
        const healthRows = (health ?? []) as SystemHealthCheckEventRow[]

        // Add conversation events
        conversationRows.forEach((conv) => {
          recentEvents.push({
            id: `conv-${conv.id}`,
            type: 'conversation',
            title: 'New Conversation Started',
            description: `${conv.total_messages ?? 0} messages`,
            timestamp: new Date(conv.started_at)
          })
        })

        // Add security events
        securityRows.forEach((sec) => {
          const title = sec.event_type?.replace(/_/g, ' ') ?? 'Security Event'
          recentEvents.push({
            id: `sec-${sec.id}`,
            type: 'security',
            title,
            description: 'Security event detected',
            timestamp: new Date(sec.occurred_at),
            severity: sec.severity ?? undefined
          })
        })

        // Add wallet events
        walletRows.forEach((wallet) => {
          recentEvents.push({
            id: `wallet-${wallet.id}`,
            type: 'wallet',
            title: 'Wallet Balance Updated',
            description: `Balance: ${wallet.balance_normalized ?? '0'}`,
            timestamp: new Date(wallet.snapshot_at)
          })
        })

        // Add AI events
        aiRows.forEach((ai) => {
          recentEvents.push({
            id: `ai-${ai.id}`,
            type: 'ai',
            title: 'AI Model Used',
            description: `${ai.total_tokens ?? 0} tokens processed`,
            timestamp: new Date(ai.requested_at)
          })
        })

        // Add system events
        healthRows.forEach((h) => {
          recentEvents.push({
            id: `health-${h.id}`,
            type: 'system',
            title: 'Health Check Completed',
            description: `Status: ${h.status ?? 'unknown'}`,
            timestamp: new Date(h.checked_at)
          })
        })

        // Sort by timestamp (most recent first)
        recentEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        setEvents(recentEvents.slice(0, 20)) // Keep only 20 most recent

      } catch (error) {
        logger.error('Failed to fetch realtime events:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRecentEvents()

    // Set up polling for real-time updates
    const interval = setInterval(fetchRecentEvents, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [supabase])

  const getEventIcon = (type: RealtimeEvent['type']) => {
    switch (type) {
      case 'conversation': return <MessageSquare className="h-4 w-4" />
      case 'security': return <Shield className="h-4 w-4" />
      case 'wallet': return <Wallet className="h-4 w-4" />
      case 'ai': return <Brain className="h-4 w-4" />
      case 'system': return <Activity className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  const getEventColor = (type: RealtimeEvent['type'], severity?: string) => {
    if (severity === 'critical') return 'text-red-600 border-red-200'
    if (severity === 'high') return 'text-orange-600 border-orange-200'
    if (severity === 'medium') return 'text-yellow-600 border-yellow-200'

    switch (type) {
      case 'conversation': return 'text-blue-600 border-sky-500/20'
      case 'security': return 'text-red-600 border-red-200'
      case 'wallet': return 'text-green-600 border-green-200'
      case 'ai': return 'text-purple-600 border-purple-200'
      case 'system': return 'text-gray-600 border-gray-200'
      default: return 'text-gray-600 border-gray-200'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Live Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Live Activity Feed
          </CardTitle>
          <CardDescription>
            Real-time system events and user activities (auto-refreshes every 30s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className={`p-3 border rounded-lg ${getEventColor(event.type, event.severity)} bg-background/50`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 ${getEventColor(event.type, event.severity).split(' ')[0]}`}>
                        {getEventIcon(event.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium">{event.title}</h4>
                          {event.severity && (
                            <Badge
                              variant={
                                event.severity === 'critical' ? 'destructive' :
                                event.severity === 'high' ? 'default' :
                                'secondary'
                              }
                              className="text-xs"
                            >
                              {event.severity}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {event.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}

              {events.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-sky-500/100 rounded-full"></div>
                <span>Conversations</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>Security</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Wallets</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>AI</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
