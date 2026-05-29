'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { validatePassword } from '@/lib/password'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'

interface User {
  id: string
  email: string
  full_name: string
  status: 'active' | 'inactive' | 'banned'
  created_at: string
}

const emptyForm = { full_name: '', email: '', phone: '', password: '' }

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [pwError, setPwError] = useState('')
  const limit = 20

  function load(p: number) {
    setLoading(true)
    api.get<{ items: User[]; total: number }>(`/admin/users?page=${p}&limit=${limit}`)
      .then((res) => { setUsers(res.items); setTotal(res.total) })
      .catch((err) => toast.error(err.message ?? 'Failed to load users'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(page) }, [page])

  async function handleBan(id: string) {
    try {
      await api.patch(`/admin/users/${id}/ban`, {})
      load(page)
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
      load(page)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  const statusColor: Record<string, 'default' | 'secondary' | 'destructive'> = {
    active: 'default', inactive: 'secondary', banned: 'destructive',
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <Button onClick={() => { setForm(emptyForm); setPwError(''); setOpen(true) }}>Add User</Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <>
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
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleBan(u.id)}
                        >
                          Ban
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{total} total users</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <Button variant="outline" size="sm" disabled={page * limit >= total} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        </>
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
              <Input type="password" value={form.password} onChange={(e) => { setForm(f => ({ ...f, password: e.target.value })); setPwError('') }} />
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
