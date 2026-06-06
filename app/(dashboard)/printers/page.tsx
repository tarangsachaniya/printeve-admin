'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { DataTableSearch, DataTablePagination } from '@/components/data-table-controls'
import { validatePassword } from '@/lib/password'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet'
import { RefreshButton } from '@/components/refresh-button'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'

interface PrinterItem {
  id: string
  business_name: string
  email: string
  phone: string
  status: 'pending' | 'active' | 'suspended'
  created_at: string
}

const emptyForm = {
  business_name: '',
  email: '',
  phone: '',
  password: '',
}

const LIMIT = 25

export default function PrintersPage() {
  const [printers, setPrinters] = useState<PrinterItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [pwError, setPwError] = useState('')

  const [resetTarget, setResetTarget] = useState<PrinterItem | null>(null)
  const [resetPw, setResetPw] = useState('')
  const [resetPwError, setResetPwError] = useState('')
  const [resetting, setResetting] = useState(false)

  function load(p: number, q: string, silent = false) {
    if (!silent) setLoading(true)
    const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) })
    if (q) params.set('search', q)
    api.get<{ items: PrinterItem[]; total: number }>(`/admin/printers?${params}`)
      .then(res => { setPrinters(res.items ?? []); setTotal(res.total ?? 0) })
      .catch((err) => toast.error(err.message ?? 'Failed to load printers'))
      .finally(() => { if (!silent) setLoading(false) })
  }

  useEffect(() => { load(page, search) }, [page])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      load(1, search)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  const { refresh, lastRefreshed, refreshing } = useAutoRefresh(() => load(page, search, true))

  async function handleApprove(id: string) {
    try {
      await api.patch(`/admin/printers/${id}/approve`, {})
      setPrinters(prev => prev.map(p => p.id === id ? { ...p, status: 'active' } : p))
      toast.success('Printer approved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve printer')
    }
  }

  async function handleSuspend(id: string) {
    try {
      await api.patch(`/admin/printers/${id}/suspend`, {})
      setPrinters(prev => prev.map(p => p.id === id ? { ...p, status: 'suspended' } : p))
      toast.success('Printer suspended')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to suspend printer')
    }
  }

  async function handleRevoke(id: string) {
    try {
      await api.patch(`/admin/printers/${id}/revoke`, {})
      setPrinters(prev => prev.map(p => p.id === id ? { ...p, status: 'active' } : p))
      toast.success('Suspension revoked')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to revoke suspension')
    }
  }

  async function handleCreate() {
    if (!form.business_name || !form.email || !form.phone || !form.password) return
    const pwErr = validatePassword(form.password)
    if (pwErr) { setPwError(pwErr); return }
    setPwError('')
    setSaving(true)
    try {
      await api.post('/admin/printers', {
        business_name: form.business_name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      })
      toast.success('Printer account created')
      setOpen(false)
      setForm(emptyForm)
      load(1, search)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create printer')
    } finally {
      setSaving(false)
    }
  }

  async function handleResetPassword() {
    const err = validatePassword(resetPw)
    if (err) { setResetPwError(err); return }
    setResetting(true)
    try {
      await api.patch(`/admin/printers/${resetTarget!.id}/password`, { new_password: resetPw })
      toast.success('Password reset')
      setResetTarget(null)
      setResetPw('')
      setResetPwError('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reset password')
    } finally {
      setResetting(false)
    }
  }

  function field(key: keyof typeof emptyForm) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))
  }

  const statusColor: Record<string, 'default' | 'secondary' | 'destructive'> = {
    active: 'default', pending: 'secondary', suspended: 'destructive',
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Printers</h1>
        <div className="flex items-center gap-2">
          <RefreshButton onRefresh={refresh} lastRefreshed={lastRefreshed} refreshing={refreshing} />
          <Button onClick={() => { setForm(emptyForm); setPwError(''); setOpen(true) }}>Add Printer</Button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-3">
          <DataTableSearch
            value={search}
            onChange={setSearch}
            total={total}
            filtered={total}
            placeholder="Search printers…"
          />
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {printers.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.business_name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.email}</TableCell>
                    <TableCell className="text-muted-foreground">{p.phone}</TableCell>
                    <TableCell><Badge variant={statusColor[p.status]}>{p.status}</Badge></TableCell>
                    <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right space-x-2">
                      {p.status === 'pending' && (
                        <Button size="sm" onClick={() => handleApprove(p.id)}>Approve</Button>
                      )}
                      {p.status === 'active' && (
                        <Button size="sm" variant="destructive" onClick={() => handleSuspend(p.id)}>Suspend</Button>
                      )}
                      {p.status === 'suspended' && (
                        <Button size="sm" variant="outline" onClick={() => handleRevoke(p.id)}>Revoke Suspension</Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => { setResetTarget(p); setResetPw(''); setResetPwError('') }}>
                        Reset Password
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {printers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {search ? 'No printers match your search' : 'No printers found'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DataTablePagination
            page={page}
            pageCount={Math.max(1, Math.ceil(total / LIMIT))}
            total={total}
            pageSize={LIMIT}
            onPageChange={(p: number) => { setPage(p); load(p, search) }}
          />
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="!w-[50vw] !max-w-none flex flex-col h-full p-0">
          <SheetHeader className="px-6 pt-5 pb-4 border-b shrink-0">
            <SheetTitle>Add Printer</SheetTitle>
            <p className="text-sm text-muted-foreground">
              The printer will complete shop details (location, products, bank info) after first login.
            </p>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label>Business Name <span className="text-destructive">*</span></Label>
              <Input value={form.business_name} onChange={field('business_name')} placeholder="Ace Print Shop" />
            </div>
            <div className="space-y-1.5">
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input type="email" value={form.email} onChange={field('email')} placeholder="printer@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone <span className="text-destructive">*</span></Label>
              <Input value={form.phone} onChange={field('phone')} placeholder="9876543210" />
            </div>
            <div className="space-y-1.5">
              <Label>Password <span className="text-destructive">*</span></Label>
              <Input type="password" value={form.password} onChange={(e) => { setForm(f => ({ ...f, password: e.target.value })); setPwError('') }} placeholder="Min. 8 chars, uppercase, number, symbol" />
              {pwError && <p className="text-xs text-destructive">{pwError}</p>}
            </div>
          </div>

          <SheetFooter className="px-6 py-4 border-t shrink-0 flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button
              className="flex-1"
              onClick={handleCreate}
              disabled={saving || !form.business_name || !form.email || !form.phone || !form.password}
            >
              {saving ? 'Creating…' : 'Create Printer'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={!!resetTarget} onOpenChange={open => { if (!open) { setResetTarget(null); setResetPw(''); setResetPwError('') } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="text-center">
            <DialogTitle>Reset password</DialogTitle>
            {resetTarget && (
              <p className="text-sm text-muted-foreground">{resetTarget.business_name}</p>
            )}
          </DialogHeader>
          <div className="py-2 space-y-1.5">
            <Label>New password</Label>
            <Input
              type="password"
              value={resetPw}
              onChange={e => { setResetPw(e.target.value); setResetPwError('') }}
              placeholder="Min. 8 chars, uppercase, number, symbol"
            />
            {resetPwError && <p className="text-xs text-destructive">{resetPwError}</p>}
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setResetTarget(null)} disabled={resetting}>Cancel</Button>
            <Button className="flex-1" onClick={handleResetPassword} disabled={resetting || !resetPw}>
              {resetting ? 'Saving…' : 'Save password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
