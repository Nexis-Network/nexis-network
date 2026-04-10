'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, TrendingUp, Shield, Brain, Wallet, Activity } from 'lucide-react'

// Import visualization components
import { KeyMetricsGrid } from './KeyMetricsGrid'
import { ConversationAnalytics } from './analytics/ConversationAnalytics'
import { AIAnalytics } from './analytics/AIAnalytics'
import { SecurityDashboard } from './security/SecurityDashboard'
import { WalletAnalytics } from './analytics/WalletAnalytics'
import { SystemMonitoring } from './monitoring/SystemMonitoring'
import { RealtimeUpdates } from './RealtimeUpdates'

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const handleRefresh = () => {
    setLastRefresh(new Date())
    // Trigger data refresh across all components
    window.location.reload()
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Enterprise Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time business intelligence and system monitoring
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="text-xs">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </Badge>
          <Button onClick={handleRefresh} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <KeyMetricsGrid />

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="conversations" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Analytics
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="wallets" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Finance
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            System
          </TabsTrigger>
          <TabsTrigger value="realtime" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Live
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ConversationAnalytics compact />
            <AIAnalytics compact />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SecurityDashboard compact />
            <WalletAnalytics compact />
          </div>
        </TabsContent>

        <TabsContent value="conversations">
          <div className="space-y-6">
            <ConversationAnalytics />
            <AIAnalytics />
          </div>
        </TabsContent>

        <TabsContent value="security">
          <SecurityDashboard />
        </TabsContent>

        <TabsContent value="wallets">
          <WalletAnalytics />
        </TabsContent>

        <TabsContent value="system">
          <SystemMonitoring />
        </TabsContent>

        <TabsContent value="realtime">
          <RealtimeUpdates />
        </TabsContent>
      </Tabs>
    </div>
  )
}
