'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeftIcon, ArrowUpIcon, ArrowDownIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Combobox } from '@/components/ui/combobox'
import { Card, CardContent } from '@/components/ui/card'

interface FieldOptionValue { id: string; value: string; sort_order: number }
interface FieldDefinition {
  id: string
  key: string
  label: string
  field_type: 'select' | 'multi_select' | 'boolean' | 'number' | 'text'
  field_option_values: FieldOptionValue[]
}
interface CategoryField {
  id: string
  sort_order: number
  is_required: boolean
  field_definitions: FieldDefinition | null
}
interface Category { id: string; name: string; slug: string }

const FIELD_TYPES = ['select', 'multi_select', 'boolean', 'number', 'text'] as const

export default function CategoryFieldsPage() {
  const params = useParams<{ id: string }>()
  const categoryId = params.id

  const [category, setCategory] = useState<Category | null>(null)
  const [fields, setFields] = useState<CategoryField[]>([])
  const [catalog, setCatalog] = useState<FieldDefinition[]>([])
  const [pendingFieldId, setPendingFieldId] = useState('')
  const [adding, setAdding] = useState(false)

  const [newKey, setNewKey] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newType, setNewType] = useState<typeof FIELD_TYPES[number]>('select')
  const [newOptions, setNewOptions] = useState('')
  const [creatingDef, setCreatingDef] = useState(false)

  function load() {
    api.get<{ items: Category[] }>('/admin/categories')
      .then(r => setCategory((r.items ?? []).find(c => c.id === categoryId) ?? null))
      .catch(() => {})
    api.get<{ items: CategoryField[] }>(`/admin/categories/${categoryId}/fields`)
      .then(r => setFields(r.items ?? []))
      .catch(err => toast.error(err.message ?? 'Failed to load fields'))
    api.get<{ items: FieldDefinition[] }>('/admin/field-definitions')
      .then(r => setCatalog(r.items ?? []))
      .catch(() => {})
  }

  useEffect(() => { load() }, [categoryId])

  const assignedIds = new Set(fields.map(f => f.field_definitions?.id).filter(Boolean))
  const available = catalog.filter(f => !assignedIds.has(f.id))
  const sortedFields = [...fields].sort((a, b) => a.sort_order - b.sort_order)

  async function addField(fieldDefId: string) {
    if (!fieldDefId) return
    setAdding(true)
    try {
      await api.post(`/admin/categories/${categoryId}/fields`, {
        field_definition_id: fieldDefId,
        sort_order: fields.length,
        is_required: false,
      })
      setPendingFieldId('')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add field')
    } finally { setAdding(false) }
  }

  async function removeField(fieldId: string) {
    try {
      await api.delete(`/admin/categories/${categoryId}/fields/${fieldId}`)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove field')
    }
  }

  async function toggleRequired(field: CategoryField) {
    try {
      await api.put(`/admin/categories/${categoryId}/fields/${field.id}`, { is_required: !field.is_required })
      setFields(prev => prev.map(f => f.id === field.id ? { ...f, is_required: !f.is_required } : f))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update field')
    }
  }

  async function move(field: CategoryField, dir: -1 | 1) {
    const idx = sortedFields.findIndex(f => f.id === field.id)
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= sortedFields.length) return
    const a = sortedFields[idx]
    const b = sortedFields[swapIdx]
    try {
      await Promise.all([
        api.put(`/admin/categories/${categoryId}/fields/${a.id}`, { sort_order: b.sort_order }),
        api.put(`/admin/categories/${categoryId}/fields/${b.id}`, { sort_order: a.sort_order }),
      ])
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reorder')
    }
  }

  async function createFieldDefinition() {
    const key = newKey.trim()
    const label = newLabel.trim()
    if (!key || !label) return
    setCreatingDef(true)
    try {
      const options = newOptions.split(',').map(s => s.trim()).filter(Boolean)
      const res = await api.post<{ data: FieldDefinition }>('/admin/field-definitions', {
        key, label, field_type: newType,
        options: ['select', 'multi_select', 'boolean'].includes(newType) ? options : undefined,
      })
      setCatalog(prev => [...prev, res.data])
      setNewKey(''); setNewLabel(''); setNewOptions(''); setNewType('select')
      toast.success('Field type created')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create field type')
    } finally { setCreatingDef(false) }
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/products" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeftIcon className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Category Fields{category ? `: ${category.name}` : ''}</h1>
          <p className="text-sm text-muted-foreground">
            Fields shown on every product in this category (Finish, Binding, Lamination, etc.). Assign fields here,
            then configure each product&apos;s available options and price modifiers from the product editor.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/20">
            <Combobox
              options={available.map(f => ({ value: f.id, label: `${f.label} (${f.field_type})` }))}
              value={pendingFieldId}
              onValueChange={v => { setPendingFieldId(v); addField(v) }}
              placeholder="Add a field from the catalog…"
              searchPlaceholder="Search fields…"
              disabled={adding || available.length === 0}
            />
          </div>
          <div className="divide-y">
            {sortedFields.map((f, i) => (
              <div key={f.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex flex-col">
                  <button onClick={() => move(f, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                    <ArrowUpIcon className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => move(f, 1)} disabled={i === sortedFields.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                    <ArrowDownIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{f.field_definitions?.label ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">
                    {f.field_definitions?.field_type}
                    {f.field_definitions?.field_option_values?.length
                      ? ` · ${f.field_definitions.field_option_values.map(v => v.value).join(', ')}`
                      : ''}
                  </p>
                </div>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <input type="checkbox" className="h-3.5 w-3.5 accent-primary" checked={f.is_required} onChange={() => toggleRequired(f)} />
                  Required
                </label>
                <button onClick={() => removeField(f.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                  <Trash2Icon className="h-4 w-4" />
                </button>
              </div>
            ))}
            {sortedFields.length === 0 && (
              <p className="text-center text-muted-foreground py-8 text-sm">No fields assigned to this category yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div>
            <h2 className="text-sm font-semibold">Create a new field type</h2>
            <p className="text-xs text-muted-foreground">Adds to the global catalog so it can be assigned to any category.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Key</Label>
              <Input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="e.g. fold_type" />
            </div>
            <div className="space-y-1.5">
              <Label>Label</Label>
              <Input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="e.g. Fold Type" />
            </div>
            <div className="space-y-1.5">
              <Label>Field Type</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={newType}
                onChange={e => setNewType(e.target.value as typeof FIELD_TYPES[number])}
              >
                {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {['select', 'multi_select', 'boolean'].includes(newType) && (
              <div className="space-y-1.5">
                <Label>Options (comma separated)</Label>
                <Input value={newOptions} onChange={e => setNewOptions(e.target.value)} placeholder="e.g. Matte, Glossy, Velvet" />
              </div>
            )}
          </div>
          <Button onClick={createFieldDefinition} disabled={creatingDef || !newKey.trim() || !newLabel.trim()}>
            <PlusIcon className="h-3.5 w-3.5 mr-1" /> Create Field Type
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
