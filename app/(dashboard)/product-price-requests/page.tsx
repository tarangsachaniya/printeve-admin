'use client'

import { useEffect, useState } from 'react'
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react'
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

interface VariantOption {
  id?: string
  paper_size_id?: string
  paper_quality_id?: string
  paper_type_id?: string
  name?: string
  price_modifier: number
}

interface QuantitySlab {
  id?: string
  min_qty: number
  max_qty: number | null
  price_modifier: number
  max_completion_minutes?: number | null
}

interface VariantConfig {
  paper_sizes: VariantOption[]
  paper_qualities: VariantOption[]
  paper_types: VariantOption[]
  quantity_slabs: QuantitySlab[]
}

interface RequestDetail {
  id: string
  base_price: number
  current_price: number | null
  variant_config: VariantConfig
  current_variant_config: VariantConfig
  notes?: string | null
  admin_notes?: string | null
  status: string
  printer_name?: string | null
  product_name?: string | null
}

const FILTERS = ['pending', 'approved', 'rejected', ''] as const

const EMPTY_VARIANT_CONFIG: VariantConfig = { paper_sizes: [], paper_qualities: [], paper_types: [], quantity_slabs: [] }

function formatModifier(v: number) {
  const n = Number(v)
  return `${n >= 0 ? '+' : ''}₹${n}`
}

function formatPrice(v: number) {
  return `₹${Number(v).toLocaleString('en-IN')}`
}

function PriceDelta({ from, to }: { from?: number | null; to?: number | null }) {
  if (from == null && to == null) return <span className="text-muted-foreground">—</span>
  if (from == null)
    return <Badge variant="outline" className="text-emerald-600 border-emerald-600/30 bg-emerald-600/10">New</Badge>
  if (to == null)
    return <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10">Removed</Badge>

  const diff = Number(to) - Number(from)
  if (diff === 0) return <span className="text-xs text-muted-foreground">No change</span>

  const Icon = diff > 0 ? ArrowUpIcon : ArrowDownIcon
  const color = diff > 0 ? 'text-emerald-600' : 'text-destructive'
  return (
    <span className={`inline-flex items-center justify-end gap-1 text-xs font-medium ${color}`}>
      <Icon className="h-3 w-3" />
      {formatModifier(diff)}
    </span>
  )
}

interface VariantRow {
  key: string
  name: string
  current?: number
  requested?: number
}

function mergeOptions(current: VariantOption[], requested: VariantOption[], idKey: keyof VariantOption, names: Map<string, string>): VariantRow[] {
  const rows = new Map<string, VariantRow>()

  current.forEach(o => {
    const id = (o[idKey] as string | undefined) ?? o.name ?? o.id
    if (!id) return
    rows.set(id, { key: id, name: o.name ?? names.get(id) ?? id, current: Number(o.price_modifier) })
  })

  requested.forEach(o => {
    const id = (o[idKey] as string | undefined) ?? o.name
    if (!id) return
    const existing = rows.get(id)
    const name = existing?.name ?? o.name ?? names.get(id) ?? id
    rows.set(id, { key: id, name, current: existing?.current, requested: Number(o.price_modifier) })
  })

  return Array.from(rows.values())
}

function buildNameMap(options: VariantOption[], idKey: keyof VariantOption) {
  const map = new Map<string, string>()
  options.forEach(o => {
    const id = o[idKey] as string | undefined
    if (id && o.name) map.set(id, o.name)
  })
  return map
}

function VariantDiffSection({ title, rows }: { title: string; rows: VariantRow[] }) {
  if (rows.length === 0) return null
  return (
    <section className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Option</TableHead>
              <TableHead className="text-right">Current</TableHead>
              <TableHead className="text-right">Requested</TableHead>
              <TableHead className="text-right">Change</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.key} className={r.current !== r.requested ? 'bg-primary/5' : undefined}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {r.current != null ? formatModifier(r.current) : '—'}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {r.requested != null ? formatModifier(r.requested) : '—'}
                </TableCell>
                <TableCell className="text-right"><PriceDelta from={r.current} to={r.requested} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}

interface SlabRow {
  key: string
  min_qty: number
  max_qty: number | null
  current?: QuantitySlab
  requested?: QuantitySlab
}

function mergeSlabs(current: QuantitySlab[], requested: QuantitySlab[]): SlabRow[] {
  const rows = new Map<string, SlabRow>()

  current.forEach(s => {
    const key = `${s.min_qty}-${s.max_qty ?? 'inf'}`
    rows.set(key, { key, min_qty: s.min_qty, max_qty: s.max_qty, current: s })
  })

  requested.forEach(s => {
    const key = `${s.min_qty}-${s.max_qty ?? 'inf'}`
    const existing = rows.get(key)
    rows.set(key, { key, min_qty: s.min_qty, max_qty: s.max_qty, current: existing?.current, requested: s })
  })

  return Array.from(rows.values()).sort((a, b) => a.min_qty - b.min_qty)
}

function QuantitySlabDiffSection({ rows }: { rows: SlabRow[] }) {
  if (rows.length === 0) return null
  return (
    <section className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quantity slabs</p>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Range</TableHead>
              <TableHead className="text-right">Current</TableHead>
              <TableHead className="text-right">Requested</TableHead>
              <TableHead className="text-right">Change</TableHead>
              <TableHead className="text-right">Completion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(r => {
              const cMod = r.current?.price_modifier
              const rMod = r.requested?.price_modifier
              const cMin = r.current?.max_completion_minutes
              const rMin = r.requested?.max_completion_minutes
              return (
                <TableRow key={r.key} className={cMod !== rMod ? 'bg-primary/5' : undefined}>
                  <TableCell className="font-medium">{r.min_qty}–{r.max_qty ?? '∞'}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {cMod != null ? formatModifier(cMod) : '—'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {rMod != null ? formatModifier(rMod) : '—'}
                  </TableCell>
                  <TableCell className="text-right"><PriceDelta from={cMod} to={rMod} /></TableCell>
                  <TableCell className="text-right text-muted-foreground text-xs">
                    {cMin ?? '—'}{rMin !== cMin ? ` → ${rMin ?? '—'}` : ''} min
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}

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
      const res = await api.get<RequestDetail>(`/admin/product-price-requests/${id}`)
      setDetail(res)
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

  const currentVC = detail?.current_variant_config ?? EMPTY_VARIANT_CONFIG
  const requestedVC = detail?.variant_config ?? EMPTY_VARIANT_CONFIG
  const sizeNames = buildNameMap(currentVC.paper_sizes, 'paper_size_id')
  const qualityNames = buildNameMap(currentVC.paper_qualities, 'paper_quality_id')
  const typeNames = buildNameMap(currentVC.paper_types, 'paper_type_id')

  const sizeRows = mergeOptions(currentVC.paper_sizes, requestedVC.paper_sizes, 'paper_size_id', sizeNames)
  const qualityRows = mergeOptions(currentVC.paper_qualities, requestedVC.paper_qualities, 'paper_quality_id', qualityNames)
  const typeRows = mergeOptions(currentVC.paper_types, requestedVC.paper_types, 'paper_type_id', typeNames)
  const slabRows = mergeSlabs(currentVC.quantity_slabs, requestedVC.quantity_slabs)

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
                    {r.current_price != null ? formatPrice(r.current_price) : '—'}
                  </TableCell>
                  <TableCell>{formatPrice(r.requested_price)}</TableCell>
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
          <SheetHeader className="px-6 pt-5 pb-4 border-b shrink-0 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <SheetTitle>Review price change request</SheetTitle>
              {detail && <Badge variant={statusVariant(detail.status)}>{detail.status}</Badge>}
            </div>
            {detail?.printer_name && (
              <p className="text-sm text-muted-foreground">
                From <span className="font-medium text-foreground">{detail.printer_name}</span> · {detail.product_name}
              </p>
            )}
          </SheetHeader>

          {detail && (
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              <section className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Base price</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Current</p>
                    <p className="text-lg font-semibold">
                      {detail.current_price != null ? formatPrice(detail.current_price) : '—'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Requested</p>
                    <p className="text-lg font-semibold">{formatPrice(detail.base_price)}</p>
                  </div>
                  <div className="rounded-lg border p-3 flex flex-col items-start justify-center gap-1">
                    <p className="text-xs text-muted-foreground">Change</p>
                    <PriceDelta from={detail.current_price} to={detail.base_price} />
                  </div>
                </div>
              </section>

              <VariantDiffSection title="Paper sizes" rows={sizeRows} />
              <VariantDiffSection title="Paper qualities" rows={qualityRows} />
              <VariantDiffSection title="Paper types" rows={typeRows} />
              <QuantitySlabDiffSection rows={slabRows} />

              {detail.notes && (
                <section className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Printer&apos;s notes</p>
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
