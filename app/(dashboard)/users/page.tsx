'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { validatePassword } from '@/lib/password'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { DataTableSearch, DataTablePagination } from '@/components/data-table-controls'
import { RefreshButton } from '@/components/refresh-button'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'

interface User {
  id: string
  email: string
  full_name: string
  status: 'active' | 'inactive' | 'banned'
  created_at: string
}

const emptyForm = { full_name: '', email: '', phone: '', password: '' }
const LIMIT = 25

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [pwError, setPwError] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function load(p: number, q: string, silent = false) {
    if (!silent) setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) })
      if (q) params.set('search', q)
      const res = await api.get<{ items: User[]; total: number }>(`/admin/users?${params}`)
      setUsers(res.items ?? [])
      setTotal(res.total ?? 0)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load users')
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

  async function handleBan(id: string) {
    try {
      await api.patch(`/admin/users/${id}/ban`, {})
      setUsers(prev => prev.map(u => u.id === id ? { ...u, status: 'banned' } : u))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to ban user')
    }
  }

  async function handleCreate() {
    const pwErr = validatePassword(form.password)
    if (pwErr) { setPwError(pwErr); return }
    setPwError('')
    setSaving(true)
    try {
      await api.post('/admin/users', form)
      toast.success('User created')
      setOpen(false)
      setForm(emptyForm)
      load(page, search)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  const statusColor: Record<string, 'default' | 'secondary' | 'destructive'> = {
    active: 'default', inactive: 'secondary', banned: 'destructive',
  }

  const pageCount = Math.max(1, Math.ceil(total / LIMIT))

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <div className="flex items-center gap-2">
          <RefreshButton onRefresh={refresh} lastRefreshed={lastRefreshed} refreshing={refreshing} />
          <Button onClick={() => { setForm(emptyForm); setPwError(''); setOpen(true) }}>Add User</Button>
        </div>
      </div>

      <DataTableSearch
        value={search}
        onChange={setSearch}
        total={total}
        filtered={total}
        placeholder="Search users…"
      />

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-3">
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={statusColor[u.status]}>{u.status}</Badge>
                    </TableCell>
                    <TableCell>{new Date(u.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      {u.status !== 'banned' && (
                        <Button variant="destructive" size="sm" onClick={() => handleBan(u.id)}>Ban</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {search ? 'No users match your search' : 'No users found'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DataTablePagination
            page={page}
            pageCount={pageCount}
            total={total}
            pageSize={LIMIT}
            onPageChange={(p) => { setPage(p); load(p, search) }}
          />
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input value={form.full_name} onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <PasswordInput value={form.password} onChange={(e) => { setForm(f => ({ ...f, password: e.target.value })); setPwError('') }} />
              {pwError && <p className="text-xs text-destructive">{pwError}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? 'Creating…' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
