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
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface City {
  id: string
  name: string
  state: string
  is_active: boolean
  sort_order: number
}

export default function CitiesPage() {
  const [cities,  setCities]  = useState<City[]>([])
  const [newName, setNewName] = useState('')
  const [adding,  setAdding]  = useState(false)

  const [editCity,  setEditCity]  = useState<City | null>(null)
  const [editName,  setEditName]  = useState('')
  const [editActive, setEditActive] = useState(true)
  const [saving,   setSaving]   = useState(false)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  function load() {
    api.get<{ items: City[] }>('/admin/cities')
      .then(r => setCities(r.items ?? []))
      .catch((err) => toast.error(err.message ?? 'Failed to load cities'))
  }

  useEffect(() => { load() }, [])

  async function add() {
    const val = newName.trim()
    if (!val) return
    setAdding(true)
    try {
      await api.post('/admin/cities', { name: val, sort_order: cities.length })
      setNewName('')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add city')
    } finally { setAdding(false) }
  }

  function openEdit(city: City) {
    setEditCity(city)
    setEditName(city.name)
    setEditActive(city.is_active)
  }

  async function saveEdit() {
    if (!editCity) return
    setSaving(true)
    try {
      await api.patch(`/admin/cities/${editCity.id}`, {
        name:      editName.trim(),
        is_active: editActive,
      })
      setEditCity(null)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update city')
    } finally { setSaving(false) }
  }

  async function remove(id: string) {
    setDeleting(true)
    try {
      await api.delete(`/admin/cities/${id}`)
      setDeleteId(null)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete city')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Cities</h1>
        <p className="text-sm text-muted-foreground">Gujarat cities available for city-based product pricing.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/20">
            <Input
              className="flex-1"
              placeholder="City name, e.g. Ahmedabad"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
            />
            <Button size="sm" onClick={add} disabled={adding || !newName.trim()}>
              <PlusIcon className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>City Name</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cities.map((city, i) => (
                <TableRow key={city.id}>
                  <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                  <TableCell className="font-medium">{city.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{city.state}</TableCell>
                  <TableCell>
                    <Badge variant={city.is_active ? 'default' : 'secondary'}>
                      {city.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(city)}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(city.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {cities.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-sm">
                    No cities yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editCity} onOpenChange={open => !open && setEditCity(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit City</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">City Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), saveEdit())}
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                id="edit-active"
                type="checkbox"
                checked={editActive}
                onChange={e => setEditActive(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <Label htmlFor="edit-active" className="cursor-pointer">
                Active — show in city pricing dropdowns
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCity(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving || !editName.trim()}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete city?"
        description="This city will be permanently removed and can no longer be used for city-based pricing."
        loading={deleting}
        onConfirm={() => deleteId && remove(deleteId)}
      />
    </div>
  )
}
