'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PlusIcon, Trash2Icon, ArrowLeftIcon } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { invalidatePaperCache } from '@/lib/paper-cache'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface PaperType { id: string; name: string; sort_order: number }

export default function PaperTypesPage() {
  const [types,   setTypes]   = useState<PaperType[]>([])
  const [newType, setNewType] = useState('')
  const [adding,  setAdding]  = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  function load() {
    api.get<{ items: PaperType[] }>('/admin/paper/types')
      .then(r => setTypes(r.items ?? []))
      .catch((err) => toast.error(err.message ?? 'Failed to load paper types'))
  }

  useEffect(() => { load() }, [])

  async function add() {
    const val = newType.trim()
    if (!val) return
    setAdding(true)
    try {
      await api.post('/admin/paper/types', { name: val, sort_order: types.length })
      setNewType('')
      invalidatePaperCache()
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add paper type')
    } finally { setAdding(false) }
  }

  async function remove(id: string) {
    setDeleting(true)
    try {
      await api.delete(`/admin/paper/types/${id}`)
      invalidatePaperCache()
      setDeleteId(null)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete paper type')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/paper" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeftIcon className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Paper Types</h1>
          <p className="text-sm text-muted-foreground">Paper types available for products.</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/20">
            <Input
              className="flex-1"
              placeholder="e.g. Matte, Glossy, UV, Silk, Recycled"
              value={newType}
              onChange={e => setNewType(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
            />
            <Button size="sm" onClick={add} disabled={adding || !newType.trim()}>
              <PlusIcon className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>Type Name</TableHead>
                <TableHead className="w-16 text-right">Delete</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.map((t, i) => (
                <TableRow key={t.id}>
                  <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-right">
                    <button onClick={() => setDeleteId(t.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2Icon className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
              {types.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8 text-sm">No types yet</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete paper type?"
        description="This paper type will be permanently removed and can no longer be used for products."
        loading={deleting}
        onConfirm={() => deleteId && remove(deleteId)}
      />
    </div>
  )
}
