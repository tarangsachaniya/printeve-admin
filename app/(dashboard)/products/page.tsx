'use client'

import { useEffect, useRef, useState } from 'react'
import { PlusIcon, VideoIcon, XIcon, UploadIcon, Info } from 'lucide-react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useDataTable } from '@/lib/use-data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Combobox } from '@/components/ui/combobox'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet'
import { DataTableSearch, DataTablePagination } from '@/components/data-table-controls'
import { PriceCalculatorModal } from '@/components/price-calculator-modal'
import { uploadToCloudinary } from '@/lib/cloudinary'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import Link from 'next/link'

function SectionHeader({ label, description }: { label: string; description?: string }) {
  return (
    <div className="pb-2 border-b flex items-center gap-1.5">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      {description && (
        <Tooltip>
          <TooltipTrigger className="text-muted-foreground hover:text-foreground">
            <Info className="h-3.5 w-3.5" />
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-sm">{description}</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

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

function VariantOptionEditor({
  title, description, emptyHint, entries, available, pending, setPending, onAdd, onUpdate, onRemove, comboboxPlaceholder,
}: {
  title: string
  description?: string
  emptyHint: React.ReactNode
  entries: { id: string; name: string; price_modifier: string }[]
  available: { id: string; name: string }[]
  pending: string
  setPending: (v: string) => void
  onAdd: (id: string) => void
  onUpdate: (i: number, value: string) => void
  onRemove: (i: number) => void
  comboboxPlaceholder: string
}) {
  const hasOptions = available.length > 0 || entries.length > 0
  return (
    <section className="space-y-3">
      <SectionHeader label={title} description={description} />
      {!hasOptions ? (
        <p className="text-sm text-muted-foreground">{emptyHint}</p>
      ) : (
        <Combobox
          options={available.map(o => ({ value: o.id, label: o.name }))}
          value={pending}
          onValueChange={v => { setPending(v); onAdd(v) }}
          placeholder={comboboxPlaceholder}
          searchPlaceholder="Search…"
          disabled={available.length === 0}
        />
      )}
      {available.length === 0 && entries.length > 0 && (
        <p className="text-xs text-muted-foreground">All configured options are added.</p>
      )}
      {entries.length > 0 && (
        <div className="rounded-md border divide-y">
          {entries.map((e, i) => (
            <div key={e.id} className="flex items-center gap-3 px-3 py-2">
              <span className="text-sm font-medium w-28 shrink-0 truncate">{e.name}</span>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">+/- ₹</span>
                <Input type="number" step={0.05} className="pl-12" placeholder="0" value={e.price_modifier} onChange={ev => onUpdate(i, ev.target.value)} />
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => onRemove(i)}>
                <XIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

type CustomFieldOptionEntry = { id: string; name: string; price_modifier: string; is_default: boolean }

interface FieldOptionValue { id: string; value: string; sort_order: number }

interface CategoryFieldDef {
  id: string
  sort_order: number
  is_required: boolean
  field_definitions: {
    id: string
    key: string
    label: string
    field_type: 'select' | 'multi_select' | 'boolean' | 'number' | 'text'
    field_option_values: FieldOptionValue[]
  } | null
}

function CustomFieldOptionsEditor({
  field, isRequired, entries, available, pending, setPending, onAdd, onUpdate, onRemove, onSetDefault,
}: {
  field: NonNullable<CategoryFieldDef['field_definitions']>
  isRequired: boolean
  entries: CustomFieldOptionEntry[]
  available: { id: string; name: string }[]
  pending: string
  setPending: (v: string) => void
  onAdd: (id: string) => void
  onUpdate: (i: number, value: string) => void
  onRemove: (i: number) => void
  onSetDefault: (i: number) => void
}) {
  const hasOptions = available.length > 0 || entries.length > 0
  const showDefault = field.field_type === 'select' || field.field_type === 'boolean'
  return (
    <section className="space-y-3">
      <SectionHeader
        label={field.label + (isRequired ? ' *' : '')}
        description={`Select which "${field.label}" options apply to this product. For each, enter how much to add (+) or subtract (-) from the base price per unit. Leave blank or enter 0 for no extra charge.`}
      />
      {!hasOptions ? (
        <p className="text-sm text-muted-foreground">
          No options configured for this field.{' '}
          <Link href="/categories" className="text-primary underline-offset-4 hover:underline">Manage category fields</Link>
        </p>
      ) : (
        <Combobox
          options={available.map(o => ({ value: o.id, label: o.name }))}
          value={pending}
          onValueChange={v => { setPending(v); onAdd(v) }}
          placeholder={`Select ${field.label.toLowerCase()}…`}
          searchPlaceholder="Search…"
          disabled={available.length === 0}
        />
      )}
      {available.length === 0 && entries.length > 0 && (
        <p className="text-xs text-muted-foreground">All configured options are added.</p>
      )}
      {entries.length > 0 && (
        <div className="rounded-md border divide-y">
          {entries.map((e, i) => (
            <div key={e.id} className="flex items-center gap-3 px-3 py-2">
              {showDefault && (
                <input
                  type="radio"
                  className="h-3.5 w-3.5 accent-primary shrink-0"
                  checked={e.is_default}
                  onChange={() => onSetDefault(i)}
                  title="Default option"
                />
              )}
              <span className="text-sm font-medium w-28 shrink-0 truncate">{e.name}</span>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">+/- ₹</span>
                <Input type="number" step={0.05} className="pl-12" placeholder="0" value={e.price_modifier} onChange={ev => onUpdate(i, ev.target.value)} />
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => onRemove(i)}>
                <XIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
      {showDefault && entries.length > 0 && (
        <p className="text-xs text-muted-foreground">The radio button marks the default option used when the customer doesn&apos;t make a selection.</p>
      )}
    </section>
  )
}

interface QuantitySlab {
  min_qty: number
  max_qty: number | null
  price_modifier: number
  max_completion_minutes: number | null
}

interface Product {
  id: string
  name: string
  base_price: number
  category_id: string
  is_active: boolean
  description?: string | null
  paper_sizes?: { paper_size_id: string; name: string; price_modifier: number }[]
  paper_qualities?: { paper_quality_id: string; name: string; price_modifier: number }[]
  paper_types?: { paper_type_id: string; name: string; price_modifier: number }[]
  quantity_slabs?: QuantitySlab[]
  images?: string[]
  video_url?: string | null
  custom_fields?: {
    category_field_id: string
    key: string
    label: string
    field_type: 'select' | 'multi_select' | 'boolean' | 'number' | 'text'
    is_required: boolean
    options: { id: string; name: string; price_modifier: number; is_default: boolean }[]
  }[]
}

interface PaperSize {
  id: string
  name: string
  sort_order: number
}

interface PaperQuality {
  id: string
  gsm: number
  label: string | null
  name: string
}

interface PaperTypeOption {
  id: string
  name: string
  sort_order: number
}

type OptionEntry = { id: string; name: string; price_modifier: string }
type QtySlab = { min_qty: string; max_qty: string; price_modifier: string; max_completion_minutes: string }
interface Category { id: string; name: string; slug: string }
interface City { id: string; name: string; state: string }
type CityPricingEntry = { id?: string; city_id: string; city_name: string; price_modifier: string }

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [paperSizes, setPaperSizes] = useState<PaperSize[]>([])
  const [paperQualities, setPaperQualities] = useState<PaperQuality[]>([])
  const [paperTypeOptions, setPaperTypeOptions] = useState<PaperTypeOption[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)
  const [cities, setCities] = useState<City[]>([])
  const [cityPricing, setCityPricing] = useState<CityPricingEntry[]>([])
  const originalCityPricingRef = useRef<CityPricingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingActiveId, setTogglingActiveId] = useState<string | null>(null)

  const table = useDataTable(products, ['name', 'base_price'] as (keyof Product)[])

  const [name, setName] = useState('')
  const [basePrice, setBasePrice] = useState('')
  const [paperSizesSel, setPaperSizesSel] = useState<OptionEntry[]>([])
  const [paperQualitiesSel, setPaperQualitiesSel] = useState<OptionEntry[]>([])
  const [paperTypesSel, setPaperTypesSel] = useState<OptionEntry[]>([])
  const [qtySlabs, setQtySlabs] = useState<QtySlab[]>([])
  const [pendingSize, setPendingSize] = useState('')
  const [pendingQuality, setPendingQuality] = useState('')
  const [pendingType, setPendingType] = useState('')

  const [categoryFields, setCategoryFields] = useState<CategoryFieldDef[]>([])
  const [customFieldSel, setCustomFieldSel] = useState<Record<string, CustomFieldOptionEntry[]>>({})
  const [customFieldPending, setCustomFieldPending] = useState<Record<string, string>>({})

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

  const [images, setImages] = useState<string[]>([])
  const [videoUrl, setVideoUrl] = useState('')
  const [uploadingImages, setUploadingImages] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [imgDragOver, setImgDragOver] = useState(false)
  const [vidDragOver, setVidDragOver] = useState(false)
  const imgInputRef = useRef<HTMLInputElement>(null)
  const vidInputRef = useRef<HTMLInputElement>(null)

  function resetForm() {
    setName(''); setBasePrice('')
    setCategoryId(''); setNewCategoryName('')
    setPaperSizesSel([]); setPaperQualitiesSel([]); setPaperTypesSel([]); setQtySlabs([])
    setPendingSize(''); setPendingQuality(''); setPendingType('')
    setImages([]); setVideoUrl('')
    setCityPricing([]); originalCityPricingRef.current = []
    setCustomFieldSel({}); setCustomFieldPending({})
    descEditor?.commands.setContent('')
  }

  type ProductsResponse = {
    items: Product[]
    meta: { sizes: PaperSize[]; qualities: PaperQuality[]; types: PaperTypeOption[]; cities: City[]; categories: Category[] }
  }

  function load() {
    setLoading(true)
    api.get<ProductsResponse>('/admin/products')
      .then(res => {
        setProducts(res.items ?? [])
        setPaperSizes(res.meta?.sizes ?? [])
        setPaperQualities(
          (res.meta?.qualities ?? []).map(q => ({
            id: q.id,
            gsm: q.gsm,
            label: q.label,
            name: q.label ? `${q.gsm} GSM (${q.label})` : `${q.gsm} GSM`,
          }))
        )
        setPaperTypeOptions(res.meta?.types ?? [])
        setCities(res.meta?.cities ?? [])
        setCategories(res.meta?.categories ?? [])
      })
      .catch((err) => toast.error(err.message ?? 'Failed to load products'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!categoryId) { setCategoryFields([]); return }
    api.get<{ items: CategoryFieldDef[] }>(`/admin/categories/${categoryId}/fields`)
      .then(res => setCategoryFields(res.items ?? []))
      .catch(() => setCategoryFields([]))
  }, [categoryId])

  const availableSizes = paperSizes.filter(s => !paperSizesSel.some(x => x.id === s.id))
  const availableQualities = paperQualities.filter(q => !paperQualitiesSel.some(x => x.id === q.id))
  const availableTypes = paperTypeOptions.filter(t => !paperTypesSel.some(x => x.id === t.id))

  function openCreate() {
    setEditing(null); resetForm(); setOpen(true)
  }

  function openEdit(p: Product) {
    setEditing(p)
    setName(p.name)
    setBasePrice(String(p.base_price))
    setCategoryId(p.category_id ?? '')
    setNewCategoryName('')
    setPaperSizesSel((p.paper_sizes ?? []).map(s => ({ id: s.paper_size_id, name: s.name, price_modifier: String(s.price_modifier) })))
    setPaperQualitiesSel((p.paper_qualities ?? []).map(q => ({ id: q.paper_quality_id, name: q.name, price_modifier: String(q.price_modifier) })))
    setPaperTypesSel((p.paper_types ?? []).map(t => ({ id: t.paper_type_id, name: t.name, price_modifier: String(t.price_modifier) })))
    setQtySlabs((p.quantity_slabs ?? []).map(s => ({
      min_qty: String(s.min_qty),
      max_qty: s.max_qty != null ? String(s.max_qty) : '',
      price_modifier: String(s.price_modifier ?? ''),
      max_completion_minutes: s.max_completion_minutes != null ? String(s.max_completion_minutes) : '',
    })))
    setImages(p.images ?? [])
    setVideoUrl(p.video_url ?? '')
    const customSel: Record<string, CustomFieldOptionEntry[]> = {}
    for (const cf of p.custom_fields ?? []) {
      customSel[cf.category_field_id] = cf.options.map(o => ({
        id: o.id, name: o.name, price_modifier: String(o.price_modifier), is_default: o.is_default,
      }))
    }
    setCustomFieldSel(customSel)
    setCustomFieldPending({})
    setPendingSize(''); setPendingQuality(''); setPendingType('')
    descEditor?.commands.setContent(p.description ?? '')
    setCityPricing([]); originalCityPricingRef.current = []
    api.get<{ items: Array<{ id: string; city_id: string; city_name: string; price_modifier: number | null }> }>(`/admin/products/${p.id}/city-pricing`)
      .then(r => {
        const entries = (r.items ?? []).map(item => ({
          id: item.id,
          city_id: item.city_id,
          city_name: item.city_name ?? '',
          price_modifier: item.price_modifier != null ? String(item.price_modifier) : '',
        }))
        setCityPricing(entries)
        originalCityPricingRef.current = entries
      })
      .catch(() => {})
    setOpen(true)
  }

  async function uploadImageFiles(files: File[]) {
    if (!files.length) return
    setUploadingImages(true)
    try {
      const urls = await Promise.all(files.map(f => uploadToCloudinary(f, 'image')))
      setImages(prev => [...prev, ...urls])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Image upload failed')
    } finally { setUploadingImages(false) }
  }

  async function uploadVideoFile(file: File) {
    setUploadingVideo(true)
    try {
      const url = await uploadToCloudinary(file, 'video')
      setVideoUrl(url)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Video upload failed')
    } finally { setUploadingVideo(false) }
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

  async function addCategory() {
    const val = newCategoryName.trim()
    if (!val) return
    setAddingCategory(true)
    try {
      const res = await api.post<{ data: Category }>('/admin/categories', { name: val })
      if (res.data) {
        setCategories(prev => [...prev, res.data])
        setCategoryId(res.data.id)
      }
      setNewCategoryName('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add category')
    } finally { setAddingCategory(false) }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const body = {
        name,
        base_price: Number(basePrice),
        category_id: categoryId || null,
        description: descEditor?.getHTML() ?? null,
        paper_sizes: paperSizesSel.map(s => ({ paper_size_id: s.id, price_modifier: Number(s.price_modifier) || 0 })),
        paper_qualities: paperQualitiesSel.map(q => ({ paper_quality_id: q.id, price_modifier: Number(q.price_modifier) || 0 })),
        paper_types: paperTypesSel.map(t => ({ paper_type_id: t.id, price_modifier: Number(t.price_modifier) || 0 })),
        quantity_slabs: qtySlabs.map(s => ({
          min_qty: Number(s.min_qty),
          max_qty: s.max_qty ? Number(s.max_qty) : null,
          price_modifier: Number(s.price_modifier) || 0,
          max_completion_minutes: s.max_completion_minutes ? Number(s.max_completion_minutes) : null,
        })),
        custom_field_options: Object.entries(customFieldSel).flatMap(([categoryFieldId, entries]) =>
          entries.map(e => ({
            category_field_id: categoryFieldId,
            field_option_value_id: e.id,
            price_modifier: Number(e.price_modifier) || 0,
            is_default: Boolean(e.is_default),
          }))
        ),
        images,
        video_url: videoUrl || null,
      }
      if (editing) {
        await api.patch(`/admin/products/${editing.id}`, body)
        await syncCityPricing(editing.id)
        toast.success('Product updated')
      } else {
        const res = await api.post<{ data: Product }>('/admin/products', body)
        const created = res.data ?? { id: '', ...body }
        if (created.id && cityPricing.length > 0) await syncCityPricing(created.id)
        toast.success('Product created')
      }
      setOpen(false)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true)
    try {
      await api.delete(`/admin/products/${id}`)
      setProducts(prev => prev.filter(p => p.id !== id))
      setDeleteId(null)
      toast.success('Product deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete product')
    } finally {
      setDeleting(false)
    }
  }

  async function handleToggleActive(p: Product) {
    setTogglingActiveId(p.id)
    try {
      await api.patch(`/admin/products/${p.id}`, { is_active: !p.is_active })
      setProducts(prev => prev.map(x => x.id === p.id ? { ...x, is_active: !p.is_active } : x))
      toast.success(p.is_active ? 'Product disabled' : 'Product enabled')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update product status')
    } finally {
      setTogglingActiveId(null)
    }
  }

  function addOption(
    setEntries: React.Dispatch<React.SetStateAction<OptionEntry[]>>,
    entries: OptionEntry[],
    available: { id: string; name: string }[],
    id: string,
  ) {
    const opt = available.find(o => o.id === id)
    if (!opt || entries.some(e => e.id === opt.id)) return
    setEntries(prev => [...prev, { id: opt.id, name: opt.name, price_modifier: '' }])
  }

  function updateOptionModifier(
    setEntries: React.Dispatch<React.SetStateAction<OptionEntry[]>>,
    i: number,
    price_modifier: string,
  ) {
    setEntries(prev => prev.map((x, j) => j === i ? { ...x, price_modifier } : x))
  }

  function removeOption(setEntries: React.Dispatch<React.SetStateAction<OptionEntry[]>>, i: number) {
    setEntries(prev => prev.filter((_, j) => j !== i))
  }

  function addCustomFieldOption(categoryFieldId: string, available: FieldOptionValue[], optionValueId: string) {
    const opt = available.find(o => o.id === optionValueId)
    if (!opt) return
    setCustomFieldSel(prev => {
      const entries = prev[categoryFieldId] ?? []
      if (entries.some(e => e.id === opt.id)) return prev
      return { ...prev, [categoryFieldId]: [...entries, { id: opt.id, name: opt.value, price_modifier: '', is_default: entries.length === 0 }] }
    })
  }

  function updateCustomFieldModifier(categoryFieldId: string, i: number, price_modifier: string) {
    setCustomFieldSel(prev => ({
      ...prev,
      [categoryFieldId]: (prev[categoryFieldId] ?? []).map((e, j) => j === i ? { ...e, price_modifier } : e),
    }))
  }

  function removeCustomFieldOption(categoryFieldId: string, i: number) {
    setCustomFieldSel(prev => ({
      ...prev,
      [categoryFieldId]: (prev[categoryFieldId] ?? []).filter((_, j) => j !== i),
    }))
  }

  function setCustomFieldDefault(categoryFieldId: string, i: number) {
    setCustomFieldSel(prev => ({
      ...prev,
      [categoryFieldId]: (prev[categoryFieldId] ?? []).map((e, j) => ({ ...e, is_default: j === i })),
    }))
  }

  function updateSlab(i: number, field: keyof QtySlab, value: string) {
    setQtySlabs(prev => prev.map((x, j) => j === i ? { ...x, [field]: value } : x))
  }

  function addCityPricing(cityId: string) {
    const city = cities.find(c => c.id === cityId)
    if (!city || cityPricing.some(e => e.city_id === cityId)) return
    setCityPricing(prev => [...prev, { city_id: city.id, city_name: city.name, price_modifier: '' }])
  }

  function updateCityPrice(i: number, value: string) {
    setCityPricing(prev => prev.map((x, j) => j === i ? { ...x, price_modifier: value } : x))
  }

  function removeCityPricing(i: number) {
    setCityPricing(prev => prev.filter((_, j) => j !== i))
  }

  async function syncCityPricing(productId: string) {
    const original = originalCityPricingRef.current
    const current = cityPricing
    const currentIds = new Set(current.map(e => e.id).filter((id): id is string => !!id))
    for (const entry of original) {
      if (entry.id && !currentIds.has(entry.id)) {
        await api.delete(`/admin/products/${productId}/city-pricing/${entry.id}`)
      }
    }
    for (const entry of current) {
      if (!entry.id) {
        await api.post(`/admin/products/${productId}/city-pricing`, {
          city_id: entry.city_id,
          price_modifier: entry.price_modifier !== '' ? Number(entry.price_modifier) : 0,
        })
      } else {
        const orig = original.find(o => o.id === entry.id)
        if (orig && orig.price_modifier !== entry.price_modifier) {
          await api.patch(`/admin/products/${productId}/city-pricing/${entry.id}`, {
            price_modifier: entry.price_modifier !== '' ? Number(entry.price_modifier) : 0,
          })
        }
      }
    }
  }

  const availableCities = cities.filter(c => !cityPricing.some(e => e.city_id === c.id))

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <div className="flex items-center gap-2">
          <PriceCalculatorModal products={products} cities={cities} />
          <Button onClick={openCreate}>Add Product</Button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-3">
          <DataTableSearch
            value={table.search}
            onChange={table.setSearch}
            total={products.length}
            filtered={table.total}
            placeholder="Search products…"
          />
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {table.rows.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>₹{p.base_price?.toLocaleString('en-IN')}</TableCell>
                    <TableCell>
                      <Badge variant={p.is_active ? 'default' : 'secondary'}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(p)}>Edit</Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={togglingActiveId === p.id}
                        onClick={() => handleToggleActive(p)}
                      >
                        {p.is_active ? 'Disable' : 'Enable'}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setDeleteId(p.id)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {table.rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      {table.search ? 'No products match your search' : 'No products'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DataTablePagination
            page={table.page}
            pageCount={table.pageCount}
            total={table.total}
            pageSize={table.pageSize}
            onPageChange={table.setPage}
          />
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
              <SectionHeader
                label="Basic Information"
                description="The product name shown to customers and the base price per unit before any size, quality, or quantity adjustments are applied."
              />
              <div className="space-y-1.5">
                <Label>Product Name <span className="text-destructive">*</span></Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Business Cards" />
              </div>
              <div className="space-y-1.5">
                <Label>Base Price (₹) <span className="text-destructive">*</span></Label>
                <Input type="number" value={basePrice} onChange={e => setBasePrice(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Combobox
                  options={categories.map(c => ({ value: c.id, label: c.name }))}
                  value={categoryId}
                  onValueChange={setCategoryId}
                  placeholder="Select category…"
                  searchPlaceholder="Search categories…"
                />
                <div className="flex items-center gap-2 pt-1">
                  <Input
                    className="flex-1"
                    placeholder="Add new category…"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addCategory} disabled={addingCategory || !newCategoryName.trim()}>
                    <PlusIcon className="h-3.5 w-3.5 mr-1" /> Add
                  </Button>
                </div>
                {categoryId && (
                  <p className="text-xs text-muted-foreground pt-1">
                    <Link href={`/categories/${categoryId}/fields`} className="text-primary underline-offset-4 hover:underline">
                      Manage fields for this category
                    </Link>
                    {' '}(Finish, Binding, Lamination, etc.)
                  </p>
                )}
              </div>
            </section>

            {/* ── Description ── */}
            <section className="space-y-3">
              <SectionHeader
                label="Product Description"
                description="Describe what this product includes — material, finish, use case, etc. This is shown to customers on the product page."
              />
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
              <SectionHeader
                label="Product Images"
                description="Upload photos of this product. The first image is used as the thumbnail in listings. Supports PNG, JPG, and WEBP."
              />
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
              <SectionHeader
                label="Product Video"
                description="Optional. Upload a short video to show the product quality or printing process. Displayed on the product page."
              />
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
            <VariantOptionEditor
              title="Available Paper Sizes"
              description="Select the paper sizes this product can be printed in. For each size, enter how much to add (+) or subtract (-) from the base price per unit. Leave blank or enter 0 if the size has no extra charge."
              emptyHint={<>No paper sizes configured.{' '}<Link href="/paper/sizes" className="text-primary underline-offset-4 hover:underline">Add paper sizes</Link></>}
              entries={paperSizesSel}
              available={availableSizes}
              pending={pendingSize}
              setPending={setPendingSize}
              onAdd={id => addOption(setPaperSizesSel, paperSizesSel, availableSizes, id)}
              onUpdate={(i, v) => updateOptionModifier(setPaperSizesSel, i, v)}
              onRemove={i => removeOption(setPaperSizesSel, i)}
              comboboxPlaceholder="Select size…"
            />

            {/* ── Paper Qualities ── */}
            <VariantOptionEditor
              title="Available Paper Qualities"
              description="Select the paper quality (GSM / finish) options for this product. Enter how much to add (+) or subtract (-) from the base price per unit for each quality. Leave blank or enter 0 for no extra charge."
              emptyHint={<>No paper qualities configured.{' '}<Link href="/paper/qualities" className="text-primary underline-offset-4 hover:underline">Add paper qualities</Link></>}
              entries={paperQualitiesSel}
              available={availableQualities}
              pending={pendingQuality}
              setPending={setPendingQuality}
              onAdd={id => addOption(setPaperQualitiesSel, paperQualitiesSel, availableQualities, id)}
              onUpdate={(i, v) => updateOptionModifier(setPaperQualitiesSel, i, v)}
              onRemove={i => removeOption(setPaperQualitiesSel, i)}
              comboboxPlaceholder="Select paper quality…"
            />

            {/* ── Paper Type ── */}
            <VariantOptionEditor
              title="Available Paper Types"
              description="Select the paper types (e.g. Glossy, Matte, Kraft) available for this product. Enter how much to add (+) or subtract (-) from the base price per unit for each type. Leave blank or enter 0 for no extra charge."
              emptyHint={<>No paper types configured.{' '}<Link href="/paper/types" className="text-primary underline-offset-4 hover:underline">Add paper types</Link></>}
              entries={paperTypesSel}
              available={availableTypes}
              pending={pendingType}
              setPending={setPendingType}
              onAdd={id => addOption(setPaperTypesSel, paperTypesSel, availableTypes, id)}
              onUpdate={(i, v) => updateOptionModifier(setPaperTypesSel, i, v)}
              onRemove={i => removeOption(setPaperTypesSel, i)}
              comboboxPlaceholder="Select paper type…"
            />

            {/* ── Category-Specific Fields ── */}
            {categoryFields
              .filter(cf => cf.field_definitions && ['select', 'multi_select', 'boolean'].includes(cf.field_definitions.field_type))
              .map(cf => {
                const fieldDef = cf.field_definitions!
                const entries = customFieldSel[cf.id] ?? []
                const available = fieldDef.field_option_values.filter(v => !entries.some(e => e.id === v.id))
                return (
                  <CustomFieldOptionsEditor
                    key={cf.id}
                    field={fieldDef}
                    isRequired={cf.is_required}
                    entries={entries}
                    available={available.map(v => ({ id: v.id, name: v.value }))}
                    pending={customFieldPending[cf.id] ?? ''}
                    setPending={v => setCustomFieldPending(prev => ({ ...prev, [cf.id]: v }))}
                    onAdd={id => addCustomFieldOption(cf.id, fieldDef.field_option_values, id)}
                    onUpdate={(i, v) => updateCustomFieldModifier(cf.id, i, v)}
                    onRemove={i => removeCustomFieldOption(cf.id, i)}
                    onSetDefault={i => setCustomFieldDefault(cf.id, i)}
                  />
                )
              })}
            {categoryFields.some(cf => cf.field_definitions && ['number', 'text'].includes(cf.field_definitions.field_type)) && (
              <section className="space-y-3">
                <SectionHeader
                  label="Additional Customer Inputs"
                  description="These fields are shown to customers on the product page but do not affect price."
                />
                <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                  {categoryFields
                    .filter(cf => cf.field_definitions && ['number', 'text'].includes(cf.field_definitions.field_type))
                    .map(cf => (
                      <li key={cf.id}>{cf.field_definitions!.label}{cf.is_required ? ' (required)' : ''}</li>
                    ))}
                </ul>
              </section>
            )}

            {/* ── Quantity Slabs ── */}
            <section className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <SectionHeader
                  label="Quantity-Based Pricing (Slabs)"
                  description="Set price adjustments based on order quantity. For each range, enter how much to add (+) or subtract (-) per unit from the base price. Also set the maximum time (in minutes) to fulfill orders in that range. Leave Max Qty blank for open-ended slabs (e.g. 100+)."
                />
                <Button variant="outline" size="sm" className="shrink-0" onClick={() => setQtySlabs(prev => [...prev, { min_qty: '', max_qty: '', price_modifier: '', max_completion_minutes: '' }])}>
                  <PlusIcon className="h-3.5 w-3.5 mr-1" />
                  Add Slab
                </Button>
              </div>
              {qtySlabs.length > 0 ? (
                <div className="rounded-md border">
                  <div className="grid grid-cols-[1fr_1fr_1fr_1fr_32px] gap-2 px-3 py-2 border-b bg-muted/40">
                    <span className="text-xs text-muted-foreground font-medium">Min Qty</span>
                    <span className="text-xs text-muted-foreground font-medium">Max Qty</span>
                    <span className="text-xs text-muted-foreground font-medium">Price Modifier (+/- ₹)</span>
                    <span className="text-xs text-muted-foreground font-medium">Max Time (min)</span>
                    <span />
                  </div>
                  <div className="divide-y">
                    {qtySlabs.map((slab, i) => (
                      <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_32px] gap-2 px-3 py-2 items-center">
                        <Input type="number" placeholder="1" value={slab.min_qty} onChange={e => updateSlab(i, 'min_qty', e.target.value)} />
                        <Input type="number" placeholder="∞ (blank)" value={slab.max_qty} onChange={e => updateSlab(i, 'max_qty', e.target.value)} />
                        <Input type="number" step={0.05} placeholder="0" value={slab.price_modifier} onChange={e => updateSlab(i, 'price_modifier', e.target.value)} />
                        <Input type="number" placeholder="e.g. 120" value={slab.max_completion_minutes} onChange={e => updateSlab(i, 'max_completion_minutes', e.target.value)} />
                        <Button variant="ghost" size="icon-sm" onClick={() => setQtySlabs(prev => prev.filter((_, j) => j !== i))}>
                          <XIcon className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No slabs yet. Add slabs to set quantity-based pricing modifiers.</p>
              )}
            </section>

            {/* ── City Pricing ── */}
            <section className="space-y-3">
              <SectionHeader
                label="City-Specific Pricing"
                description="Adjust the price for customers ordering from specific cities. Enter how much to add (+) or subtract (-) from the base price per unit. Cities without an entry use the default base price."
              />
              {cities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No cities configured.</p>
              ) : (
                <Combobox
                  options={availableCities.map(c => ({ value: c.id, label: c.name }))}
                  onValueChange={addCityPricing}
                  placeholder="Select city…"
                  searchPlaceholder="Search city…"
                  disabled={availableCities.length === 0}
                />
              )}
              {availableCities.length === 0 && cities.length > 0 && cityPricing.length > 0 && (
                <p className="text-xs text-muted-foreground">All cities have overrides.</p>
              )}
              {cityPricing.length > 0 && (
                <div className="rounded-md border divide-y">
                  {cityPricing.map((entry, i) => (
                    <div key={entry.city_id} className="flex items-center gap-3 px-3 py-2">
                      <span className="text-sm font-medium w-36 shrink-0">{entry.city_name}</span>
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">+/- ₹</span>
                        <Input type="number" step={0.05} className="pl-12" placeholder="0" value={entry.price_modifier} onChange={e => updateCityPrice(i, e.target.value)} />
                      </div>
                      <Button variant="ghost" size="icon-sm" onClick={() => removeCityPricing(i)}>
                        <XIcon className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
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

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete product?"
        description="This product will be permanently removed from the catalog."
        loading={deleting}
        onConfirm={() => deleteId && handleDelete(deleteId)}
      />
    </div>
  )
}
