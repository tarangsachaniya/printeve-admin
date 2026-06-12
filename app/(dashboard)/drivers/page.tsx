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

interface DriverItem {
  id: string
  full_name: string
  email: string
  phone: string
  status: 'pending' | 'active' | 'suspended'
  created_at: string
}

const emptyForm = {
  full_name: '',
  email: '',
  phone: '',
  password: '',
}

const LIMIT = 25

export default function DriversPage() {
  const [drivers, setDrivers] = useState<DriverItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [pwError, setPwError] = useState('')

  const [resetTarget, setResetTarget] = useState<DriverItem | null>(null)
  const [resetPw, setResetPw] = useState('')
  const [resetPwError, setResetPwError] = useState('')
  const [resetting, setResetting] = useState(false)

  async function load(p: number, q: string, silent = false) {
    if (!silent) setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) })
      if (q) params.set('search', q)
      const res = await api.get<{ items: DriverItem[]; total: number }>(`/admin/drivers?${params}`)
      setDrivers(res.items ?? [])
      setTotal(res.total ?? 0)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load drivers')
    } finally {
      if (!silent) setLoading(false)
    }
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
      await api.patch(`/admin/drivers/${id}/approve`, {})
      setDrivers(prev => prev.map(d => d.id === id ? { ...d, status: 'active' } : d))
      toast.success('Driver approved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve driver')
    }
  }

  async function handleSuspend(id: string) {
    try {
      await api.patch(`/admin/drivers/${id}/suspend`, {})
      setDrivers(prev => prev.map(d => d.id === id ? { ...d, status: 'suspended' } : d))
      toast.success('Driver suspended')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to suspend driver')
    }
  }

  async function handleRevoke(id: string) {
    try {
      await api.patch(`/admin/drivers/${id}/revoke`, {})
      setDrivers(prev => prev.map(d => d.id === id ? { ...d, status: 'active' } : d))
      toast.success('Suspension revoked')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to revoke suspension')
    }
  }

  async function handleCreate() {
    if (!form.full_name || !form.email || !form.phone || !form.password) return
    const pwErr = validatePassword(form.password)
    if (pwErr) { setPwError(pwErr); return }
    setPwError('')
    setSaving(true)
    try {
      await api.post('/admin/drivers', {
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      })
      toast.success('Driver account created')
      setOpen(false)
      setForm(emptyForm)
      load(1, search)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create driver')
    } finally {
      setSaving(false)
    }
  }

  async function handleResetPassword() {
    const err = validatePassword(resetPw)
    if (err) { setResetPwError(err); return }
    setResetting(true)
    try {
      await api.patch(`/admin/drivers/${resetTarget!.id}/password`, { new_password: resetPw })
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
        <h1 className="text-2xl font-bold">Drivers</h1>
        <div className="flex items-center gap-2">
          <RefreshButton onRefresh={refresh} lastRefreshed={lastRefreshed} refreshing={refreshing} />
          <Button onClick={() => { setForm(emptyForm); setPwError(''); setOpen(true) }}>Add Driver</Button>
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
            placeholder="Search drivers…"
          />
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drivers.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{d.email}</TableCell>
                    <TableCell className="text-muted-foreground">{d.phone}</TableCell>
                    <TableCell><Badge variant={statusColor[d.status]}>{d.status}</Badge></TableCell>
                    <TableCell>{new Date(d.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right space-x-2">
                      {d.status === 'pending' && (
                        <Button size="sm" onClick={() => handleApprove(d.id)}>Approve</Button>
                      )}
                      {d.status === 'active' && (
                        <Button size="sm" variant="destructive" onClick={() => handleSuspend(d.id)}>Suspend</Button>
                      )}
                      {d.status === 'suspended' && (
                        <Button size="sm" variant="outline" onClick={() => handleRevoke(d.id)}>Revoke Suspension</Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => { setResetTarget(d); setResetPw(''); setResetPwError('') }}>
                        Reset Password
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {drivers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {search ? 'No drivers match your search' : 'No drivers found'}
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
            <SheetTitle>Add Driver</SheetTitle>
            <p className="text-sm text-muted-foreground">
              The driver will complete onboarding (address, documents, legal agreement) after first login.
            </p>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label>Full Name <span className="text-destructive">*</span></Label>
              <Input value={form.full_name} onChange={field('full_name')} placeholder="Ramesh Kumar" />
            </div>
            <div className="space-y-1.5">
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input type="email" value={form.email} onChange={field('email')} placeholder="driver@example.com" />
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
              disabled={saving || !form.full_name || !form.email || !form.phone || !form.password}
            >
              {saving ? 'Creating…' : 'Create Driver'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={!!resetTarget} onOpenChange={open => { if (!open) { setResetTarget(null); setResetPw(''); setResetPwError('') } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="text-center">
            <DialogTitle>Reset password</DialogTitle>
            {resetTarget && (
              <p className="text-sm text-muted-foreground">{resetTarget.full_name}</p>
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
