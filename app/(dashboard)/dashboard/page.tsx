'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { StatCard } from '@/components/stat-card'

interface DashboardStats {
  revenue: { total: number; count: number }
  topProducts: { name: string; count: number }[]
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<{ data: DashboardStats }>('/admin/dashboard/stats')
      .then((res) => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

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
