'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, PlusIcon, XIcon, UploadIcon, VideoIcon, WandSparklesIcon,
  Trash2, ChevronDown, ChevronRight, Info, Save,
} from 'lucide-react'
import { RichTextEditor, useRichTextEditor } from '@/components/rich-text-editor'
import { toast } from 'sonner'
import { api, apiRaw } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Combobox } from '@/components/ui/combobox'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent,
  AlertDialogHeader, AlertDialogFooter, AlertDialogTitle,
  AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { uploadToCloudinary } from '@/lib/cloudinary'

/* ─── Types ─── */

interface FieldOptionValue { id: string; value: string; sort_order: number }
interface FieldDefinition {
  id: string; key: string; label: string; field_type: string
  field_option_values: FieldOptionValue[]
}
interface Category { id: string; title: string }
interface City { id: string; name: string; state: string }
interface ProductOptionFromAPI {
  id: string; field_definition_id: string; key: string; label: string; field_type: string
  is_required: boolean; sort_order: number
  values: { id: string; field_option_value_id: string; value: string; is_default: boolean }[]
}
interface PricingMatrixRow {
  id: string; quantity: number; price: number; max_completion_minutes: number | null
  city_id: string | null; city_name: string | null
  option_value_ids: string[]
}
interface ProductFromAPI {
  id: string; name: string; slug: string; description: string | null
  images: string[]; video_url: string | null; is_active: boolean
  category: { id: string; title: string; slug: string } | null
  options: ProductOptionFromAPI[]
  faqs: { question: string; answer: string }[]
  guidelines: { icon_url: string; title: string; description: string }[]
  specifications: { key: string; value: string }[]
  finish_and_care: string[]
}

interface ProductOptionState {
  field_definition_id: string; sort_order: number; is_required: boolean; value_ids: string[]
}
interface PricingTier { quantity: string; price: string; max_completion_minutes: string }
interface PricingGroup {
  option_value_ids: string[]; city_id: string | null; tiers: PricingTier[]; collapsed: boolean
}

/* ─── Helpers ─── */

function SectionHeader({ label, description }: { label: string; description?: string }) {
  return (
    <div className="pb-2 border-b flex items-center gap-1.5">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      {description && (
        <Tooltip>
          <TooltipTrigger className="text-muted-foreground hover:text-foreground"><Info className="h-3.5 w-3.5" /></TooltipTrigger>
          <TooltipContent side="right" className="max-w-sm">{description}</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

function cartesian<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [[]]
  return arrays.reduce<T[][]>((acc, arr) => acc.flatMap(a => arr.map(v => [...a, v])), [[]])
}

function groupMatrixRows(rows: PricingMatrixRow[]): PricingGroup[] {
  const groups: PricingGroup[] = []
  for (const row of rows) {
    const key = [...row.option_value_ids].sort().join('|') + '::' + (row.city_id ?? '')
    const existing = groups.find(g => {
      const gKey = [...g.option_value_ids].sort().join('|') + '::' + (g.city_id ?? '')
      return gKey === key
    })
    const tier: PricingTier = {
      quantity: String(row.quantity),
      price: String(row.price),
      max_completion_minutes: row.max_completion_minutes != null ? String(row.max_completion_minutes) : '',
    }
    if (existing) {
      existing.tiers.push(tier)
    } else {
      groups.push({
        option_value_ids: row.option_value_ids,
        city_id: row.city_id,
        tiers: [tier],
        collapsed: true,
      })
    }
  }
  return groups
}

/* ─── Page ─── */

export default function EditProductPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const productId = params.id

  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const [fieldDefinitions, setFieldDefinitions] = useState<FieldDefinition[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [cities, setCities] = useState<City[]>([])

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [isActive, setIsActive] = useState(true)

  const descEditor = useRichTextEditor()

  const [images, setImages] = useState<string[]>([])
  const [videoUrl, setVideoUrl] = useState('')
  const [uploadingImages, setUploadingImages] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const imgInputRef = useRef<HTMLInputElement>(null)
  const vidInputRef = useRef<HTMLInputElement>(null)

  const [productOptions, setProductOptions] = useState<ProductOptionState[]>([])
  const [pricingGroups, setPricingGroups] = useState<PricingGroup[]>([])

  const [faqs, setFaqs] = useState<{ question: string; answer: string }[]>([])
  const [guidelines, setGuidelines] = useState<{ icon_url: string; title: string; description: string }[]>([])
  const [specifications, setSpecifications] = useState<{ key: string; value: string }[]>([])
  const [finishAndCare, setFinishAndCare] = useState<string[]>([])

  useEffect(() => {
    Promise.all([
      api.get<{ items: unknown[]; meta: { field_definitions: FieldDefinition[]; categories: Category[]; cities: City[] } }>('/admin/products'),
      apiRaw.get<{ data: ProductFromAPI; pricing_matrix: PricingMatrixRow[] }>(`/admin/products/${productId}`),
    ]).then(([metaRes, detailRes]) => {
      setFieldDefinitions(metaRes.meta?.field_definitions ?? [])
      setCategories(metaRes.meta?.categories ?? [])
      setCities(metaRes.meta?.cities ?? [])

      const p = detailRes.data
      setName(p.name)
      setSlug(p.slug)
      setCategoryId(p.category?.id ?? '')
      setIsActive(p.is_active)
      setImages(p.images ?? [])
      setVideoUrl(p.video_url ?? '')
      descEditor?.commands.setContent(p.description ?? '')

      setProductOptions((p.options ?? []).map(o => ({
        field_definition_id: o.field_definition_id,
        sort_order: o.sort_order,
        is_required: o.is_required,
        value_ids: o.values.map(v => v.field_option_value_id),
      })))

      setPricingGroups(groupMatrixRows(detailRes.pricing_matrix ?? []))

      setFaqs(p.faqs ?? [])
      setGuidelines(p.guidelines ?? [])
      setSpecifications(p.specifications ?? [])
      setFinishAndCare(p.finish_and_care ?? [])
    }).catch(err => {
      toast.error(err.message ?? 'Failed to load product')
      router.push('/products')
    }).finally(() => setLoading(false))
  }, [productId])

  /* ── Upload helpers ── */
  async function uploadImageFiles(files: File[]) {
    if (!files.length) return
    setUploadingImages(true)
    try {
      const urls = await Promise.all(files.map(f => uploadToCloudinary(f, 'image')))
      setImages(prev => [...prev, ...urls])
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Image upload failed') }
    finally { setUploadingImages(false) }
  }

  async function uploadVideoFile(file: File) {
    setUploadingVideo(true)
    try { setVideoUrl(await uploadToCloudinary(file, 'video')) }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Video upload failed') }
    finally { setUploadingVideo(false) }
  }

  /* ── Product Options ── */
  const attachedFieldIds = new Set(productOptions.map(o => o.field_definition_id))
  const availableFields = fieldDefinitions.filter(f => !attachedFieldIds.has(f.id))

  function addProductOption(fieldDefId: string) {
    if (attachedFieldIds.has(fieldDefId)) return
    setProductOptions(prev => [...prev, { field_definition_id: fieldDefId, sort_order: prev.length, is_required: true, value_ids: [] }])
  }
  function removeProductOption(i: number) { setProductOptions(prev => prev.filter((_, j) => j !== i)) }
  function toggleOptionValue(optIdx: number, valueId: string) {
    setProductOptions(prev => prev.map((o, i) => {
      if (i !== optIdx) return o
      const has = o.value_ids.includes(valueId)
      return { ...o, value_ids: has ? o.value_ids.filter(v => v !== valueId) : [...o.value_ids, valueId] }
    }))
  }
  function toggleRequired(i: number) { setProductOptions(prev => prev.map((o, j) => j === i ? { ...o, is_required: !o.is_required } : o)) }
  function getFieldDef(fieldDefId: string) { return fieldDefinitions.find(f => f.id === fieldDefId) }

  /* ── Pricing Groups ── */
  function addPricingGroup() {
    const defaultValueIds = productOptions.map(o => o.value_ids[0] ?? '').filter(Boolean)
    setPricingGroups(prev => [...prev, { option_value_ids: defaultValueIds, city_id: null, tiers: [{ quantity: '', price: '', max_completion_minutes: '' }], collapsed: false }])
  }
  function removePricingGroup(i: number) { setPricingGroups(prev => prev.filter((_, j) => j !== i)) }

  function updateGroupOptionValue(groupIdx: number, fieldDefId: string, newValueId: string) {
    setPricingGroups(prev => prev.map((g, i) => {
      if (i !== groupIdx) return g
      const fd = getFieldDef(fieldDefId)
      if (!fd) return g
      const allValuesForField = new Set(fd.field_option_values.map(v => v.id))
      const filtered = g.option_value_ids.filter(id => !allValuesForField.has(id))
      return { ...g, option_value_ids: [...filtered, newValueId] }
    }))
  }
  function updateGroupCity(groupIdx: number, cityId: string | null) {
    setPricingGroups(prev => prev.map((g, i) => i === groupIdx ? { ...g, city_id: cityId } : g))
  }
  function addTier(groupIdx: number) {
    setPricingGroups(prev => prev.map((g, i) => i === groupIdx ? { ...g, tiers: [...g.tiers, { quantity: '', price: '', max_completion_minutes: '' }] } : g))
  }
  function removeTier(groupIdx: number, tierIdx: number) {
    setPricingGroups(prev => prev.map((g, i) => i === groupIdx ? { ...g, tiers: g.tiers.filter((_, j) => j !== tierIdx) } : g))
  }
  function updateTier(groupIdx: number, tierIdx: number, field: keyof PricingTier, value: string) {
    setPricingGroups(prev => prev.map((g, i) => i === groupIdx ? { ...g, tiers: g.tiers.map((t, j) => j === tierIdx ? { ...t, [field]: value } : t) } : g))
  }
  function toggleGroupCollapse(i: number) {
    setPricingGroups(prev => prev.map((g, j) => j === i ? { ...g, collapsed: !g.collapsed } : g))
  }

  function generateAllCombinations() {
    const optionArrays = productOptions.map(o => {
      const fd = getFieldDef(o.field_definition_id)
      return o.value_ids.map(vid => {
        const fov = fd?.field_option_values.find(v => v.id === vid)
        return { id: vid, label: fov?.value ?? vid }
      })
    }).filter(a => a.length > 0)
    if (optionArrays.length === 0) { toast.error('Add at least one product option with values first'); return }
    const combos = cartesian(optionArrays)
    const newGroups: PricingGroup[] = combos.map(combo => ({
      option_value_ids: combo.map(v => v.id), city_id: null,
      tiers: [{ quantity: '', price: '', max_completion_minutes: '' }], collapsed: false,
    }))
    setPricingGroups(prev => [...prev, ...newGroups])
    toast.success(`Generated ${newGroups.length} pricing groups`)
  }

  function getGroupLabel(group: PricingGroup): string {
    const parts: string[] = []
    for (const o of productOptions) {
      const fd = getFieldDef(o.field_definition_id)
      if (!fd) continue
      const allValuesForField = new Set(fd.field_option_values.map(v => v.id))
      const selectedId = group.option_value_ids.find(id => allValuesForField.has(id))
      const fov = fd.field_option_values.find(v => v.id === selectedId)
      if (fov) parts.push(fov.value)
    }
    if (group.city_id) {
      const city = cities.find(c => c.id === group.city_id)
      if (city) parts.push(city.name)
    } else { parts.push('All Cities') }
    return parts.join(' · ') || 'Group'
  }

  function getSelectedValueForField(group: PricingGroup, fieldDefId: string): string {
    const fd = getFieldDef(fieldDefId)
    if (!fd) return ''
    const allValuesForField = new Set(fd.field_option_values.map(v => v.id))
    return group.option_value_ids.find(id => allValuesForField.has(id)) ?? ''
  }

  /* ── Save ── */
  async function handleSave() {
    if (!name.trim()) { toast.error('Product name is required'); return }
    setSaving(true)
    try {
      const pricingMatrix = pricingGroups.flatMap(group =>
        group.tiers.filter(t => t.quantity && t.price).map(t => ({
          quantity: Number(t.quantity), price: Number(t.price),
          max_completion_minutes: t.max_completion_minutes ? Number(t.max_completion_minutes) : null,
          option_value_ids: group.option_value_ids, city_id: group.city_id || null,
        }))
      )
      await api.patch(`/admin/products/${productId}`, {
        name: name.trim(), slug: slug.trim() || undefined,
        category_id: categoryId || null, is_active: isActive,
        description: descEditor?.getHTML() ?? null, images, video_url: videoUrl || null,
        options: productOptions, pricing_matrix: pricingMatrix,
        faqs, guidelines, specifications, finish_and_care: finishAndCare,
      })
      toast.success('Product saved')
      router.push('/products')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    try {
      await api.delete(`/admin/products/${productId}`)
      toast.success('Product deleted')
      router.push('/products')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  if (loading) return <div className="p-6 text-muted-foreground">Loading…</div>

  return (
    <div className="p-6 max-w-7xl pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/products" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Edit Product</h1>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm"><Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Product</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete &quot;{name}&quot;?</AlertDialogTitle>
              <AlertDialogDescription>This will permanently delete this product and all its pricing data.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-start">
        {/* ── Left column: Basic Info, Options, Content ── */}
        <div className="space-y-6 lg:col-span-2">

      {/* ── Basic Info ── */}
      <Card>
        <CardContent className="pt-6 space-y-5">
          <SectionHeader label="Basic Info" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={slug} onChange={e => setSlug(e.target.value)} className="mt-1.5 font-mono text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Combobox options={categories.map(c => ({ value: c.id, label: c.title }))} value={categoryId} onValueChange={setCategoryId} placeholder="Select category…" searchPlaceholder="Search…" className="mt-1.5" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="h-4 w-4 accent-primary" />
                <span className="text-sm font-medium">Active</span>
              </label>
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <div className="mt-1.5">
              <RichTextEditor editor={descEditor} />
            </div>
          </div>
          <div>
            <Label>Images</Label>
            <div className="mt-1.5 flex flex-wrap gap-3">
              {images.map((url, i) => (
                <div key={i} className="relative group">
                  <img src={url} alt="" className="h-20 w-20 rounded-md object-cover border" />
                  <button onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <XIcon className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className="h-20 w-20 rounded-md border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-primary/40 transition-colors">
                {uploadingImages ? <span className="text-xs text-muted-foreground">…</span> : <UploadIcon className="h-5 w-5 text-muted-foreground" />}
                <input ref={imgInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { uploadImageFiles(Array.from(e.target.files ?? [])); if (imgInputRef.current) imgInputRef.current.value = '' }} />
              </label>
            </div>
          </div>
          <div>
            <Label>Video</Label>
            <div className="mt-1.5">
              {videoUrl ? (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary"><VideoIcon className="h-3 w-3 mr-1" /> Video uploaded</Badge>
                  <Button variant="ghost" size="sm" onClick={() => setVideoUrl('')}><XIcon className="h-3.5 w-3.5" /></Button>
                </div>
              ) : (
                <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {uploadingVideo ? 'Uploading…' : <><UploadIcon className="h-4 w-4" /> Upload video</>}
                  <input ref={vidInputRef} type="file" accept="video/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadVideoFile(f); if (vidInputRef.current) vidInputRef.current.value = '' }} />
                </label>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Product Options ── */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <SectionHeader label="Product Options" description="Select which field definitions apply to this product and which values are available." />
          <Combobox options={availableFields.map(f => ({ value: f.id, label: `${f.label} (${f.key})` }))} value="" onValueChange={addProductOption} placeholder="Add a field definition…" searchPlaceholder="Search…" disabled={availableFields.length === 0} />
          {productOptions.length === 0 && <p className="text-sm text-muted-foreground">No options added yet.</p>}
          {productOptions.map((opt, i) => {
            const fd = getFieldDef(opt.field_definition_id)
            if (!fd) return null
            const sortedValues = [...fd.field_option_values].sort((a, b) => a.sort_order - b.sort_order)
            return (
              <div key={opt.field_definition_id} className="rounded-md border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{fd.label}</span>
                    <Badge variant="secondary" className="text-[10px]">{fd.field_type}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input type="checkbox" checked={opt.is_required} onChange={() => toggleRequired(i)} className="h-3.5 w-3.5 accent-primary" /> Required
                    </label>
                    <Button variant="ghost" size="icon" onClick={() => removeProductOption(i)}><XIcon className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sortedValues.map(v => {
                    const checked = opt.value_ids.includes(v.id)
                    return (
                      <label key={v.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm cursor-pointer transition-colors ${checked ? 'bg-primary/10 border-primary text-foreground' : 'hover:bg-muted'}`}>
                        <input type="checkbox" checked={checked} onChange={() => toggleOptionValue(i, v.id)} className="h-3.5 w-3.5 accent-primary" /> {v.value}
                      </label>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* ── Content ── */}
      <Card>
        <CardContent className="pt-6 space-y-5">
          <SectionHeader label="Content" />
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>FAQs</Label>
              <Button variant="outline" size="sm" onClick={() => setFaqs(prev => [...prev, { question: '', answer: '' }])}><PlusIcon className="h-3.5 w-3.5 mr-1" /> Add FAQ</Button>
            </div>
            {faqs.length === 0 && <p className="text-sm text-muted-foreground">No FAQs yet.</p>}
            {faqs.map((faq, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <Input placeholder="Question" value={faq.question} onChange={e => setFaqs(prev => prev.map((f, j) => j === i ? { ...f, question: e.target.value } : f))} className="flex-1" />
                <Input placeholder="Answer" value={faq.answer} onChange={e => setFaqs(prev => prev.map((f, j) => j === i ? { ...f, answer: e.target.value } : f))} className="flex-1" />
                <Button variant="ghost" size="icon" onClick={() => setFaqs(prev => prev.filter((_, j) => j !== i))}><XIcon className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Guidelines</Label>
              <Button variant="outline" size="sm" onClick={() => setGuidelines(prev => [...prev, { icon_url: '', title: '', description: '' }])}><PlusIcon className="h-3.5 w-3.5 mr-1" /> Add</Button>
            </div>
            {guidelines.length === 0 && <p className="text-sm text-muted-foreground">No entries yet.</p>}
            {guidelines.map((g, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <Input placeholder="Title" value={g.title} onChange={e => setGuidelines(prev => prev.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} className="flex-1" />
                <Input placeholder="Description" value={g.description} onChange={e => setGuidelines(prev => prev.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} className="flex-1" />
                <Button variant="ghost" size="icon" onClick={() => setGuidelines(prev => prev.filter((_, j) => j !== i))}><XIcon className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Specifications</Label>
              <Button variant="outline" size="sm" onClick={() => setSpecifications(prev => [...prev, { key: '', value: '' }])}><PlusIcon className="h-3.5 w-3.5 mr-1" /> Add</Button>
            </div>
            {specifications.length === 0 && <p className="text-sm text-muted-foreground">No entries yet.</p>}
            {specifications.map((s, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <Input placeholder="Key" value={s.key} onChange={e => setSpecifications(prev => prev.map((x, j) => j === i ? { ...x, key: e.target.value } : x))} className="flex-1" />
                <Input placeholder="Value" value={s.value} onChange={e => setSpecifications(prev => prev.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} className="flex-1" />
                <Button variant="ghost" size="icon" onClick={() => setSpecifications(prev => prev.filter((_, j) => j !== i))}><XIcon className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Finish &amp; Care</Label>
              <Button variant="outline" size="sm" onClick={() => setFinishAndCare(prev => [...prev, ''])}><PlusIcon className="h-3.5 w-3.5 mr-1" /> Add</Button>
            </div>
            {finishAndCare.length === 0 && <p className="text-sm text-muted-foreground">No entries yet.</p>}
            {finishAndCare.map((item, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <Input placeholder="Instruction" value={item} onChange={e => setFinishAndCare(prev => prev.map((x, j) => j === i ? e.target.value : x))} className="flex-1" />
                <Button variant="ghost" size="icon" onClick={() => setFinishAndCare(prev => prev.filter((_, j) => j !== i))}><XIcon className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

        </div>{/* end left column */}

        {/* ── Right column: Pricing Matrix (sticky) ── */}
        <div className="lg:col-span-1 lg:sticky lg:top-6 self-start">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <SectionHeader label="Pricing Matrix" description="Each group represents one option combination. Add quantity→price tiers within each group." />
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={addPricingGroup}><PlusIcon className="h-3.5 w-3.5 mr-1" /> Add Pricing Group</Button>
                <Button variant="outline" size="sm" onClick={generateAllCombinations}><WandSparklesIcon className="h-3.5 w-3.5 mr-1" /> Generate All Combinations</Button>
              </div>
              {pricingGroups.length === 0 && <p className="text-sm text-muted-foreground">No pricing groups yet.</p>}
              {pricingGroups.map((group, gi) => (
                <div key={gi} className="rounded-md border">
                  <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 cursor-pointer" onClick={() => toggleGroupCollapse(gi)}>
                    {group.collapsed ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    <span className="text-sm font-medium flex-1">{getGroupLabel(group)}</span>
                    <span className="text-xs text-muted-foreground">{group.tiers.length} tier{group.tiers.length !== 1 ? 's' : ''}</span>
                    <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); removePricingGroup(gi) }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                  {!group.collapsed && (
                    <div className="p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        {productOptions.map(opt => {
                          const fd = getFieldDef(opt.field_definition_id)
                          if (!fd) return null
                          const selectedValue = getSelectedValueForField(group, fd.id)
                          const availableValues = fd.field_option_values.filter(v => opt.value_ids.includes(v.id)).sort((a, b) => a.sort_order - b.sort_order)
                          const selectedLabel = availableValues.find(v => v.id === selectedValue)?.value
                          return (
                            <div key={fd.id}>
                              <Label className="text-xs">{fd.label}</Label>
                              <Select value={selectedValue} onValueChange={v => { if (v) updateGroupOptionValue(gi, fd.id, v) }}>
                                <SelectTrigger className="mt-1 h-9 text-sm">
                                  <span className={selectedLabel ? '' : 'text-muted-foreground'}>{selectedLabel ?? `Select ${fd.label}`}</span>
                                </SelectTrigger>
                                <SelectContent>
                                  {availableValues.map(v => (
                                    <SelectItem key={v.id} value={v.id}>{v.value}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )
                        })}
                        <div>
                          <Label className="text-xs">City</Label>
                          <Select value={group.city_id ?? '__all__'} onValueChange={v => updateGroupCity(gi, v === '__all__' ? null : v)}>
                            <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__all__">All Cities</SelectItem>
                              {cities.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-xs font-medium text-muted-foreground mb-1 px-1">
                          <span>Quantity</span><span>Price (₹)</span><span>Completion (min)</span><span></span>
                        </div>
                        {group.tiers.map((tier, ti) => (
                          <div key={ti} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 mb-1.5">
                            <Input type="number" min={1} placeholder="25" value={tier.quantity} onChange={e => updateTier(gi, ti, 'quantity', e.target.value)} className="h-9" />
                            <Input type="number" min={0} step={0.01} placeholder="120" value={tier.price} onChange={e => updateTier(gi, ti, 'price', e.target.value)} className="h-9" />
                            <Input type="number" min={0} placeholder="Optional" value={tier.max_completion_minutes} onChange={e => updateTier(gi, ti, 'max_completion_minutes', e.target.value)} className="h-9" />
                            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeTier(gi, ti)} disabled={group.tiers.length <= 1}><XIcon className="h-3.5 w-3.5" /></Button>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" className="mt-1" onClick={() => addTier(gi)}><PlusIcon className="h-3.5 w-3.5 mr-1" /> Add Tier</Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>{/* end right column */}
      </div>{/* end grid */}

      {/* ── Sticky Footer ── */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background px-6 py-3 flex items-center justify-end gap-3 z-10">
        <Button variant="outline" asChild><Link href="/products">Cancel</Link></Button>
        <Button onClick={handleSave} disabled={saving || uploadingImages || uploadingVideo}>
          <Save className="h-4 w-4 mr-1" /> {saving ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}
