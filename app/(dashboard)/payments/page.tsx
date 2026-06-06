'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { RefreshButton } from '@/components/refresh-button'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'

interface Payment {
  id: string
  order_id: string
  amount: number
  status: 'pending' | 'paid' | 'refunded' | 'failed'
  created_at: string
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  async function load(p: number, silent = false) {
    if (!silent) setLoading(true)
    try {
      const res = await api.get<{ items: Payment[]; total: number }>(`/admin/payments?page=${p}&limit=${limit}`)
      setPayments(res.items ?? [])
      setTotal(res.total ?? 0)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load payments')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => { load(page) }, [page])

  const { refresh, lastRefreshed, refreshing } = useAutoRefresh(() => load(page, true))

  async function handleRefund(id: string) {
    try {
      await api.post(`/admin/payments/${id}/refund`, {})
      toast.success('Refund initiated')
      load(page)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to process refund')
    }
  }

  const statusColor: Record<string, 'default' | 'secondary' | 'destructive'> = {
    paid: 'default', pending: 'secondary', failed: 'destructive', refunded: 'secondary',
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payments</h1>
        <RefreshButton onRefresh={refresh} lastRefreshed={lastRefreshed} refreshing={refreshing} />
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment ID</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.id.slice(0, 8)}…</TableCell>
                    <TableCell className="font-mono text-xs">{p.order_id?.slice(0, 8)}…</TableCell>
                    <TableCell>₹{p.amount?.toLocaleString()}</TableCell>
                    <TableCell><Badge variant={statusColor[p.status]}>{p.status}</Badge></TableCell>
                    <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      {p.status === 'paid' && (
                        <Button size="sm" variant="outline" onClick={() => handleRefund(p.id)}>
                          Refund
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {payments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No payments found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{total} total payments</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <Button variant="outline" size="sm" disabled={page * limit >= total} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
