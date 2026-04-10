'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Wallet, DollarSign } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'


import { logger } from '@/lib/logger';
interface WalletData {
  date: string
  snapshots: number
  totalBalance: number
  transactions: number
}

interface WalletAnalyticsProps {
  compact?: boolean
}

interface WalletSnapshotRow {
  snapshot_at: string
  balance_normalized?: string | null
  transactions?: number | null
}

interface WalletAggregate {
  date: string
  snapshots: number
  totalBalance: number
  transactions: number
}

export function WalletAnalytics({ compact = false }: WalletAnalyticsProps) {
  const [data, setData] = useState<WalletData[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchWalletData() {
      try {
        const { data: snapshots, error } = await supabase
          .from('wallet_balance_snapshots')
          .select('*')
          .gte('snapshot_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('snapshot_at')

        if (error) throw error

        if (!snapshots) {
          setData([])
          return
        }

        const typedSnapshots = snapshots as WalletSnapshotRow[]

        // Group by date
        const groupedData = typedSnapshots.reduce<Record<string, WalletAggregate>>((acc, snapshot) => {
          const date = new Date(snapshot.snapshot_at).toISOString().split('T')[0]
          if (!acc[date]) {
            acc[date] = {
              date,
              snapshots: 0,
              totalBalance: 0,
              transactions: 0
            }
          }
          acc[date].snapshots++
          const balance = snapshot.balance_normalized ? parseFloat(snapshot.balance_normalized) : 0
          acc[date].totalBalance += Number.isFinite(balance) ? balance : 0
          acc[date].transactions += snapshot.transactions ?? 0
          return acc
        }, {})

        const chartData = Object.values(groupedData).map((day) => ({
          date: day.date,
          snapshots: day.snapshots,
          totalBalance: Math.round(day.totalBalance * 100) / 100,
          transactions: day.transactions
        }))

        setData(chartData)
      } catch (error) {
        logger.error('Failed to fetch wallet analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchWalletData()
  }, [supabase])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    )
  }

  const totalSnapshots = data.reduce((sum, d) => sum + d.snapshots, 0)
  const totalBalance = data.reduce((sum, d) => sum + d.totalBalance, 0)

  if (compact) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet Analytics
          </CardTitle>
          <CardDescription>Wallet balance and transaction insights</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {totalSnapshots}
              </div>
              <div className="text-sm text-muted-foreground">Balance Snapshots</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                ${totalBalance.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Total Balance</div>
            </div>
          </div>

          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.slice(-7)}>
                <Bar dataKey="snapshots" fill="#8884d8" />
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
          <Wallet className="h-5 w-5" />
          Wallet Analytics
        </CardTitle>
        <CardDescription>
          Wallet balance tracking and transaction analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{totalSnapshots}</div>
            <div className="text-sm text-muted-foreground">Balance Snapshots</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">${totalBalance.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <DollarSign className="h-3 w-3" />
              Total Balance
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">0</div>
            <div className="text-sm text-muted-foreground">Active Wallets</div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-80">
          <h3 className="text-lg font-semibold mb-4">Daily Balance Snapshots</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value, name) => [
                name === 'totalBalance' ? `$${value}` : value,
                name === 'totalBalance' ? 'Total Balance' : 'Snapshots'
              ]} />
              <Bar dataKey="snapshots" fill="#8884d8" name="snapshots" />
              <Bar dataKey="totalBalance" fill="#82ca9d" name="totalBalance" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Additional Insights */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {Math.round(data.reduce((sum, d) => sum + d.snapshots, 0) / Math.max(data.length, 1))}
                </div>
                <div className="text-sm text-muted-foreground">Avg Daily Snapshots</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">
                  {data.length > 1 ?
                    ((data[data.length - 1].totalBalance - data[0].totalBalance) /
                     Math.max(data[0].totalBalance, 1) * 100).toFixed(1) : '0.0'}%
                </div>
                <div className="text-sm text-muted-foreground">Balance Change</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  )
}
