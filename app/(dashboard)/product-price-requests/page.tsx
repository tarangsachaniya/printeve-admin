'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet'

interface RequestRow {
  id: string
  requested_price: number
  current_price: number | null
  status: string
  created_at: string
  printer_name: string | null
  product_name: string | null
}

interface RequestDetail {
  id: string
  requested_price: number
  current_price: number | null
  current_paper_qualities: { gsm: number; price: number }[]
  current_paper_types: { type: string; price: number }[]
  current_quantity_tiers: { min_qty: number; max_qty: number | null; unit_price: number }[]
  base_price: number
  paper_qualities: { gsm: number; price: number }[]
  paper_types: { type: string; price: number }[]
  quantity_tiers: { min_qty: number; max_qty: number | null; unit_price: number }[]
  notes?: string | null
  admin_notes?: string | null
  status: string
  printer_name?: string | null
  product_name?: string | null
}

const FILTERS = ['pending', 'approved', 'rejected', ''] as const

export default function ProductPriceRequestsPage() {
  const [items, setItems] = useState<RequestRow[]>([])
  const [filter, setFilter] = useState<string>('pending')
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<RequestDetail | null>(null)
  const [rejectNotes, setRejectNotes] = useState('')
  const [acting, setActing] = useState(false)
  const [showReject, setShowReject] = useState(false)

  function load() {
    setLoading(true)
    const q = filter ? `?status=${filter}` : ''
    api.get<{ items: RequestRow[] }>(`/admin/product-price-requests${q}`)
      .then(r => setItems(r.items ?? []))
      .catch(err => toast.error(err.message ?? 'Failed to load requests'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter])

  useEffect(() => {
    if (selectedId) return
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [filter, selectedId])

  async function openDetail(id: string) {
    setSelectedId(id)
    setShowReject(false)
    setRejectNotes('')
    try {
      const res = await api.get<{ data: RequestDetail }>(`/admin/product-price-requests/${id}`)
      setDetail(res.data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load request')
      setSelectedId(null)
    }
  }

  async function approve() {
    if (!selectedId) return
    setActing(true)
    try {
      await api.patch(`/admin/product-price-requests/${selectedId}/approve`, {})
      toast.success('Price change approved and applied to product')
      setSelectedId(null)
      setDetail(null)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve')
    } finally {
      setActing(false)
    }
  }

  async function reject() {
    if (!selectedId || !rejectNotes.trim()) {
      toast.error('Rejection notes are required')
      return
    }
    setActing(true)
    try {
      await api.patch(`/admin/product-price-requests/${selectedId}/reject`, { admin_notes: rejectNotes })
      toast.success('Request rejected')
      setSelectedId(null)
      setDetail(null)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject')
    } finally {
      setActing(false)
    }
  }

  const statusVariant = (s: string) =>
    s === 'approved' ? 'default' : s === 'rejected' ? 'destructive' : 'secondary'

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Price change requests</h1>
        <div className="flex gap-2">
          {FILTERS.map(f => (
            <Button
              key={f || 'all'}
              size="sm"
              variant={filter === f ? 'default' : 'outline'}
              onClick={() => setFilter(f)}
            >
              {f === '' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Printer</TableHead>
                <TableHead>Current price</TableHead>
                <TableHead>Requested price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Review</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.product_name ?? '—'}</TableCell>
                  <TableCell>{r.printer_name ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.current_price != null ? `₹${Number(r.current_price).toLocaleString('en-IN')}` : '—'}
                  </TableCell>
                  <TableCell>₹{Number(r.requested_price).toLocaleString('en-IN')}</TableCell>
                  <TableCell><Badge variant={statusVariant(r.status)}>{r.status}</Badge></TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(r.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => openDetail(r.id)}>Review</Button>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No requests
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet open={!!selectedId} onOpenChange={open => { if (!open) { setSelectedId(null); setDetail(null) } }}>
        <SheetContent side="right" className="!w-[50vw] !max-w-none flex flex-col h-full p-0 overflow-hidden">
          <SheetHeader className="px-6 pt-5 pb-4 border-b shrink-0">
            <SheetTitle>Review price change request</SheetTitle>
            {detail?.printer_name && (
              <p className="text-sm text-muted-foreground">From {detail.printer_name} · {detail.product_name}</p>
            )}
          </SheetHeader>

          {detail && (
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              <section className="space-y-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Base price</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Current</p>
                    <p className="text-lg font-semibold">
                      {detail.current_price != null ? `₹${Number(detail.current_price).toLocaleString('en-IN')}` : '—'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Requested</p>
                    <p className="text-lg font-semibold">₹{Number(detail.base_price).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </section>

              {((detail.paper_qualities ?? []).length > 0 || (detail.current_paper_qualities ?? []).length > 0) && (
                <section className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Paper qualities</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Current</p>
                      <ul className="text-sm space-y-1">
                        {(detail.current_paper_qualities ?? []).map(q => (
                          <li key={q.gsm}>{q.gsm} gsm — ₹{q.price}</li>
                        ))}
                        {(detail.current_paper_qualities ?? []).length === 0 && <li className="text-muted-foreground">—</li>}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Requested</p>
                      <ul className="text-sm space-y-1">
                        {(detail.paper_qualities ?? []).map(q => (
                          <li key={q.gsm}>{q.gsm} gsm — ₹{q.price}</li>
                        ))}
                        {(detail.paper_qualities ?? []).length === 0 && <li className="text-muted-foreground">—</li>}
                      </ul>
                    </div>
                  </div>
                </section>
              )}

              {((detail.paper_types ?? []).length > 0 || (detail.current_paper_types ?? []).length > 0) && (
                <section className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Paper types</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Current</p>
                      <ul className="text-sm space-y-1">
                        {(detail.current_paper_types ?? []).map(t => (
                          <li key={t.type}>{t.type} — ₹{t.price}</li>
                        ))}
                        {(detail.current_paper_types ?? []).length === 0 && <li className="text-muted-foreground">—</li>}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Requested</p>
                      <ul className="text-sm space-y-1">
                        {(detail.paper_types ?? []).map(t => (
                          <li key={t.type}>{t.type} — ₹{t.price}</li>
                        ))}
                        {(detail.paper_types ?? []).length === 0 && <li className="text-muted-foreground">—</li>}
                      </ul>
                    </div>
                  </div>
                </section>
              )}

              {((detail.quantity_tiers ?? []).length > 0 || (detail.current_quantity_tiers ?? []).length > 0) && (
                <section className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Quantity tiers</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Current</p>
                      <ul className="text-sm space-y-1">
                        {(detail.current_quantity_tiers ?? []).map((t, i) => (
                          <li key={i}>{t.min_qty}–{t.max_qty ?? '∞'} @ ₹{t.unit_price}/unit</li>
                        ))}
                        {(detail.current_quantity_tiers ?? []).length === 0 && <li className="text-muted-foreground">—</li>}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Requested</p>
                      <ul className="text-sm space-y-1">
                        {(detail.quantity_tiers ?? []).map((t, i) => (
                          <li key={i}>{t.min_qty}–{t.max_qty ?? '∞'} @ ₹{t.unit_price}/unit</li>
                        ))}
                        {(detail.quantity_tiers ?? []).length === 0 && <li className="text-muted-foreground">—</li>}
                      </ul>
                    </div>
                  </div>
                </section>
              )}

              {detail.notes && (
                <section className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Printer&apos;s notes</p>
                  <p className="text-sm rounded-lg border px-4 py-3">{detail.notes}</p>
                </section>
              )}

              {showReject && detail.status === 'pending' && (
                <div className="space-y-1.5">
                  <Label>Rejection reason <span className="text-destructive">*</span></Label>
                  <textarea
                    className="w-full min-h-[80px] rounded-lg border px-3 py-2 text-sm"
                    value={rejectNotes}
                    onChange={e => setRejectNotes(e.target.value)}
                    placeholder="Explain why this request was not approved…"
                  />
                </div>
              )}

              {detail.status === 'rejected' && detail.admin_notes && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 space-y-1">
                  <p className="text-xs font-semibold uppercase text-destructive">Rejection reason</p>
                  <p className="text-sm">{detail.admin_notes}</p>
                </div>
              )}
            </div>
          )}

          {detail?.status === 'pending' && (
            <SheetFooter className="px-6 py-4 border-t shrink-0 flex-row gap-2">
              {showReject ? (
                <>
                  <Button variant="outline" className="flex-1" onClick={() => setShowReject(false)} disabled={acting}>Cancel</Button>
                  <Button variant="destructive" className="flex-1" onClick={reject} disabled={acting}>Confirm reject</Button>
                </>
              ) : (
                <>
                  <Button variant="outline" className="flex-1" onClick={() => setShowReject(true)} disabled={acting}>Reject</Button>
                  <Button className="flex-1" onClick={approve} disabled={acting}>
                    {acting ? 'Processing…' : 'Approve & apply'}
                  </Button>
                </>
              )}
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
