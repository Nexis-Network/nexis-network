'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { Brain, Zap, DollarSign, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'


import { logger } from '@/lib/logger';
interface AIModelData {
  date: string
  requests: number
  tokens: number
  cost: number
  avgResponseTime: number
  successRate: number
}

interface AIAnalyticsProps {
  compact?: boolean
}

interface AIUsageRecord {
  requested_at: string
  total_tokens?: number | null
  estimated_cost_usd?: number | null
  response_time_ms?: number | null
  success?: boolean | null
}

interface AggregatedUsage {
  date: string
  requests: number
  tokens: number
  cost: number
  totalResponseTime: number
  successful: number
  total: number
}

export function AIAnalytics({ compact = false }: AIAnalyticsProps) {
  const [data, setData] = useState<AIModelData[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchAIData() {
      try {
        const { data: usage, error } = await supabase
          .from('ai_model_usage')
          .select('*')
          .gte('requested_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('requested_at')

        if (error) throw error
        if (!usage) {
          setData([])
          return
        }

        const typedUsage = usage as AIUsageRecord[]

        // Group by date
        const groupedData = typedUsage.reduce<Record<string, AggregatedUsage>>((acc, record) => {
          const date = new Date(record.requested_at).toISOString().split('T')[0]
          if (!acc[date]) {
            acc[date] = {
              date,
              requests: 0,
              tokens: 0,
              cost: 0,
              totalResponseTime: 0,
              successful: 0,
              total: 0
            }
          }
          acc[date].requests++
          acc[date].tokens += record.total_tokens ?? 0
          acc[date].cost += record.estimated_cost_usd ?? 0
          acc[date].totalResponseTime += record.response_time_ms ?? 0
          acc[date].total++
          if (record.success) {
            acc[date].successful++
          }
          return acc
        }, {})

        const chartData = Object.values(groupedData).map((day) => ({
          date: day.date,
          requests: day.requests,
          tokens: day.tokens,
          cost: Math.round(day.cost * 100) / 100,
          avgResponseTime: Math.round(day.totalResponseTime / day.requests),
          successRate: Math.round((day.successful / day.total) * 100)
        }))

        setData(chartData)
      } catch (error) {
        logger.error('Failed to fetch AI analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAIData()
  }, [supabase])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    )
  }

  const totalRequests = data.reduce((sum, d) => sum + d.requests, 0)
  const totalTokens = data.reduce((sum, d) => sum + d.tokens, 0)
  const totalCost = data.reduce((sum, d) => sum + d.cost, 0)
  const avgResponseTime = Math.round(data.reduce((sum, d) => sum + d.avgResponseTime, 0) / Math.max(data.length, 1))

  if (compact) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Analytics
          </CardTitle>
          <CardDescription>AI model usage and performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {totalRequests}
              </div>
              <div className="text-sm text-muted-foreground">API Requests</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                ${totalCost.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Total Cost</div>
            </div>
          </div>

          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.slice(-7)}>
                <Bar dataKey="requests" fill="#8884d8" />
                <Tooltip />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Model Analytics
        </CardTitle>
        <CardDescription>
          AI API usage, performance, and cost analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{totalRequests}</div>
            <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Zap className="h-3 w-3" />
              API Requests
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{totalTokens.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Tokens Used</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">${totalCost.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <DollarSign className="h-3 w-3" />
              Total Cost
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{avgResponseTime}ms</div>
            <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Clock className="h-3 w-3" />
              Avg Response
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Daily API Requests</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="requests" fill="#8884d8" name="Requests" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="avgResponseTime" stroke="#8884d8" name="Response Time (ms)" />
                  <Line type="monotone" dataKey="successRate" stroke="#82ca9d" name="Success Rate (%)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Cost Analysis */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Cost Analysis</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value}`, 'Cost']} />
                <Bar dataKey="cost" fill="#ffc658" name="Daily Cost ($)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
