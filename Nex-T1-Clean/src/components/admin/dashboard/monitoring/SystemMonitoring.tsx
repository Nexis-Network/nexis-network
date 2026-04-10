'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Activity, Shield, Database } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'


import { logger } from '@/lib/logger';
interface HealthCheck {
  date: string
  total: number
  healthy: number
  unhealthy: number
  healthRate: number
}

interface SystemHealthCheckRow {
  checked_at: string
  status?: 'healthy' | 'unhealthy' | string | null
}

interface HourlyHealthBucket {
  date: string
  total: number
  healthy: number
  unhealthy: number
}

export function SystemMonitoring() {
  const [healthData, setHealthData] = useState<HealthCheck[]>([])
  const [currentHealth, setCurrentHealth] = useState({
    total: 0,
    healthy: 0,
    healthRate: 0
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchHealthData() {
      try {
        const { data: checks, error } = await supabase
          .from('system_health_checks')
          .select('*')
          .gte('checked_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('checked_at')

        if (error) throw error

        if (!checks) {
          setHealthData([])
          return
        }

        const typedChecks = checks as SystemHealthCheckRow[]

        // Group by hour
        const groupedData = typedChecks.reduce<Record<string, HourlyHealthBucket>>((acc, check) => {
          const hour = new Date(check.checked_at).getHours()
          const date = new Date(check.checked_at).toISOString().split('T')[0]
          const key = `${date}-${hour}`

          if (!acc[key]) {
            acc[key] = {
              date: `${hour}:00`,
              total: 0,
              healthy: 0,
              unhealthy: 0
            }
          }
          acc[key].total++
          if (check.status === 'healthy') {
            acc[key].healthy++
          } else {
            acc[key].unhealthy++
          }
          return acc
        }, {})

        const chartData = Object.values(groupedData)
          .map((hour) => ({
            ...hour,
            healthRate: hour.total ? Math.round((hour.healthy / hour.total) * 100) : 0
          }))
          .slice(-24) // Last 24 hours

        setHealthData(chartData)

        // Current health status
        const latest = typedChecks.slice(-10)
        const healthy = latest.filter((c) => c.status === 'healthy').length
        const total = latest.length
        setCurrentHealth({
          total,
          healthy,
          healthRate: total ? Math.round((healthy / total) * 100) : 0
        })

      } catch (error) {
        logger.error('Failed to fetch health data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchHealthData()
  }, [supabase])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Health Monitoring
          </CardTitle>
          <CardDescription>
            Real-time system health checks and performance monitoring
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Current Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">System Health</p>
                    <p className="text-2xl font-bold text-green-600">{currentHealth.healthRate}%</p>
                  </div>
                  <Activity className="h-8 w-8 text-green-600" />
                </div>
                <Progress value={currentHealth.healthRate} className="mt-3" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Checks (Last Hour)</p>
                    <p className="text-2xl font-bold text-blue-600">{currentHealth.total}</p>
                  </div>
                  <Shield className="h-8 w-8 text-blue-600" />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {currentHealth.healthy} healthy, {currentHealth.total - currentHealth.healthy} issues
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Database Status</p>
                    <p className="text-2xl font-bold text-purple-600">{currentHealth.healthRate}%</p>
                  </div>
                  <Database className="h-8 w-8 text-purple-600" />
                </div>
                <Badge variant={currentHealth.healthRate >= 90 ? "secondary" : "destructive"} className="mt-2">
                  {currentHealth.healthRate >= 90 ? "Operational" : "Degraded"}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Health Trend Chart */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Health Trend (Last 24 Hours)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={healthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Health Rate']} />
                  <Line
                    type="monotone"
                    dataKey="healthRate"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* System Components Status */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">System Components</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: 'Supabase Database' },
                { name: 'API Endpoints' },
                { name: 'AI Services' },
                { name: 'Cache Layer' },
                { name: 'Authentication' },
                { name: 'File Storage' }
              ].map((component, index) => {
                const status = currentHealth.healthRate >= 80 ? 'healthy' : 'degraded';
                return (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{component.name}</p>
                      <p className="text-sm text-muted-foreground">{currentHealth.healthRate}% uptime</p>
                    </div>
                    <Badge variant={status === 'healthy' ? 'default' : 'destructive'}>
                      {status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
