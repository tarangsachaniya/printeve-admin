'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useDataTable } from '@/lib/use-data-table'
import { DataTableSearch, DataTablePagination } from '@/components/data-table-controls'
import { validatePassword } from '@/lib/password'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { RefreshButton } from '@/components/refresh-button'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'

interface Admin {
  id: string
  email: string
  full_name: string
  status: string
  role: 'admin' | 'super_admin'
  created_at: string
}

const emptyForm = { full_name: '', email: '', phone: '', password: '', role: 'admin' as 'admin' | 'super_admin' }

export default function AdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const table = useDataTable(admins, ['full_name', 'email', 'role', 'status'] as (keyof Admin)[])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [pwError, setPwError] = useState('')

  async function load(silent = false) {
    if (!silent) setLoading(true)
    try {
      const res = await api.get<{ data: Admin[] }>('/admin/admins')
      setAdmins(res.data ?? [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load admins')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const { refresh, lastRefreshed, refreshing } = useAutoRefresh(() => load(true))

  async function handleCreate() {
    const pwErr = validatePassword(form.password)
    if (pwErr) { setPwError(pwErr); return }
    setPwError('')
    setSaving(true)
    try {
      await api.post('/admin/admins', form)
      toast.success('Admin created')
      setOpen(false)
      setForm(emptyForm)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create admin')
    } finally {
      setSaving(false)
    }
  }

  async function handleRevoke(id: string) {
    try {
      await api.delete(`/admin/admins/${id}`)
      setAdmins(prev => prev.filter(a => a.id !== id))
      toast.success('Admin access revoked')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to revoke admin')
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admins</h1>
        <div className="flex items-center gap-2">
          <RefreshButton onRefresh={refresh} lastRefreshed={lastRefreshed} refreshing={refreshing} />
          <Button onClick={() => { setForm(emptyForm); setPwError(''); setOpen(true) }}>Add Admin</Button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-3">
          <DataTableSearch
            value={table.search}
            onChange={table.setSearch}
            total={admins.length}
            filtered={table.total}
            placeholder="Search admin"
          />
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {table.rows.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.full_name}</TableCell>
                    <TableCell>{a.email}</TableCell>
                    <TableCell>
                      <Badge variant={a.role === 'super_admin' ? 'default' : 'secondary'}>
                        {a.role.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={a.status === 'active' ? 'default' : 'destructive'}>{a.status}</Badge>
                    </TableCell>
                    <TableCell>{new Date(a.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="destructive" size="sm" onClick={() => handleRevoke(a.id)}>
                        Revoke
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {table.rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {table.search ? 'No admins match your search' : 'No admins found'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DataTablePagination
            page={table.page}
            pageCount={table.pageCount}
            total={table.total}
            pageSize={table.pageSize}
            onPageChange={table.setPage}
          />
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Admin</DialogTitle>
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
              <Input type="password" value={form.password} onChange={(e) => { setForm(f => ({ ...f, password: e.target.value })); setPwError('') }} />
              {pwError && <p className="text-xs text-destructive">{pwError}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm(f => ({ ...f, role: v as 'admin' | 'super_admin' }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
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
