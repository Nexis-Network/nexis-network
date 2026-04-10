'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'


import { logger } from '@/lib/logger';
interface ConversationData {
  date: string
  conversations: number
  messages: number
  avgDuration: number
  completionRate: number
}

interface QualityMetrics {
  name: string
  value: number
  color: string
}

interface ConversationAnalyticsProps {
  compact?: boolean
}

interface ConversationAnalyticsRow {
  started_at: string
  total_messages?: number | null
  duration_seconds?: number | null
  completion_status?: string | null
}

interface ConversationAggregate {
  date: string
  conversations: number
  messages: number
  totalDuration: number
  completed: number
  total: number
}

interface QualityMetricRow {
  response_quality_score?: number | null
  helpfulness_score?: number | null
  accuracy_score?: number | null
  relevance_score?: number | null
  creativity_score?: number | null
}

interface QualityAccumulator {
  quality: number
  helpfulness: number
  accuracy: number
  relevance: number
  creativity: number
  count: number
}

export function ConversationAnalytics({ compact = false }: ConversationAnalyticsProps) {
  const [data, setData] = useState<ConversationData[]>([])
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchConversationData() {
      try {
        // Fetch conversation analytics for the last 30 days
        const { data: analytics, error } = await supabase
          .from('conversation_analytics')
          .select('*')
          .gte('started_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .order('started_at')

        if (error) throw error

        if (!analytics) {
          setData([])
          return
        }

        const typedAnalytics = analytics as ConversationAnalyticsRow[]

        // Group by date
        const groupedData = typedAnalytics.reduce<Record<string, ConversationAggregate>>((acc, conv) => {
          const date = new Date(conv.started_at).toISOString().split('T')[0]
          if (!acc[date]) {
            acc[date] = {
              date,
              conversations: 0,
              messages: 0,
              totalDuration: 0,
              completed: 0,
              total: 0
            }
          }
          acc[date].conversations++
          acc[date].messages += conv.total_messages ?? 0
          acc[date].totalDuration += conv.duration_seconds ?? 0
          acc[date].total++
          if (conv.completion_status === 'completed') {
            acc[date].completed++
          }
          return acc
        }, {})

        const chartData = Object.values(groupedData).map((day) => ({
          date: day.date,
          conversations: day.conversations,
          messages: day.messages,
          avgDuration: Math.round((day.totalDuration / day.conversations) / 60), // minutes
          completionRate: Math.round((day.completed / day.total) * 100)
        }))

        setData(chartData)

        // Quality metrics
        const { data: quality, error: qualityError } = await supabase
          .from('chat_quality_metrics')
          .select('response_quality_score, helpfulness_score, accuracy_score, relevance_score, creativity_score')

        if (!qualityError && quality) {
          const typedQuality = quality as QualityMetricRow[]
          const avgQuality = typedQuality.reduce<QualityAccumulator>((acc, q) => ({
            quality: acc.quality + (q.response_quality_score ?? 0),
            helpfulness: acc.helpfulness + (q.helpfulness_score ?? 0),
            accuracy: acc.accuracy + (q.accuracy_score ?? 0),
            relevance: acc.relevance + (q.relevance_score ?? 0),
            creativity: acc.creativity + (q.creativity_score ?? 0),
            count: acc.count + 1
          }), { quality: 0, helpfulness: 0, accuracy: 0, relevance: 0, creativity: 0, count: 0 })

          if (avgQuality.count > 0) {
            const scale = 20 // convert 0-5 scores into percent-like values
            const qualityData = [
              { name: 'Quality', value: Math.round((avgQuality.quality / avgQuality.count) * scale), color: '#8884d8' },
              { name: 'Helpfulness', value: Math.round((avgQuality.helpfulness / avgQuality.count) * scale), color: '#82ca9d' },
              { name: 'Accuracy', value: Math.round((avgQuality.accuracy / avgQuality.count) * scale), color: '#ffc658' },
              { name: 'Relevance', value: Math.round((avgQuality.relevance / avgQuality.count) * scale), color: '#ff7300' },
              { name: 'Creativity', value: Math.round((avgQuality.creativity / avgQuality.count) * scale), color: '#00ff00' }
            ]

            setQualityMetrics(qualityData)
          }
        }

      } catch (error) {
        logger.error('Failed to fetch conversation analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchConversationData()
  }, [supabase])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conversation Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    )
  }

  if (compact) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conversation Analytics
          </CardTitle>
          <CardDescription>AI conversation insights and quality metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {data.reduce((sum, d) => sum + d.conversations, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Conversations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(data.reduce((sum, d) => sum + d.completionRate, 0) / Math.max(data.length, 1))}%
              </div>
              <div className="text-sm text-muted-foreground">Avg Completion Rate</div>
            </div>
          </div>

          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.slice(-7)}>
                <Line type="monotone" dataKey="conversations" stroke="#8884d8" strokeWidth={2} />
                <Tooltip />
              </LineChart>
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
            <MessageSquare className="h-5 w-5" />
            Conversation Analytics
          </CardTitle>
          <CardDescription>
            Detailed insights into AI conversation patterns and quality metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="trends" className="space-y-4">
            <TabsList>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="quality">Quality</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
            </TabsList>

            <TabsContent value="trends" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {data.reduce((sum, d) => sum + d.conversations, 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">Total Conversations (30d)</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {data.reduce((sum, d) => sum + d.messages, 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">Total Messages</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {Math.round(data.reduce((sum, d) => sum + d.completionRate, 0) / Math.max(data.length, 1))}%
                    </div>
                    <p className="text-xs text-muted-foreground">Avg Completion Rate</p>
                  </CardContent>
                </Card>
              </div>

              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="conversations" fill="#8884d8" name="Conversations" />
                    <Bar dataKey="messages" fill="#82ca9d" name="Messages" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="quality" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Quality Scores</h3>
                  <div className="space-y-2">
                    {qualityMetrics.map((metric, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm">{metric.name}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${metric.value}%`,
                                backgroundColor: metric.color
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8">{metric.value}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Quality Distribution</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={qualityMetrics}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}%`}
                        >
                          {qualityMetrics.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="avgDuration" stroke="#8884d8" name="Avg Duration (min)" />
                    <Line type="monotone" dataKey="completionRate" stroke="#82ca9d" name="Completion Rate (%)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
