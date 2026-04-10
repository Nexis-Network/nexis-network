'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Shield, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'


import { logger } from '@/lib/logger';
const SECURITY_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const
type SecuritySeverity = typeof SECURITY_SEVERITIES[number]

interface SecurityEventSummary {
  date: string
  total: number
  low: number
  medium: number
  high: number
  critical: number
}

interface SecurityDashboardProps {
  compact?: boolean
}

interface SecurityEventRow {
  occurred_at: string
  severity?: string | null
  event_type?: string | null
  details?: {
    endpoint?: string | null
    [key: string]: UntypedJson
  } | null
}

const normalizeSeverity = (severity?: string | null): SecuritySeverity => {
  if (severity && SECURITY_SEVERITIES.includes(severity as SecuritySeverity)) {
    return severity as SecuritySeverity
  }
  return 'low'
}

export function SecurityDashboard({ compact = false }: SecurityDashboardProps) {
  const [events, setEvents] = useState<SecurityEventSummary[]>([])
  const [recentAlerts, setRecentAlerts] = useState<SecurityEventRow[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchSecurityData() {
      try {
        const { data: securityData, error } = await supabase
          .from('security_events')
          .select('*')
          .gte('occurred_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('occurred_at', { ascending: false })

        if (error) throw error

        if (!securityData) {
          setEvents([])
          setRecentAlerts([])
          return
        }

        const typedSecurityData = securityData as SecurityEventRow[]

        // Group by date and severity
        const groupedData = typedSecurityData.reduce<Record<string, SecurityEventSummary>>((acc, event) => {
          const date = new Date(event.occurred_at).toISOString().split('T')[0]
          if (!acc[date]) {
            acc[date] = { date, total: 0, low: 0, medium: 0, high: 0, critical: 0 }
          }
          acc[date].total++
          const severity = normalizeSeverity(event.severity)
          acc[date][severity]++
          return acc
        }, {})

        const chartData = Object.values(groupedData).sort((a, b) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
        )

        setEvents(chartData)
        setRecentAlerts(typedSecurityData.slice(0, 5))
      } catch (error) {
        logger.error('Failed to fetch security data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSecurityData()
  }, [supabase])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    )
  }

  const totalEvents = events.reduce((sum, e) => sum + e.total, 0)
  const criticalEvents = events.reduce((sum, e) => sum + e.critical, 0)
  const highEvents = events.reduce((sum, e) => sum + e.high, 0)

  const severityData = [
    { name: 'Low', value: events.reduce((sum, e) => sum + e.low, 0), color: '#22c55e' },
    { name: 'Medium', value: events.reduce((sum, e) => sum + e.medium, 0), color: '#f59e0b' },
    { name: 'High', value: highEvents, color: '#ef4444' },
    { name: 'Critical', value: criticalEvents, color: '#7c2d12' }
  ]

  if (compact) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Overview
          </CardTitle>
          <CardDescription>Security events and threat monitoring</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {totalEvents}
              </div>
              <div className="text-sm text-muted-foreground">Total Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {highEvents}
              </div>
              <div className="text-sm text-muted-foreground">High Priority</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {criticalEvents}
              </div>
              <div className="text-sm text-muted-foreground">Critical</div>
            </div>
          </div>

          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={events.slice(-7)}>
                <Bar dataKey="total" fill="#8884d8" />
                <Tooltip />
              </BarChart>
            </ResponsiveContainer>
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
            <Shield className="h-5 w-5" />
            Security Dashboard
          </CardTitle>
          <CardDescription>
            Real-time security monitoring and threat analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalEvents}</div>
              <div className="text-sm text-muted-foreground">Total Events (7d)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {events.reduce((sum, e) => sum + e.low, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Low Priority</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{highEvents}</div>
              <div className="text-sm text-muted-foreground">High Priority</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{criticalEvents}</div>
              <div className="text-sm text-muted-foreground">Critical Alerts</div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Daily Security Events</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={events}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="low" stackId="a" fill="#22c55e" name="Low" />
                    <Bar dataKey="medium" stackId="a" fill="#f59e0b" name="Medium" />
                    <Bar dataKey="high" stackId="a" fill="#ef4444" name="High" />
                    <Bar dataKey="critical" stackId="a" fill="#7c2d12" name="Critical" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Severity Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value, percent }) =>
                        value > 0 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''
                      }
                    >
                      {severityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Recent Security Events</h3>
            <div className="space-y-3">
              {recentAlerts.map((alert, index) => (
                <Alert key={index} className={
                  alert.severity === 'critical' ? 'border-red-500' :
                  alert.severity === 'high' ? 'border-orange-500' :
                  alert.severity === 'medium' ? 'border-yellow-500' :
                  'border-green-500'
                }>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>
                      <strong>{alert.event_type}</strong> - {alert.details?.endpoint || 'Unknown'}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        alert.severity === 'critical' ? 'destructive' :
                        alert.severity === 'high' ? 'default' :
                        'secondary'
                      }>
                        {alert.severity}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(alert.occurred_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
