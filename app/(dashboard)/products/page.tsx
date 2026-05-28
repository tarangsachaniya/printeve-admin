'use client'

import { useEffect, useRef, useState } from 'react'
import { PlusIcon, VideoIcon, XIcon, UploadIcon } from 'lucide-react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet'

function ToolbarButton({
  onClick, active, disabled, children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick() }}
      disabled={disabled}
      className={`px-2 py-1 rounded text-sm font-medium transition-colors ${
        active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  )
}

interface Product {
  id: string
  name: string
  base_price: number
  category_id: string
  description?: string | null
  paper_sizes?: string[]
  paper_qualities?: { gsm: number; price: number }[]
  paper_types?: { type: string; price: number }[]
  quantity_tiers?: { min_qty: number; max_qty: number | null; unit_price: number }[]
  images?: string[]
  video_url?: string | null
}

interface PaperSize {
  id: string
  name: string
  sort_order: number
}

type Quality = { gsm: string; price: string }
type PaperType = { type: string; price: string }
type QtyTier = { min_qty: string; max_qty: string; unit_price: string }

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? ''
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? ''

async function uploadToCloudinary(file: File, type: 'image' | 'video'): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('upload_preset', UPLOAD_PRESET)
  fd.append('folder', 'printvana/products')
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${type}/upload`, {
    method: 'POST',
    body: fd,
  })
  if (!res.ok) throw new Error('Cloudinary upload failed')
  const data = await res.json() as { secure_url: string }
  return data.secure_url
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [paperSizes, setPaperSizes] = useState<PaperSize[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [basePrice, setBasePrice] = useState('')
  const [paperSizesSel, setPaperSizesSel] = useState<string[]>([])
  const [qualities, setQualities] = useState<Quality[]>([])
  const [paperTypes, setPaperTypes] = useState<PaperType[]>([])
  const [qtyTiers, setQtyTiers] = useState<QtyTier[]>([])
  const [pendingGsm, setPendingGsm] = useState('')
  const [pendingType, setPendingType] = useState('')
  const [pendingSize, setPendingSize] = useState('')

  // Description editor
  const [showDescHtml, setShowDescHtml] = useState(false)
  const [descHtmlValue, setDescHtmlValue] = useState('')

  const descEditor = useEditor({
    extensions: [StarterKit],
    content: '',
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editorProps: { attributes: { class: 'prose prose-sm max-w-none min-h-[180px] px-4 py-3 focus:outline-none' } },
  })

  function toggleDescHtml() {
    if (!descEditor) return
    if (!showDescHtml) {
      setDescHtmlValue(descEditor.getHTML())
    } else {
      descEditor.commands.setContent(descHtmlValue)
    }
    setShowDescHtml(v => !v)
  }

  // Media state
  const [images, setImages] = useState<string[]>([])
  const [videoUrl, setVideoUrl] = useState('')
  const [uploadingImages, setUploadingImages] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [imgDragOver, setImgDragOver] = useState(false)
  const [vidDragOver, setVidDragOver] = useState(false)
  const imgInputRef = useRef<HTMLInputElement>(null)
  const vidInputRef = useRef<HTMLInputElement>(null)

  function resetForm() {
    setName(''); setBasePrice(''); setPaperSizesSel([])
    setQualities([]); setPaperTypes([]); setQtyTiers([])
    setPendingGsm(''); setPendingType(''); setPendingSize('')
    setImages([]); setVideoUrl('')
    descEditor?.commands.setContent('')
  }

  function load() {
    setLoading(true)
    api.get<{ items: Product[] }>('/admin/products')
      .then(res => setProducts(res.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    api.get<{ items: PaperSize[] }>('/admin/paper/sizes')
      .then(res => setPaperSizes(res.items ?? []))
      .catch(() => {})
  }, [])

  function openCreate() {
    setEditing(null); resetForm(); setOpen(true)
  }

  function openEdit(p: Product) {
    setEditing(p)
    setName(p.name)
    setBasePrice(String(p.base_price))
    setPaperSizesSel(p.paper_sizes ?? [])
    setQualities((p.paper_qualities ?? []).map(q => ({ gsm: String(q.gsm), price: String(q.price) })))
    setPaperTypes((p.paper_types ?? []).map(t => ({ type: t.type, price: String(t.price) })))
    setQtyTiers((p.quantity_tiers ?? []).map(t => ({
      min_qty: String(t.min_qty),
      max_qty: t.max_qty != null ? String(t.max_qty) : '',
      unit_price: String(t.unit_price),
    })))
    setImages(p.images ?? [])
    setVideoUrl(p.video_url ?? '')
    setPendingGsm(''); setPendingType(''); setPendingSize('')
    descEditor?.commands.setContent(p.description ?? '')
    setOpen(true)
  }

  async function uploadImageFiles(files: File[]) {
    if (!files.length) return
    setUploadingImages(true)
    try {
      const urls = await Promise.all(files.map(f => uploadToCloudinary(f, 'image')))
      setImages(prev => [...prev, ...urls])
    } catch { /* no-op */ }
    finally { setUploadingImages(false) }
  }

  async function uploadVideoFile(file: File) {
    setUploadingVideo(true)
    try {
      const url = await uploadToCloudinary(file, 'video')
      setVideoUrl(url)
    } catch { /* no-op */ }
    finally { setUploadingVideo(false) }
  }

  async function handleImageFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    await uploadImageFiles(files)
    if (imgInputRef.current) imgInputRef.current.value = ''
  }

  async function handleVideoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadVideoFile(file)
    if (vidInputRef.current) vidInputRef.current.value = ''
  }

  function onImgDrop(e: React.DragEvent) {
    e.preventDefault()
    setImgDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    uploadImageFiles(files)
  }

  function onVidDrop(e: React.DragEvent) {
    e.preventDefault()
    setVidDragOver(false)
    const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('video/'))
    if (file) uploadVideoFile(file)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const body = {
        name,
        base_price: Number(basePrice),
        description: descEditor?.getHTML() ?? null,
        paper_sizes: paperSizesSel,
        paper_qualities: qualities.map(q => ({ gsm: Number(q.gsm), price: Number(q.price) })),
        paper_types: paperTypes.map(t => ({ type: t.type, price: Number(t.price) })),
        quantity_tiers: qtyTiers.map(t => ({
          min_qty: Number(t.min_qty),
          max_qty: t.max_qty ? Number(t.max_qty) : null,
          unit_price: Number(t.unit_price),
        })),
        images,
        video_url: videoUrl || null,
      }
      if (editing) {
        await api.patch(`/admin/products/${editing.id}`, body)
      } else {
        await api.post('/admin/products', body)
      }
      setOpen(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    await api.delete(`/admin/products/${id}`)
    load()
  }

  function toggleSize(name: string) {
    setPaperSizesSel(prev => prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name])
  }

  function addCustomSize() {
    const val = pendingSize.trim()
    if (!val || paperSizesSel.includes(val)) return
    setPaperSizesSel(prev => [...prev, val])
    setPendingSize('')
  }

  function addQuality() {
    const val = pendingGsm.trim()
    if (!val) return
    if (qualities.find(q => q.gsm === val)) return
    setQualities(prev => [...prev, { gsm: val, price: '' }])
    setPendingGsm('')
  }

  function addType() {
    const val = pendingType.trim()
    if (!val) return
    if (paperTypes.find(t => t.type === val)) return
    setPaperTypes(prev => [...prev, { type: val, price: '' }])
    setPendingType('')
  }

  function updateQuality(i: number, price: string) {
    setQualities(prev => prev.map((x, j) => j === i ? { ...x, price } : x))
  }

  function updateType(i: number, price: string) {
    setPaperTypes(prev => prev.map((x, j) => j === i ? { ...x, price } : x))
  }

  function updateTier(i: number, field: keyof QtyTier, value: string) {
    setQtyTiers(prev => prev.map((x, j) => j === i ? { ...x, [field]: value } : x))
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <Button onClick={openCreate}>Add Product</Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>₹{p.base_price?.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(p)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(p.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
              {products.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">No products</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="!w-[50vw] !max-w-none flex flex-col h-full p-0">
          <SheetHeader className="px-6 pt-5 pb-4 border-b shrink-0">
            <SheetTitle>{editing ? 'Edit Product' : 'New Product'}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">

            {/* ── Basic Info ── */}
            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Basic Info</p>
              <div className="space-y-1.5">
                <Label>Product Name <span className="text-destructive">*</span></Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Business Cards" />
              </div>
              <div className="space-y-1.5">
                <Label>Base Price (₹) <span className="text-destructive">*</span></Label>
                <Input type="number" value={basePrice} onChange={e => setBasePrice(e.target.value)} placeholder="0" />
              </div>
            </section>

            {/* ── Description ── */}
            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</p>
              <div className="rounded-lg border bg-card overflow-hidden">
                <div className="flex items-center gap-0.5 px-2 py-1.5 border-b bg-muted/40 flex-wrap">
                  <ToolbarButton onClick={() => descEditor?.chain().focus().toggleBold().run()} active={descEditor?.isActive('bold')}><strong>B</strong></ToolbarButton>
                  <ToolbarButton onClick={() => descEditor?.chain().focus().toggleItalic().run()} active={descEditor?.isActive('italic')}><em>I</em></ToolbarButton>
                  <ToolbarButton onClick={() => descEditor?.chain().focus().toggleStrike().run()} active={descEditor?.isActive('strike')}><s>S</s></ToolbarButton>
                  <div className="w-px h-5 bg-border mx-1" />
                  <ToolbarButton onClick={() => descEditor?.chain().focus().toggleHeading({ level: 2 }).run()} active={descEditor?.isActive('heading', { level: 2 })}>H2</ToolbarButton>
                  <ToolbarButton onClick={() => descEditor?.chain().focus().toggleHeading({ level: 3 }).run()} active={descEditor?.isActive('heading', { level: 3 })}>H3</ToolbarButton>
                  <div className="w-px h-5 bg-border mx-1" />
                  <ToolbarButton onClick={() => descEditor?.chain().focus().toggleBulletList().run()} active={descEditor?.isActive('bulletList')}>Bullet List</ToolbarButton>
                  <ToolbarButton onClick={() => descEditor?.chain().focus().toggleOrderedList().run()} active={descEditor?.isActive('orderedList')}>Ordered List</ToolbarButton>
                  <div className="w-px h-5 bg-border mx-1" />
                  <ToolbarButton onClick={() => descEditor?.chain().focus().undo().run()} disabled={!descEditor?.can().undo()}>↩</ToolbarButton>
                  <ToolbarButton onClick={() => descEditor?.chain().focus().redo().run()} disabled={!descEditor?.can().redo()}>↪</ToolbarButton>
                  <div className="w-px h-5 bg-border mx-1" />
                  <ToolbarButton onClick={toggleDescHtml} active={showDescHtml} disabled={!descEditor}>{'</>'}</ToolbarButton>
                </div>
                {showDescHtml ? (
                  <textarea
                    value={descHtmlValue}
                    onChange={e => setDescHtmlValue(e.target.value)}
                    className="w-full min-h-[180px] px-4 py-3 font-mono text-xs resize-y focus:outline-none bg-transparent"
                  />
                ) : (
                  <EditorContent editor={descEditor} />
                )}
              </div>
            </section>

            {/* ── Images ── */}
            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Product Images</p>
              <input ref={imgInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageFiles} />
              <div
                onDragOver={e => { e.preventDefault(); setImgDragOver(true) }}
                onDragLeave={() => setImgDragOver(false)}
                onDrop={onImgDrop}
                className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors cursor-pointer ${
                  imgDragOver ? 'border-primary bg-primary/5' : 'border-input hover:border-primary/50 hover:bg-muted/30'
                }`}
                onClick={() => imgInputRef.current?.click()}
              >
                <UploadIcon className="h-6 w-6 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {uploadingImages ? 'Uploading…' : 'Drop images here or click to browse'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG, WEBP</p>
                </div>
              </div>
              {images.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {images.map((url, i) => (
                    <div key={i} className="relative group rounded-md overflow-hidden border aspect-square bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                        className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XIcon className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── Video ── */}
            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Product Video</p>
              <input ref={vidInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoFile} />
              <div
                onDragOver={e => { e.preventDefault(); setVidDragOver(true) }}
                onDragLeave={() => setVidDragOver(false)}
                onDrop={onVidDrop}
                className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors cursor-pointer ${
                  vidDragOver ? 'border-primary bg-primary/5' : 'border-input hover:border-primary/50 hover:bg-muted/30'
                }`}
                onClick={() => !videoUrl && vidInputRef.current?.click()}
              >
                <VideoIcon className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {uploadingVideo ? 'Uploading…' : videoUrl ? 'Video uploaded' : 'Drop video here or click to browse'}
                </p>
                {!videoUrl && <p className="text-xs text-muted-foreground">MP4, MOV, WEBM</p>}
              </div>
              {videoUrl && (
                <div className="flex items-center gap-2 rounded-md border px-3 py-2 bg-muted/40">
                  <VideoIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate flex-1">{videoUrl.split('/').pop()}</span>
                  <button onClick={() => setVideoUrl('')}>
                    <XIcon className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                  </button>
                </div>
              )}
            </section>

            {/* ── Paper Sizes ── */}
            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Supported Paper Sizes</p>

              {/* Selected sizes as removable chips */}
              {paperSizesSel.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {paperSizesSel.map(s => (
                    <span key={s} className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary/10 text-primary px-2.5 py-0.5 text-sm font-medium">
                      {s}
                      <button type="button" onClick={() => setPaperSizesSel(prev => prev.filter(x => x !== s))}>
                        <XIcon className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* DB sizes as quick-add suggestions */}
              {paperSizes.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {paperSizes
                    .filter(s => !paperSizesSel.includes(s.name))
                    .map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleSize(s.name)}
                        className="rounded-full border border-input px-2.5 py-0.5 text-sm hover:border-primary hover:bg-primary/5 transition-colors"
                      >
                        + {s.name}
                      </button>
                    ))}
                </div>
              )}

              {/* Custom size input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Custom size, e.g. 100×150mm, DL, Custom"
                  value={pendingSize}
                  onChange={e => setPendingSize(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomSize())}
                />
                <Button type="button" variant="outline" size="icon" onClick={addCustomSize} disabled={!pendingSize.trim()}>
                  <PlusIcon className="h-4 w-4" />
                </Button>
              </div>
            </section>

            {/* ── Paper Quality (GSM) ── */}
            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Paper Quality — GSM Pricing</p>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Enter GSM, e.g. 90, 130, 300, 350"
                  value={pendingGsm}
                  onChange={e => setPendingGsm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addQuality())}
                />
                <Button type="button" variant="outline" size="icon" onClick={addQuality} disabled={!pendingGsm.trim()}>
                  <PlusIcon className="h-4 w-4" />
                </Button>
              </div>
              {qualities.length > 0 && (
                <div className="rounded-md border divide-y">
                  {qualities.map((q, i) => (
                    <div key={q.gsm} className="flex items-center gap-3 px-3 py-2">
                      <span className="text-sm font-medium w-20 shrink-0">{q.gsm} gsm</span>
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">₹</span>
                        <Input type="number" className="pl-7" placeholder="Price per sheet" value={q.price} onChange={e => updateQuality(i, e.target.value)} />
                      </div>
                      <Button variant="ghost" size="icon-sm" onClick={() => setQualities(prev => prev.filter((_, j) => j !== i))}>
                        <XIcon className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── Paper Type ── */}
            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Paper Type Pricing</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter type, e.g. Matte, Glossy, UV, Normal"
                  value={pendingType}
                  onChange={e => setPendingType(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addType())}
                />
                <Button type="button" variant="outline" size="icon" onClick={addType} disabled={!pendingType.trim()}>
                  <PlusIcon className="h-4 w-4" />
                </Button>
              </div>
              {paperTypes.length > 0 && (
                <div className="rounded-md border divide-y">
                  {paperTypes.map((t, i) => (
                    <div key={t.type} className="flex items-center gap-3 px-3 py-2">
                      <span className="text-sm font-medium w-24 shrink-0">{t.type}</span>
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">₹</span>
                        <Input type="number" className="pl-7" placeholder="Price" value={t.price} onChange={e => updateType(i, e.target.value)} />
                      </div>
                      <Button variant="ghost" size="icon-sm" onClick={() => setPaperTypes(prev => prev.filter((_, j) => j !== i))}>
                        <XIcon className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── Quantity Pricing Tiers ── */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quantity Pricing Tiers</p>
                <Button variant="outline" size="sm" onClick={() => setQtyTiers(prev => [...prev, { min_qty: '', max_qty: '', unit_price: '' }])}>
                  <PlusIcon className="h-3.5 w-3.5 mr-1" />
                  Add Tier
                </Button>
              </div>
              {qtyTiers.length > 0 ? (
                <div className="rounded-md border">
                  <div className="grid grid-cols-[1fr_1fr_1fr_32px] gap-2 px-3 py-2 border-b bg-muted/40">
                    <span className="text-xs text-muted-foreground font-medium">Min Qty</span>
                    <span className="text-xs text-muted-foreground font-medium">Max Qty</span>
                    <span className="text-xs text-muted-foreground font-medium">Unit Price (₹)</span>
                    <span />
                  </div>
                  <div className="divide-y">
                    {qtyTiers.map((tier, i) => (
                      <div key={i} className="grid grid-cols-[1fr_1fr_1fr_32px] gap-2 px-3 py-2 items-center">
                        <Input type="number" placeholder="1" value={tier.min_qty} onChange={e => updateTier(i, 'min_qty', e.target.value)} />
                        <Input type="number" placeholder="∞ (blank)" value={tier.max_qty} onChange={e => updateTier(i, 'max_qty', e.target.value)} />
                        <Input type="number" placeholder="0" value={tier.unit_price} onChange={e => updateTier(i, 'unit_price', e.target.value)} />
                        <Button variant="ghost" size="icon-sm" onClick={() => setQtyTiers(prev => prev.filter((_, j) => j !== i))}>
                          <XIcon className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No tiers yet. Add tiers to set quantity-based pricing.</p>
              )}
            </section>

          </div>

          <SheetFooter className="px-6 py-4 border-t shrink-0 flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving || uploadingImages || uploadingVideo}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Product'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
