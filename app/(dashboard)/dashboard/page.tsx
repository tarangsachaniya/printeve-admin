'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { StatCard } from '@/components/stat-card'
import { RefreshButton } from '@/components/refresh-button'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'

interface DashboardStats {
  revenue: { total: number; count: number }
  topProducts: { name: string; count: number }[]
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await api.get<{ data: DashboardStats }>('/admin/dashboard/stats')
      setStats(res.data)
    } catch {
      // ignore
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  const { refresh, lastRefreshed, refreshing } = useAutoRefresh(
    useCallback(() => fetchStats(true), [fetchStats])
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <RefreshButton onRefresh={refresh} lastRefreshed={lastRefreshed} refreshing={refreshing} />
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Revenue (30d)"
              value={stats?.revenue.total != null ? `₹${stats.revenue.total.toLocaleString()}` : '—'}
              description="Last 30 days"
            />
            <StatCard
              title="Orders (30d)"
              value={stats?.revenue.count ?? '—'}
              description="Last 30 days"
            />
          </div>

          {(stats?.topProducts?.length ?? 0) > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Top Products</h2>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {stats!.topProducts.map((p) => (
                  <StatCard key={p.name} title={p.name} value={p.count} description="orders" />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
