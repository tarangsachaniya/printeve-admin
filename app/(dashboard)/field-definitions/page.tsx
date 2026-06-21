'use client'

import { useEffect, useRef, useState } from 'react'
import { PlusIcon, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent,
  AlertDialogHeader, AlertDialogFooter, AlertDialogTitle,
  AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { DataTableSearch, DataTablePagination } from '@/components/data-table-controls'

interface FieldOptionValue {
  id: string
  value: string
  sort_order: number
}

interface FieldDefinition {
  id: string
  key: string
  label: string
  field_type: string
  field_option_values?: FieldOptionValue[]
}

const FIELD_TYPES = [
  { value: 'select', label: 'Select (Dropdown)' },
  { value: 'multi_select', label: 'Multi Select' },
  { value: 'boolean', label: 'Boolean (Yes/No)' },
  { value: 'radio', label: 'Radio' },
  { value: 'number', label: 'Number' },
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'file_upload', label: 'File Upload' },
]

const OPTION_TYPES = ['select', 'multi_select', 'radio']
const LIMIT = 25

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

export default function FieldDefinitionsPage() {
  const [fields, setFields] = useState<FieldDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingField, setEditingField] = useState<FieldDefinition | null>(null)
  const [formLabel, setFormLabel] = useState('')
  const [formKey, setFormKey] = useState('')
  const [formFieldType, setFormFieldType] = useState('select')
  const [autoKey, setAutoKey] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formOptions, setFormOptions] = useState<{ id?: string; value: string }[]>([])
  const [newOptionValue, setNewOptionValue] = useState('')

  function load(p: number = page, q: string = search) {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) })
    if (q) params.set('search', q)
    api.get<{ items: FieldDefinition[]; total: number }>(`/admin/field-definitions?${params}`)
      .then(res => { setFields(res.items ?? []); setTotal(res.total ?? 0) })
      .catch(err => toast.error(err.message ?? 'Failed to load'))
      .finally(() => setLoading(false))
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

  function openCreate() {
    setEditingField(null)
    setFormLabel('')
    setFormKey('')
    setFormFieldType('select')
    setAutoKey(true)
    setFormOptions([])
    setNewOptionValue('')
    setDialogOpen(true)
  }

  function openEdit(field: FieldDefinition) {
    setEditingField(field)
    setFormLabel(field.label)
    setFormKey(field.key)
    setFormFieldType(field.field_type)
    setAutoKey(false)
    setFormOptions(
      (field.field_option_values ?? [])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(o => ({ id: o.id, value: o.value }))
    )
    setNewOptionValue('')
    setDialogOpen(true)
  }

  function addOption() {
    const v = newOptionValue.trim()
    if (!v) return
    if (formOptions.some(o => o.value.toLowerCase() === v.toLowerCase())) {
      toast.error('Option already exists')
      return
    }
    setFormOptions(prev => [...prev, { value: v }])
    setNewOptionValue('')
  }

  function removeOption(index: number) {
    setFormOptions(prev => prev.filter((_, i) => i !== index))
  }

  function updateOptionValue(index: number, value: string) {
    setFormOptions(prev => prev.map((o, i) => i === index ? { ...o, value } : o))
  }

  function handleLabelChange(value: string) {
    setFormLabel(value)
    if (autoKey) setFormKey(slugify(value))
  }

  async function handleSave() {
    if (!formLabel.trim() || !formKey.trim()) {
      toast.error('Label and Key are required')
      return
    }
    const hasOptions = OPTION_TYPES.includes(formFieldType)
    if (hasOptions && formOptions.length === 0 && !editingField) {
      toast.error('Add at least one option')
      return
    }
    setSaving(true)
    try {
      if (editingField) {
        await api.patch(`/admin/field-definitions/${editingField.id}`, {
          label: formLabel.trim(),
          key: formKey.trim(),
        })

        if (hasOptions) {
          const existing = editingField.field_option_values ?? []
          const existingIds = new Set(existing.map(o => o.id))
          const currentIds = new Set(formOptions.filter(o => o.id).map(o => o.id!))

          for (const old of existing) {
            if (!currentIds.has(old.id)) {
              await api.delete(`/admin/field-definitions/${editingField.id}/options/${old.id}`)
            }
          }

          for (const opt of formOptions) {
            if (opt.id && existingIds.has(opt.id)) {
              const original = existing.find(o => o.id === opt.id)
              if (original && original.value !== opt.value.trim()) {
                await api.put(`/admin/field-definitions/${editingField.id}/options/${opt.id}`, {
                  value: opt.value.trim(),
                  sort_order: formOptions.indexOf(opt),
                })
              }
            } else {
              await api.post(`/admin/field-definitions/${editingField.id}/options`, {
                value: opt.value.trim(),
                sort_order: formOptions.indexOf(opt),
              })
            }
          }
        }

        toast.success('Field definition updated')
      } else {
        const options = hasOptions ? formOptions.map(o => o.value.trim()) : undefined
        await api.post('/admin/field-definitions', {
          key: formKey.trim(),
          label: formLabel.trim(),
          field_type: formFieldType,
          options,
        })
        toast.success('Field definition created')
      }
      setDialogOpen(false)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/admin/field-definitions/${id}`)
      setFields(prev => prev.filter(f => f.id !== id))
      toast.success('Field definition deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Field Definitions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Global catalog of product options like Paper Size, Finish, Binding, etc.
          </p>
        </div>
        <Button onClick={openCreate}>
          <PlusIcon className="h-4 w-4 mr-1" /> Add Field Type
        </Button>
      </div>

      <DataTableSearch
        value={search}
        onChange={setSearch}
        total={total}
        filtered={total}
        placeholder="Search field definitions…"
      />

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-3">
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Options</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map(f => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.label}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{f.field_type}</Badge>
                  </TableCell>
                  <TableCell>
                    {OPTION_TYPES.includes(f.field_type) ? (
                      <span className="text-sm text-muted-foreground">
                        {f.field_option_values?.length ?? 0} option{(f.field_option_values?.length ?? 0) !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => openEdit(f)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete &quot;{f.label}&quot;?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove this field type and all its option values. Products using this field will lose their configuration.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(f.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {fields.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    {search ? 'No field definitions match your search' : 'No field definitions yet'}
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
            onPageChange={(p) => { setPage(p); load(p, search) }}
          />
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={open => { if (!open) setDialogOpen(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingField ? 'Edit Field Definition' : 'New Field Definition'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="fd-label">Label</Label>
              <Input
                id="fd-label"
                placeholder="e.g. Fold Type"
                value={formLabel}
                onChange={e => handleLabelChange(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fd-key">Key</Label>
              <Input
                id="fd-key"
                placeholder="e.g. fold_type"
                value={formKey}
                onChange={e => { setFormKey(e.target.value); setAutoKey(false) }}
                className="font-mono text-sm"
              />
            </div>
            {!editingField && (
              <div className="space-y-1.5">
                <Label>Field Type</Label>
                <Select value={formFieldType} onValueChange={v => { if (v) { setFormFieldType(v); if (!OPTION_TYPES.includes(v)) setFormOptions([]) } }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {OPTION_TYPES.includes(editingField?.field_type ?? formFieldType) && (
              <div className="space-y-2">
                <Label>Options</Label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {formOptions.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={opt.value}
                        onChange={e => updateOptionValue(i, e.target.value)}
                        className="text-sm h-8"
                        placeholder="Option value"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 shrink-0 text-destructive hover:text-destructive"
                        onClick={() => removeOption(i)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={newOptionValue}
                    onChange={e => setNewOptionValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOption() } }}
                    placeholder="Add new option…"
                    className="text-sm h-8"
                  />
                  <Button type="button" size="sm" variant="outline" className="h-8 shrink-0" onClick={addOption} disabled={!newOptionValue.trim()}>
                    <PlusIcon className="h-3.5 w-3.5 mr-1" /> Add
                  </Button>
                </div>
                {formOptions.length === 0 && (
                  <p className="text-xs text-muted-foreground">No options added yet</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !formLabel.trim() || !formKey.trim()}>
              {saving ? 'Saving…' : editingField ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
