'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
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

export default function PrintersPage() {
  const [printers, setPrinters] = useState<PrinterItem[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  function load() {
    setLoading(true)
    api.get<{ items: PrinterItem[] }>('/admin/printers')
      .then(res => setPrinters(res.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleApprove(id: string) {
    await api.patch(`/admin/printers/${id}/approve`, {})
    load()
  }

  async function handleSuspend(id: string) {
    await api.patch(`/admin/printers/${id}/suspend`, {})
    load()
  }

  async function handleCreate() {
    if (!form.business_name || !form.email || !form.phone || !form.password) return
    setSaving(true)
    try {
      await api.post('/admin/printers', {
        business_name: form.business_name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      })
      setOpen(false)
      setForm(emptyForm)
      load()
    } finally {
      setSaving(false)
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
        <Button onClick={() => { setForm(emptyForm); setOpen(true) }}>Add Printer</Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
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
                  </TableCell>
                </TableRow>
              ))}
              {printers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No printers found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="!w-[420px] flex flex-col h-full p-0">
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
              <Input value={form.phone} onChange={field('phone')} placeholder="+91 98765 43210" />
            </div>
            <div className="space-y-1.5">
              <Label>Password <span className="text-destructive">*</span></Label>
              <Input type="password" value={form.password} onChange={field('password')} placeholder="Temporary password" />
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
    </div>
  )
}
