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

interface PaperQuality { id: string; gsm: number; label: string | null }

export default function PaperQualitiesPage() {
  const [qualities, setQualities] = useState<PaperQuality[]>([])
  const [newGsm,   setNewGsm]   = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [adding,   setAdding]   = useState(false)

  function load() {
    api.get<{ items: PaperQuality[] }>('/admin/paper/qualities')
      .then(r => setQualities(r.items ?? []))
      .catch((err) => toast.error(err.message ?? 'Failed to load GSM values'))
  }

  useEffect(() => { load() }, [])

  async function add() {
    const gsm = Number(newGsm.trim())
    if (!gsm) return
    setAdding(true)
    try {
      await api.post('/admin/paper/qualities', { gsm, label: newLabel.trim() || null })
      setNewGsm(''); setNewLabel('')
      invalidatePaperCache()
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add GSM value')
    } finally { setAdding(false) }
  }

  async function remove(id: string) {
    try {
      await api.delete(`/admin/paper/qualities/${id}`)
      invalidatePaperCache()
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete GSM value')
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/paper" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeftIcon className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Paper GSM</h1>
          <p className="text-sm text-muted-foreground">Paper weight options used in product pricing.</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/20">
            <Input
              type="number"
              className="w-28 shrink-0"
              placeholder="GSM, e.g. 300"
              value={newGsm}
              onChange={e => setNewGsm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
            />
            <Input
              className="flex-1"
              placeholder="Label (optional), e.g. Thick, Standard"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
            />
            <Button size="sm" onClick={add} disabled={adding || !newGsm.trim()}>
              <PlusIcon className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>GSM</TableHead>
                <TableHead>Label</TableHead>
                <TableHead className="w-16 text-right">Delete</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {qualities.map(q => (
                <TableRow key={q.id}>
                  <TableCell className="font-medium">{q.gsm} gsm</TableCell>
                  <TableCell className="text-muted-foreground">{q.label ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    <button onClick={() => remove(q.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2Icon className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
              {qualities.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8 text-sm">No GSM values yet</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
