'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  MessageSquare,
  Brain,
  Shield,
  Wallet,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'
import { useEnterpriseMetrics } from '@/hooks/admin/useEnterpriseMetrics'

export function KeyMetricsGrid() {
  const { metrics, loading } = useEnterpriseMetrics()
  const securityEvents = metrics?.securityEvents ?? 0
  const avgResponseTime = metrics?.avgResponseTime ?? 0
  const pendingApprovals = metrics?.pendingApprovals ?? 0

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const metricCards = [
    {
      title: 'Active Users',
      value: metrics?.activeUsers || 0,
      change: '+12%',
      changeType: 'positive' as const,
      icon: Users,
      description: 'Users active this week'
    },
    {
      title: 'Conversations',
      value: metrics?.totalConversations || 0,
      change: '+8%',
      changeType: 'positive' as const,
      icon: MessageSquare,
      description: 'Total AI conversations'
    },
    {
      title: 'AI Model Usage',
      value: metrics?.aiRequests || 0,
      change: '+15%',
      changeType: 'positive' as const,
      icon: Brain,
      description: 'AI API calls this week'
    },
    {
      title: 'Security Events',
      value: securityEvents,
      change: securityEvents > 100 ? 'high' : 'normal',
      changeType: securityEvents > 100 ? 'warning' as const : 'neutral' as const,
      icon: Shield,
      description: 'Monitored events'
    },
    {
      title: 'Wallet Transactions',
      value: metrics?.walletTransactions || 0,
      change: '+5%',
      changeType: 'positive' as const,
      icon: Wallet,
      description: 'Blockchain interactions'
    },
    {
      title: 'System Health',
      value: metrics?.systemHealth != null && metrics.systemHealth > 0 ? `${metrics.systemHealth.toFixed(1)}%` : 'No data',
      change: metrics?.systemHealth != null && metrics.systemHealth >= 99 ? 'healthy' : metrics?.systemHealth != null && metrics.systemHealth > 0 ? 'degraded' : 'unavailable',
      changeType: metrics?.systemHealth != null && metrics.systemHealth >= 99 ? 'positive' as const : metrics?.systemHealth != null && metrics.systemHealth > 0 ? 'warning' as const : 'neutral' as const,
      icon: Activity,
      description: 'Uptime this month'
    },
    {
      title: 'Avg Response Time',
      value: `${avgResponseTime}ms`,
      change: avgResponseTime < 1000 ? 'fast' : 'normal',
      changeType: avgResponseTime < 1000 ? 'positive' as const : 'neutral' as const,
      icon: TrendingUp,
      description: 'AI response latency'
    },
    {
      title: 'Pending Approvals',
      value: pendingApprovals,
      change: pendingApprovals > 0 ? 'attention' : 'clear',
      changeType: pendingApprovals > 0 ? 'warning' as const : 'positive' as const,
      icon: Clock,
      description: 'HITL approvals needed'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metricCards.map((metric, index) => {
        const Icon = metric.icon
        return (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {metric.description}
                </p>
                <Badge
                  variant={
                    metric.changeType === 'positive' ? 'default' :
                    metric.changeType === 'warning' ? 'destructive' :
                    'secondary'
                  }
                  className="text-xs"
                >
                  {metric.changeType === 'positive' && <CheckCircle className="h-3 w-3 mr-1" />}
                  {metric.changeType === 'warning' && <AlertTriangle className="h-3 w-3 mr-1" />}
                  {metric.change}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
