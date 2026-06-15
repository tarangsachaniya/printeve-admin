'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { PlusIcon, Trash2Icon, PencilIcon, UploadIcon, XIcon, ListIcon } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { uploadToCloudinary } from '@/lib/cloudinary'
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

interface Category {
  id: string
  name: string
  slug: string
  image_url: string | null
  is_active: boolean
  sort_order: number
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)

  const [editCategory, setEditCategory] = useState<Category | null>(null)
  const [editName, setEditName] = useState('')
  const [editActive, setEditActive] = useState(true)
  const [editSortOrder, setEditSortOrder] = useState(0)
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [saving, setSaving] = useState(false)
  const imgInputRef = useRef<HTMLInputElement>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  function load() {
    api.get<{ items: Category[] }>('/admin/categories')
      .then(r => setCategories(r.items ?? []))
      .catch((err) => toast.error(err.message ?? 'Failed to load categories'))
  }

  useEffect(() => { load() }, [])

  async function add() {
    const val = newName.trim()
    if (!val) return
    setAdding(true)
    try {
      await api.post('/admin/categories', { name: val, sort_order: categories.length })
      setNewName('')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add category')
    } finally { setAdding(false) }
  }

  function openEdit(category: Category) {
    setEditCategory(category)
    setEditName(category.name)
    setEditActive(category.is_active)
    setEditSortOrder(category.sort_order)
    setEditImageUrl(category.image_url)
  }

  async function saveEdit() {
    if (!editCategory) return
    setSaving(true)
    try {
      await api.patch(`/admin/categories/${editCategory.id}`, {
        name: editName.trim(),
        is_active: editActive,
        sort_order: editSortOrder,
        image_url: editImageUrl,
      })
      setEditCategory(null)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update category')
    } finally { setSaving(false) }
  }

  async function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImage(true)
    try {
      const url = await uploadToCloudinary(file, 'image', 'printEve/categories')
      setEditImageUrl(url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Image upload failed')
    } finally {
      setUploadingImage(false)
      if (imgInputRef.current) imgInputRef.current.value = ''
    }
  }

  async function remove(id: string) {
    setDeleting(true)
    try {
      await api.delete(`/admin/categories/${id}`)
      setDeleteId(null)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete category')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Categories</h1>
        <p className="text-sm text-muted-foreground">Product categories shown in the storefront and used when creating products.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/20">
            <Input
              className="flex-1"
              placeholder="Category name, e.g. Business Cards"
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
                <TableHead className="w-12">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category, i) => (
                <TableRow key={category.id}>
                  <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                  <TableCell>
                    {category.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={category.image_url} alt="" className="h-8 w-8 rounded object-cover" />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{category.slug}</TableCell>
                  <TableCell>
                    <Badge variant={category.is_active ? 'default' : 'secondary'}>
                      {category.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/categories/${category.id}/fields`}
                        title="Manage fields"
                        className="text-muted-foreground hover:text-foreground transition-colors p-1"
                      >
                        <ListIcon className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => openEdit(category)}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(category.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {categories.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8 text-sm">
                    No categories yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editCategory} onOpenChange={open => !open && setEditCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Category Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), saveEdit())}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-sort">Sort Order</Label>
              <Input
                id="edit-sort"
                type="number"
                value={editSortOrder}
                onChange={e => setEditSortOrder(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Image</Label>
              <p className="text-xs text-muted-foreground">
                Optional. If no image is uploaded, the storefront falls back to a built-in icon.
              </p>
              <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
              {editImageUrl ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={editImageUrl} alt="" className="h-12 w-12 rounded object-cover border" />
                  <Button type="button" variant="outline" size="sm" onClick={() => imgInputRef.current?.click()} disabled={uploadingImage}>
                    {uploadingImage ? 'Uploading…' : 'Replace'}
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => setEditImageUrl(null)}>
                    <XIcon className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={() => imgInputRef.current?.click()} disabled={uploadingImage}>
                  <UploadIcon className="h-3.5 w-3.5 mr-1" />
                  {uploadingImage ? 'Uploading…' : 'Upload image'}
                </Button>
              )}
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
                Active — show in storefront and product forms
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCategory(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving || !editName.trim()}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete category?"
        description="This category will be permanently removed. Products using this category may be affected."
        loading={deleting}
        onConfirm={() => deleteId && remove(deleteId)}
      />
    </div>
  )
}
