'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PlusIcon, Trash2Icon, ArrowLeftIcon } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'

type Unit = 'mm' | 'cm' | 'in'

interface PaperSize {
  id: string
  name: string
  sort_order: number
  width?: number | null
  height?: number | null
  unit?: Unit | null
}

function UnitToggle({ value, onChange }: { value: Unit; onChange: (u: Unit) => void }) {
  return (
    <div className="flex rounded-md border overflow-hidden shrink-0">
      {(['mm', 'cm', 'in'] as Unit[]).map(u => (
        <button
          key={u}
          type="button"
          onClick={() => onChange(u)}
          className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
            value === u
              ? 'bg-primary text-primary-foreground'
              : 'bg-background text-muted-foreground hover:bg-muted'
          }`}
        >
          {u}
        </button>
      ))}
    </div>
  )
}

export default function PaperSizesPage() {
  const [sizes, setSizes]     = useState<PaperSize[]>([])
  const [tab, setTab]         = useState<'named' | 'custom'>('named')
  const [newName, setNewName] = useState('')
  const [custWidth,  setCustWidth]  = useState('')
  const [custHeight, setCustHeight] = useState('')
  const [custUnit,   setCustUnit]   = useState<Unit>('mm')
  const [custName,   setCustName]   = useState('')
  const [adding, setAdding] = useState(false)

  function load() {
    api.get<{ items: PaperSize[] }>('/admin/paper/sizes')
      .then(r => setSizes(r.items ?? []))
      .catch(() => {})
  }

  useEffect(() => { load() }, [])

  async function addNamed() {
    const val = newName.trim()
    if (!val) return
    setAdding(true)
    try {
      await api.post('/admin/paper/sizes', { name: val, sort_order: sizes.length })
      setNewName('')
      load()
    } finally { setAdding(false) }
  }

  async function addCustom() {
    const w = Number(custWidth)
    const h = Number(custHeight)
    if (!w || !h) return
    const name = custName.trim() || `${custWidth}×${custHeight} ${custUnit}`
    setAdding(true)
    try {
      await api.post('/admin/paper/sizes', { name, width: w, height: h, unit: custUnit, sort_order: sizes.length })
      setCustWidth(''); setCustHeight(''); setCustName('')
      load()
    } finally { setAdding(false) }
  }

  async function remove(id: string) {
    await api.delete(`/admin/paper/sizes/${id}`)
    load()
  }

  function dimLabel(s: PaperSize) {
    if (s.width && s.height && s.unit) return `${s.width} × ${s.height} ${s.unit}`
    if (s.name === 'Custom') return 'User specifies at order'
    return '—'
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/paper" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeftIcon className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Paper Sizes</h1>
          <p className="text-sm text-muted-foreground">Standard named sizes and custom dimensions.</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Tab switcher */}
          <div className="flex border-b">
            {(['named', 'custom'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  tab === t
                    ? 'bg-primary/10 text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:bg-muted/50'
                }`}
              >
                {t === 'named' ? 'Named Size' : 'Custom Dimensions'}
              </button>
            ))}
          </div>

          {tab === 'named' ? (
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/20 border-b">
              <Input
                className="flex-1"
                placeholder="e.g. A4, A5, DL, Letter"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addNamed())}
              />
              <Button size="sm" onClick={addNamed} disabled={adding || !newName.trim()}>
                <PlusIcon className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
          ) : (
            <div className="px-4 py-3 bg-muted/20 space-y-3 border-b">
              <div className="flex items-end gap-2">
                <div className="space-y-1 flex-1">
                  <Label className="text-xs text-muted-foreground">Width</Label>
                  <Input type="number" placeholder="e.g. 210" value={custWidth} onChange={e => setCustWidth(e.target.value)} />
                </div>
                <div className="space-y-1 flex-1">
                  <Label className="text-xs text-muted-foreground">Height</Label>
                  <Input type="number" placeholder="e.g. 297" value={custHeight} onChange={e => setCustHeight(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Unit</Label>
                  <UnitToggle value={custUnit} onChange={setCustUnit} />
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  className="flex-1"
                  placeholder={`Display name (auto: ${custWidth || '0'}×${custHeight || '0'} ${custUnit})`}
                  value={custName}
                  onChange={e => setCustName(e.target.value)}
                />
                <Button size="sm" onClick={addCustom} disabled={adding || !custWidth || !custHeight}>
                  <PlusIcon className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Dimensions</TableHead>
                <TableHead className="w-16 text-right">Delete</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sizes.map((s, i) => (
                <TableRow key={s.id}>
                  <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{dimLabel(s)}</TableCell>
                  <TableCell className="text-right">
                    <button onClick={() => remove(s.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2Icon className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
              {sizes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8 text-sm">No sizes yet</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
