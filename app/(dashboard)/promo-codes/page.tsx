'use client'

import { useEffect, useState } from 'react'
import { PlusIcon, Trash2Icon, PencilIcon } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

interface Coupon {
  id: string
  code: string
  is_active: boolean
  start_date: string
  end_date: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  max_discount_cap: number | null
  minimum_purchase_amount: number | null
  global_usage_limit: number
  per_user_limit: number
  first_time_purchase_only: boolean
}

interface CouponForm {
  code: string
  is_active: boolean
  start_date: string
  end_date: string
  discount_type: 'percentage' | 'fixed'
  discount_value: string
  max_discount_cap: string
  minimum_purchase_amount: string
  global_usage_limit: string
  per_user_limit: string
  first_time_purchase_only: boolean
}

const EMPTY_FORM: CouponForm = {
  code: '',
  is_active: true,
  start_date: '',
  end_date: '',
  discount_type: 'percentage',
  discount_value: '',
  max_discount_cap: '',
  minimum_purchase_amount: '',
  global_usage_limit: '0',
  per_user_limit: '0',
  first_time_purchase_only: false,
}

function toDateInput(iso: string) {
  return iso ? iso.slice(0, 10) : ''
}

function toPayload(form: CouponForm) {
  return {
    code: form.code.trim(),
    is_active: form.is_active,
    start_date: `${form.start_date}T00:00:00.000Z`,
    end_date: `${form.end_date}T23:59:59.999Z`,
    discount_type: form.discount_type,
    discount_value: Number(form.discount_value),
    max_discount_cap: form.max_discount_cap.trim() !== '' ? Number(form.max_discount_cap) : null,
    minimum_purchase_amount: form.minimum_purchase_amount.trim() !== '' ? Number(form.minimum_purchase_amount) : null,
    global_usage_limit: Number(form.global_usage_limit || 0),
    per_user_limit: Number(form.per_user_limit || 0),
    first_time_purchase_only: form.first_time_purchase_only,
  }
}

export default function PromoCodesPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [dialogMode, setDialogMode] = useState<'add' | 'edit' | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<CouponForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  function load() {
    api.get<{ items: Coupon[] }>('/admin/coupons')
      .then(r => setCoupons(r.items ?? []))
      .catch(err => toast.error(err instanceof Error ? err.message : 'Failed to load promo codes'))
  }

  useEffect(() => { load() }, [])

  function openAdd() {
    setForm(EMPTY_FORM)
    setEditId(null)
    setDialogMode('add')
  }

  function openEdit(coupon: Coupon) {
    setForm({
      code: coupon.code,
      is_active: coupon.is_active,
      start_date: toDateInput(coupon.start_date),
      end_date: toDateInput(coupon.end_date),
      discount_type: coupon.discount_type,
      discount_value: String(coupon.discount_value),
      max_discount_cap: coupon.max_discount_cap != null ? String(coupon.max_discount_cap) : '',
      minimum_purchase_amount: coupon.minimum_purchase_amount != null ? String(coupon.minimum_purchase_amount) : '',
      global_usage_limit: String(coupon.global_usage_limit),
      per_user_limit: String(coupon.per_user_limit),
      first_time_purchase_only: coupon.first_time_purchase_only,
    })
    setEditId(coupon.id)
    setDialogMode('edit')
  }

  function close() {
    setDialogMode(null)
    setEditId(null)
  }

  async function save() {
    setSaving(true)
    try {
      const payload = toPayload(form)
      if (dialogMode === 'edit' && editId) {
        await api.put(`/admin/coupons/${editId}`, payload)
      } else {
        await api.post('/admin/coupons', payload)
      }
      close()
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save promo code')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    try {
      await api.delete(`/admin/coupons/${id}`)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete promo code')
    }
  }

  const canSave = form.code.trim() !== '' && form.start_date !== '' && form.end_date !== '' && form.discount_value.trim() !== ''

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Promo Codes</h1>
          <p className="text-sm text-muted-foreground">Discount coupons customers can apply at checkout.</p>
        </div>
        <Button onClick={openAdd}>
          <PlusIcon className="h-4 w-4 mr-1" /> Add Promo Code
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Validity</TableHead>
                <TableHead>Usage Limit</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map(coupon => (
                <TableRow key={coupon.id}>
                  <TableCell className="font-medium">{coupon.code}</TableCell>
                  <TableCell>
                    <Badge variant={coupon.is_active ? 'default' : 'secondary'}>
                      {coupon.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `₹${coupon.discount_value}`}
                    {coupon.max_discount_cap != null && (
                      <span className="text-muted-foreground"> (up to ₹{coupon.max_discount_cap})</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(coupon.start_date).toLocaleDateString()} – {new Date(coupon.end_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-sm">
                    {coupon.global_usage_limit === 0 ? '∞' : coupon.global_usage_limit}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(coupon)}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => remove(coupon.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {coupons.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8 text-sm">
                    No promo codes yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogMode !== null} onOpenChange={open => !open && close()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogMode === 'edit' ? 'Edit Promo Code' : 'Add Promo Code'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                placeholder="WELCOME10"
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                id="is_active"
                type="checkbox"
                checked={form.is_active}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <Label htmlFor="is_active" className="cursor-pointer">Active</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={form.start_date}
                  onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={form.end_date}
                  onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Discount Type</Label>
                <Select
                  value={form.discount_type}
                  onValueChange={v => setForm(f => ({ ...f, discount_type: v as 'percentage' | 'fixed' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="discount_value">
                  Discount Value {form.discount_type === 'percentage' ? '(%)' : '(₹)'}
                </Label>
                <Input
                  id="discount_value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.discount_value}
                  onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="max_discount_cap">Max Discount Cap (₹)</Label>
                <Input
                  id="max_discount_cap"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="No cap"
                  value={form.max_discount_cap}
                  onChange={e => setForm(f => ({ ...f, max_discount_cap: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="minimum_purchase_amount">Minimum Purchase (₹)</Label>
                <Input
                  id="minimum_purchase_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="No minimum"
                  value={form.minimum_purchase_amount}
                  onChange={e => setForm(f => ({ ...f, minimum_purchase_amount: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="global_usage_limit">Global Usage Limit</Label>
                <Input
                  id="global_usage_limit"
                  type="number"
                  min="0"
                  step="1"
                  value={form.global_usage_limit}
                  onChange={e => setForm(f => ({ ...f, global_usage_limit: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">0 = unlimited</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="per_user_limit">Per User Limit</Label>
                <Input
                  id="per_user_limit"
                  type="number"
                  min="0"
                  step="1"
                  value={form.per_user_limit}
                  onChange={e => setForm(f => ({ ...f, per_user_limit: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">0 = unlimited</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="first_time_purchase_only"
                type="checkbox"
                checked={form.first_time_purchase_only}
                onChange={e => setForm(f => ({ ...f, first_time_purchase_only: e.target.checked }))}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <Label htmlFor="first_time_purchase_only" className="cursor-pointer">
                First-time purchase only
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>Cancel</Button>
            <Button onClick={save} disabled={saving || !canSave}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
