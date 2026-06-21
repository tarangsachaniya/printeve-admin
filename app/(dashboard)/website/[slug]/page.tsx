'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  PlusIcon, PencilIcon, Trash2Icon, GripVertical, ChevronDown, ChevronUp,
  UploadIcon, XIcon, Eye, EyeOff, ArrowLeft,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { uploadToCloudinary } from '@/lib/cloudinary'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface CmsPage { id: string; title: string; slug: string; is_active: boolean }
interface CmsSection { id: string; key: string; title: string | null; subtitle: string | null; layout: string; content: unknown; settings: unknown; is_active: boolean; sort_order: number; items: CmsItem[] }
interface CmsItem { id: string; title: string | null; subtitle: string | null; content: string | null; image_url: string | null; icon: string | null; link_url: string | null; link_label: string | null; metadata: Record<string, unknown>; is_active: boolean; sort_order: number }

export default function PageEditorPage() {
  const { slug } = useParams<{ slug: string }>()
  const [page, setPage] = useState<CmsPage | null>(null)
  const [sections, setSections] = useState<CmsSection[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editItem, setEditItem] = useState<{ sectionId: string; item: CmsItem | null } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'section' | 'item'; id: string } | null>(null)
  const dragRef = useRef<number | null>(null)

  function load() {
    setLoading(true)
    api.get<{ items: { id: string; title: string; slug: string; is_active: boolean; section_count: number }[] }>('/admin/website/pages')
      .then(r => {
        const p = (r.items ?? []).find(pg => pg.slug === slug)
        if (p) {
          setPage(p)
          return api.get<{ items: CmsSection[] }>(`/admin/website/pages/${p.id}/sections`)
        }
        return null
      })
      .then(r => { if (r) setSections(r.items ?? []) })
      .catch(err => toast.error(err.message ?? 'Failed to load'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [slug])

  async function toggleSection(section: CmsSection) {
    try {
      await api.patch(`/admin/website/sections/${section.id}`, { is_active: !section.is_active })
      load()
      toast.success(`Section ${section.is_active ? 'disabled' : 'enabled'}`)
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed') }
  }

  async function updateSectionField(sectionId: string, field: string, value: unknown) {
    try {
      await api.patch(`/admin/website/sections/${sectionId}`, { [field]: value })
      load()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed') }
  }

  async function reorderSections(from: number, to: number) {
    const next = [...sections]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setSections(next)
    try {
      await api.patch('/admin/website/sections/reorder', {
        items: next.map((s, i) => ({ id: s.id, sort_order: i })),
      })
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Reorder failed') }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    try {
      if (deleteTarget.type === 'section') {
        await api.delete(`/admin/website/sections/${deleteTarget.id}`)
      } else {
        await api.delete(`/admin/website/items/${deleteTarget.id}`)
      }
      toast.success('Deleted')
      setDeleteTarget(null)
      load()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Delete failed') }
  }

  if (loading) return <div className="p-6 py-20 text-center text-muted-foreground">Loading...</div>
  if (!page) return <div className="p-6 py-20 text-center text-muted-foreground">Page &quot;{slug}&quot; not found. Run the seed script.</div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/website" className="flex size-8 items-center justify-center rounded-md border hover:bg-muted transition-colors">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{page.title}</h1>
          <p className="text-sm text-muted-foreground">/{page.slug} &middot; {sections.length} section{sections.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="space-y-4">
        {sections.map((section, idx) => (
          <Card key={section.id} className={cn(!section.is_active && 'opacity-60')}>
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer"
              onClick={() => setExpanded(expanded === section.id ? null : section.id)}
            >
              <div
                className="cursor-grab"
                draggable
                onDragStart={() => { dragRef.current = idx }}
                onDragOver={e => e.preventDefault()}
                onDrop={() => {
                  if (dragRef.current != null && dragRef.current !== idx) reorderSections(dragRef.current, idx)
                  dragRef.current = null
                }}
                onClick={e => e.stopPropagation()}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{section.title || section.key}</span>
                  <Badge variant="secondary" className="text-[10px]">{section.layout}</Badge>
                  {!section.is_active && <Badge variant="outline" className="text-[10px]">Hidden</Badge>}
                </div>
                <p className="text-xs text-muted-foreground truncate">{section.subtitle ?? `key: ${section.key}`}</p>
              </div>
              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                <Button variant="ghost" size="icon" onClick={() => toggleSection(section)} title={section.is_active ? 'Hide' : 'Show'}>
                  {section.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ type: 'section', id: section.id })}>
                  <Trash2Icon className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              {expanded === section.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>

            {expanded === section.id && (
              <CardContent className="border-t pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Title</Label>
                    <Input
                      defaultValue={section.title ?? ''}
                      onBlur={e => { if (e.target.value !== (section.title ?? '')) updateSectionField(section.id, 'title', e.target.value || null) }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Subtitle</Label>
                    <Input
                      defaultValue={section.subtitle ?? ''}
                      onBlur={e => { if (e.target.value !== (section.subtitle ?? '')) updateSectionField(section.id, 'subtitle', e.target.value || null) }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Items ({section.items.length})</Label>
                    <Button size="sm" variant="outline" onClick={() => setEditItem({ sectionId: section.id, item: null })}>
                      <PlusIcon className="h-3.5 w-3.5 mr-1" /> Add Item
                    </Button>
                  </div>
                  {section.items.map(item => (
                    <div key={item.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                      <span className="flex-1 truncate">{item.title || item.content?.slice(0, 50) || '(untitled)'}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditItem({ sectionId: section.id, item })}>
                        <PencilIcon className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTarget({ type: 'item', id: item.id })}>
                        <Trash2Icon className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {editItem && (
        <ItemEditSheet
          sectionId={editItem.sectionId}
          item={editItem.item}
          onClose={() => setEditItem(null)}
          onSaved={() => { setEditItem(null); load() }}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={open => !open && setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.type}?`}
        description={deleteTarget?.type === 'section' ? 'This section and all its items will be deleted.' : 'This item will be deleted.'}
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}

function ItemEditSheet({ sectionId, item, onClose, onSaved }: { sectionId: string; item: CmsItem | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(item?.title ?? '')
  const [subtitle, setSubtitle] = useState(item?.subtitle ?? '')
  const [content, setContent] = useState(item?.content ?? '')
  const [imageUrl, setImageUrl] = useState(item?.image_url ?? '')
  const [icon, setIcon] = useState(item?.icon ?? '')
  const [linkUrl, setLinkUrl] = useState(item?.link_url ?? '')
  const [linkLabel, setLinkLabel] = useState(item?.link_label ?? '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadToCloudinary(file, 'image', 'printEve/cms')
      setImageUrl(url)
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Upload failed') }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const body = {
        title: title || null, subtitle: subtitle || null, content: content || null,
        image_url: imageUrl || null, icon: icon || null, link_url: linkUrl || null, link_label: linkLabel || null,
      }
      if (item) {
        await api.patch(`/admin/website/items/${item.id}`, body)
      } else {
        await api.post(`/admin/website/sections/${sectionId}/items`, body)
      }
      toast.success(item ? 'Item updated' : 'Item created')
      onSaved()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed') }
    finally { setSaving(false) }
  }

  return (
    <Sheet open onOpenChange={open => !open && onClose()}>
      <SheetContent className="flex flex-col h-full p-0" style={{ width: '420px' }}>
        <SheetHeader className="px-6 pt-5 pb-4 border-b shrink-0">
          <SheetTitle>{item ? 'Edit Item' : 'New Item'}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="space-y-1.5"><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Subtitle</Label><Input value={subtitle} onChange={e => setSubtitle(e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label>Content</Label>
            <textarea
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={content} onChange={e => setContent(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Image</Label>
            {imageUrl ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="" className="h-12 w-12 rounded border object-contain" />
                <Button variant="ghost" size="sm" onClick={() => setImageUrl('')}><XIcon className="h-4 w-4" /></Button>
              </div>
            ) : (
              <div>
                <input ref={fileRef} type="file" accept="image/*,.svg" className="hidden" onChange={handleUpload} />
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  <UploadIcon className="h-4 w-4 mr-1" /> {uploading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-1.5"><Label>Icon (lucide name)</Label><Input value={icon} onChange={e => setIcon(e.target.value)} placeholder="e.g. Award" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Link URL</Label><Input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Link Label</Label><Input value={linkLabel} onChange={e => setLinkLabel(e.target.value)} /></div>
          </div>
        </div>
        <SheetFooter className="px-6 py-4 border-t shrink-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
