'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { StatCard } from '@/components/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RefreshButton } from '@/components/refresh-button'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'

interface RevenueSummary { total: number; count: number; average: number }
interface TopProduct { name: string; count: number; revenue: number }

export default function ReportsPage() {
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null)
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [loading, setLoading] = useState(true)

  function fetchReports(silent = false) {
    if (!silent) setLoading(true)
    return Promise.all([
      api.get<{ data: RevenueSummary }>('/admin/reports/revenue'),
      api.get<{ data: TopProduct[] }>('/admin/reports/top-products'),
    ])
      .then(([r, t]) => { setRevenue(r.data); setTopProducts(t.data ?? []) })
      .catch(() => {})
      .finally(() => { if (!silent) setLoading(false) })
  }

  useEffect(() => { fetchReports() }, [])

  const { refresh, lastRefreshed, refreshing } = useAutoRefresh(() => fetchReports(true))

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports</h1>
        <RefreshButton onRefresh={refresh} lastRefreshed={lastRefreshed} refreshing={refreshing} />
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard title="Total Revenue" value={revenue ? `₹${revenue.total.toLocaleString()}` : '—'} />
            <StatCard title="Total Orders" value={revenue?.count ?? '—'} />
            <StatCard title="Avg. Order Value" value={revenue ? `₹${Math.round(revenue.average).toLocaleString()}` : '—'} />
          </div>

          {topProducts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topProducts.map((p) => (
                    <div key={p.name} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{p.name}</span>
                      <div className="flex gap-6 text-muted-foreground">
                        <span>{p.count} orders</span>
                        <span>₹{p.revenue?.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
