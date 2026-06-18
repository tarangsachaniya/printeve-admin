'use client'

import { useEffect, useRef, useState } from 'react'
import { PlusIcon, PencilIcon, Trash2Icon, UploadIcon, XIcon, ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { uploadToCloudinary } from '@/lib/cloudinary'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface Category {
  id: string
  title: string
  slug: string
  icon_url: string | null
  short_description: string | null
  is_active: boolean
  sort_order: number
  product_count: number
  created_at: string
}

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [open, setOpen]       = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)

  const [title, setTitle]                     = useState('')
  const [slug, setSlug]                       = useState('')
  const [iconUrl, setIconUrl]                 = useState('')
  const [shortDescription, setShortDescription] = useState('')
  const [sortOrder, setSortOrder]             = useState('0')
  const [isActive, setIsActive]               = useState(true)
  const [saving, setSaving]                   = useState(false)
  const [uploading, setUploading]             = useState(false)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const autoSlug = useRef(true)

  function load() {
    api.get<{ items: Category[] }>('/admin/categories')
      .then(r => setCategories(r.items ?? []))
      .catch(err => toast.error(err.message ?? 'Failed to load categories'))
  }

  useEffect(() => { load() }, [])

  function resetForm() {
    setTitle('')
    setSlug('')
    setIconUrl('')
    setShortDescription('')
    setSortOrder('0')
    setIsActive(true)
    autoSlug.current = true
  }

  function openNew() {
    setEditing(null)
    resetForm()
    setSortOrder(String(categories.length))
    setOpen(true)
  }

  function openEdit(cat: Category) {
    setEditing(cat)
    setTitle(cat.title)
    setSlug(cat.slug)
    setIconUrl(cat.icon_url ?? '')
    setShortDescription(cat.short_description ?? '')
    setSortOrder(String(cat.sort_order))
    setIsActive(cat.is_active)
    autoSlug.current = false
    setOpen(true)
  }

  function handleTitleChange(value: string) {
    setTitle(value)
    if (autoSlug.current && !editing) {
      setSlug(slugify(value))
    }
  }

  async function handleIconUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadToCloudinary(file, 'image', 'printEve/categories')
      setIconUrl(url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleSave() {
    if (!title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    try {
      const body = {
        title: title.trim(),
        slug: slug.trim() || undefined,
        icon_url: iconUrl || null,
        short_description: shortDescription.trim() || null,
        sort_order: Number(sortOrder) || 0,
        is_active: isActive,
      }
      if (editing) {
        await api.patch(`/admin/categories/${editing.id}`, body)
        toast.success('Category updated')
      } else {
        await api.post('/admin/categories', body)
        toast.success('Category created')
      }
      setOpen(false)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true)
    try {
      await api.delete(`/admin/categories/${id}`)
      toast.success('Category deleted')
      setDeleteId(null)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-sm text-muted-foreground">Manage product categories for the storefront.</p>
        </div>
        <Button onClick={openNew}>
          <PlusIcon className="h-4 w-4 mr-1" /> Add Category
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Icon</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-20 text-center">Order</TableHead>
              <TableHead className="w-24 text-center">Status</TableHead>
              <TableHead className="w-24 text-center">Products</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  No categories yet. Click &quot;Add Category&quot; to create one.
                </TableCell>
              </TableRow>
            )}
            {categories.map(cat => (
              <TableRow key={cat.id}>
                <TableCell>
                  {cat.icon_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cat.icon_url} alt="" className="h-8 w-8 rounded object-contain" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{cat.title}</TableCell>
                <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                  {cat.short_description ?? '—'}
                </TableCell>
                <TableCell className="text-center">{cat.sort_order}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={cat.is_active ? 'default' : 'secondary'}>
                    {cat.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">{cat.product_count}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}>
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(cat.id)}>
                      <Trash2Icon className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create / Edit Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent style={{ width: '420px' }}>
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit Category' : 'New Category'}</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-5">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input
                value={title}
                onChange={e => handleTitleChange(e.target.value)}
                placeholder="e.g. Marketing Materials"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input
                value={slug}
                onChange={e => { setSlug(e.target.value); autoSlug.current = false }}
                placeholder="auto-generated"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Icon / Image</Label>
              {iconUrl ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={iconUrl} alt="" className="h-14 w-14 rounded-lg border object-contain p-1" />
                  <Button variant="ghost" size="sm" onClick={() => setIconUrl('')}>
                    <XIcon className="h-4 w-4 mr-1" /> Remove
                  </Button>
                </div>
              ) : (
                <div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*,.svg"
                    className="hidden"
                    onChange={handleIconUpload}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                  >
                    <UploadIcon className="h-4 w-4 mr-1" />
                    {uploading ? 'Uploading...' : 'Upload Icon'}
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Short Description</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={shortDescription}
                onChange={e => setShortDescription(e.target.value)}
                placeholder="A brief description of this category"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={sortOrder}
                  onChange={e => setSortOrder(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <label className="flex items-center gap-2 h-10 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={e => setIsActive(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm">Active</span>
                </label>
              </div>
            </div>
          </div>

          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !title.trim()}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={open => !open && setDeleteId(null)}
        title="Delete category?"
        description="Products in this category will be unassigned (not deleted)."
        confirmLabel="Delete"
        onConfirm={() => deleteId && handleDelete(deleteId)}
        loading={deleting}
      />
    </div>
  )
}
