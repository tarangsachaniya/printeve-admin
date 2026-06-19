'use client'

import { useEffect, useRef, useState } from 'react'
import { PlusIcon, VideoIcon, XIcon, UploadIcon, Info, GripVertical, ChevronDown, ChevronUp, ImageIcon } from 'lucide-react'
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
  title, description, emptyHint, entries, available, pending, setPending, onAdd, onUpdate, onRemove, comboboxPlaceholder, onCreateOption, createPlaceholder,
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
  onCreateOption?: (name: string) => Promise<void>
  createPlaceholder?: string
}) {
  const [newOptVal, setNewOptVal] = useState('')
  const [creatingOpt, setCreatingOpt] = useState(false)
  const hasOptions = available.length > 0 || entries.length > 0

  async function handleCreate() {
    if (!newOptVal.trim() || !onCreateOption) return
    setCreatingOpt(true)
    try {
      await onCreateOption(newOptVal.trim())
      setNewOptVal('')
    } finally { setCreatingOpt(false) }
  }

  return (
    <section className="space-y-3">
      <SectionHeader label={title} description={description} />
      {hasOptions && (
        <Combobox
          options={available.map(o => ({ value: o.id, label: o.name }))}
          value={pending}
          onValueChange={v => { setPending(v); onAdd(v) }}
          placeholder={comboboxPlaceholder}
          searchPlaceholder="Search…"
          disabled={available.length === 0}
        />
      )}
      {onCreateOption && (
        <div className="flex items-center gap-2">
          <Input
            placeholder={createPlaceholder ?? 'New option name'}
            value={newOptVal}
            onChange={e => setNewOptVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleCreate())}
            className="flex-1"
          />
          <Button size="sm" variant="outline" onClick={handleCreate} disabled={creatingOpt || !newOptVal.trim()}>
            <PlusIcon className="h-3.5 w-3.5 mr-1" /> {creatingOpt ? '...' : 'Create'}
          </Button>
        </div>
      )}
      {available.length === 0 && entries.length > 0 && !onCreateOption && (
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

interface FieldDefCatalog {
  id: string
  key: string
  label: string
  field_type: 'select' | 'multi_select' | 'boolean' | 'number' | 'text' | 'textarea' | 'file_upload' | 'radio'
  field_option_values: FieldOptionValue[]
}

interface ProductFieldDef {
  field_definition_id: string
  sort_order: number
  is_required: boolean
  label: string
  key: string
  field_type: FieldDefCatalog['field_type']
  field_option_values: FieldOptionValue[]
}

function CustomFieldOptionsEditor({
  fieldDefId, field, isRequired, entries, available, pending, setPending, onAdd, onUpdate, onRemove, onSetDefault, onToggleRequired, onCreateOption,
}: {
  fieldDefId: string
  field: Pick<FieldDefCatalog, 'label' | 'field_type'>
  isRequired: boolean
  entries: CustomFieldOptionEntry[]
  available: { id: string; name: string }[]
  pending: string
  setPending: (v: string) => void
  onAdd: (id: string) => void
  onUpdate: (i: number, value: string) => void
  onRemove: (i: number) => void
  onSetDefault: (i: number) => void
  onToggleRequired: () => void
  onCreateOption?: (fieldDefId: string, value: string) => Promise<void>
}) {
  const [newOptVal, setNewOptVal] = useState('')
  const [creatingOpt, setCreatingOpt] = useState(false)
  const hasOptions = available.length > 0 || entries.length > 0
  const showDefault = field.field_type === 'select' || field.field_type === 'boolean' || field.field_type === 'radio'
  const isPriceAffecting = ['select', 'multi_select', 'boolean', 'radio'].includes(field.field_type)

  async function handleCreateOption() {
    if (!newOptVal.trim() || !onCreateOption) return
    setCreatingOpt(true)
    try {
      await onCreateOption(fieldDefId, newOptVal.trim())
      setNewOptVal('')
    } finally { setCreatingOpt(false) }
  }

  return (
    <div className="rounded-md border p-3 space-y-3 bg-muted/20">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{field.label}{isRequired ? ' *' : ''}</p>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={isRequired} onChange={onToggleRequired} className="accent-primary" />
          Required
        </label>
      </div>
      {hasOptions && (
        <Combobox
          options={available.map(o => ({ value: o.id, label: o.name }))}
          value={pending}
          onValueChange={v => { setPending(v); onAdd(v) }}
          placeholder={`Select ${field.label.toLowerCase()}…`}
          searchPlaceholder="Search…"
          disabled={available.length === 0}
        />
      )}
      {isPriceAffecting && onCreateOption && (
        <div className="flex items-center gap-2">
          <Input
            placeholder="New option value"
            value={newOptVal}
            onChange={e => setNewOptVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleCreateOption())}
            className="flex-1"
          />
          <Button size="sm" variant="outline" onClick={handleCreateOption} disabled={creatingOpt || !newOptVal.trim()}>
            <PlusIcon className="h-3.5 w-3.5 mr-1" /> {creatingOpt ? '...' : 'Create'}
          </Button>
        </div>
      )}
      {available.length === 0 && entries.length > 0 && !isPriceAffecting && (
        <p className="text-xs text-muted-foreground">All configured options are added.</p>
      )}
      {entries.length > 0 && (
        <div className="rounded-md border divide-y bg-background">
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
    </div>
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
  is_active: boolean
  description?: string | null
  category_id?: string | null
  paper_sizes?: { paper_size_id: string; name: string; price_modifier: number }[]
  paper_qualities?: { paper_quality_id: string; name: string; price_modifier: number }[]
  paper_types?: { paper_type_id: string; name: string; price_modifier: number }[]
  quantity_slabs?: QuantitySlab[]
  images?: string[]
  video_url?: string | null
  faqs?: { question: string; answer: string }[]
  finish_and_care?: string[]
  guidelines?: { icon_url: string; title: string; description: string }[]
  specifications?: { key: string; value: string }[]
  custom_fields?: {
    product_field_id: string
    field_definition_id: string
    key: string
    label: string
    field_type: FieldDefCatalog['field_type']
    is_required: boolean
    options: { id: string; name: string; price_modifier: number; is_default: boolean }[]
  }[]
}

interface PaperSize { id: string; name: string; sort_order: number }
interface PaperQuality { id: string; gsm: number; label: string | null; name: string }
interface PaperTypeOption { id: string; name: string; sort_order: number }
type OptionEntry = { id: string; name: string; price_modifier: string }
type QtySlab = { min_qty: string; max_qty: string; price_modifier: string; max_completion_minutes: string }
interface City { id: string; name: string; state: string }
type CityPricingEntry = { id?: string; city_id: string; city_name: string; price_modifier: string }

const FIELD_TYPE_LABELS: Record<string, string> = {
  select: 'Dropdown', multi_select: 'Multi-select', boolean: 'Yes/No',
  radio: 'Radio', number: 'Number', text: 'Text', textarea: 'Textarea', file_upload: 'File Upload',
}

const PRICE_AFFECTING_TYPES = new Set(['select', 'multi_select', 'boolean', 'radio'])
const INPUT_ONLY_TYPES = new Set(['number', 'text', 'textarea', 'file_upload'])

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [paperSizes, setPaperSizes] = useState<PaperSize[]>([])
  const [paperQualities, setPaperQualities] = useState<PaperQuality[]>([])
  const [paperTypeOptions, setPaperTypeOptions] = useState<PaperTypeOption[]>([])
  const [fieldDefinitionCatalog, setFieldDefinitionCatalog] = useState<FieldDefCatalog[]>([])
  const [categories, setCategories] = useState<{id: string; title: string}[]>([])
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
  const [categoryId, setCategoryId] = useState('')
  const [paperSizesSel, setPaperSizesSel] = useState<OptionEntry[]>([])
  const [paperQualitiesSel, setPaperQualitiesSel] = useState<OptionEntry[]>([])
  const [paperTypesSel, setPaperTypesSel] = useState<OptionEntry[]>([])
  const [qtySlabs, setQtySlabs] = useState<QtySlab[]>([])
  const [pendingSize, setPendingSize] = useState('')
  const [pendingQuality, setPendingQuality] = useState('')
  const [pendingType, setPendingType] = useState('')

  const [productFields, setProductFields] = useState<ProductFieldDef[]>([])
  const [customFieldOptionSel, setCustomFieldOptionSel] = useState<Record<string, CustomFieldOptionEntry[]>>({})
  const [customFieldPending, setCustomFieldPending] = useState<Record<string, string>>({})
  const [pendingFieldDefId, setPendingFieldDefId] = useState('')

  // New field definition creation state
  const [creatingField, setCreatingField] = useState(false)
  const [newFieldKey, setNewFieldKey] = useState('')
  const [newFieldLabel, setNewFieldLabel] = useState('')
  const [newFieldType, setNewFieldType] = useState<FieldDefCatalog['field_type']>('select')
  const [newFieldOptions, setNewFieldOptions] = useState('')
  const [addingFieldDef, setAddingFieldDef] = useState(false)

  // Drag-and-drop state for product fields reordering
  const dragFieldIndexRef = useRef<number | null>(null)

  // Content sections state
  const DEFAULT_SPECS = [
    { key: 'Material', value: '' },
    { key: 'Trim Size', value: '' },
    { key: 'Print Options', value: '' },
    { key: 'Paper Weight / GSM', value: '' },
    { key: 'Finish Type', value: '' },
    { key: 'Color Mode', value: '' },
    { key: 'Finish', value: '' },
    { key: 'Printing Sides', value: '' },
    { key: 'Special Finishes', value: '' },
    { key: 'Fold Type', value: '' },
    { key: 'Lamination', value: '' },
    { key: 'Usage', value: '' },
    { key: 'Binding', value: '' },
    { key: 'Waterproof', value: '' },
    { key: 'Window', value: '' },
    { key: 'Envelope Needed', value: '' },
    { key: 'Individual Cut', value: '' },
    { key: 'Hole Required', value: '' },
    { key: 'String Required', value: '' },
    { key: 'Number of Pages', value: '' },
  ]
  const [faqs, setFaqs] = useState<{ question: string; answer: string }[]>([])
  const [finishAndCare, setFinishAndCare] = useState<string[]>([])
  const [guidelinesArr, setGuidelinesArr] = useState<{ icon_url: string; title: string; description: string }[]>([])
  const [specifications, setSpecifications] = useState<{ key: string; value: string }[]>([])
  const [uploadingGuidelineIcon, setUploadingGuidelineIcon] = useState<number | null>(null)

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
    setName(''); setBasePrice(''); setCategoryId('')
    setPaperSizesSel([]); setPaperQualitiesSel([]); setPaperTypesSel([]); setQtySlabs([])
    setPendingSize(''); setPendingQuality(''); setPendingType('')
    setImages([]); setVideoUrl('')
    setCityPricing([]); originalCityPricingRef.current = []
    setProductFields([]); setCustomFieldOptionSel({}); setCustomFieldPending({}); setPendingFieldDefId('')
    setCreatingField(false); setNewFieldKey(''); setNewFieldLabel(''); setNewFieldType('select'); setNewFieldOptions('')
    setFaqs([]); setFinishAndCare([]); setGuidelinesArr([]); setSpecifications([])
    descEditor?.commands.setContent('')
  }

  type ProductsResponse = {
    items: Product[]
    meta: {
      sizes: PaperSize[]
      qualities: PaperQuality[]
      types: PaperTypeOption[]
      cities: City[]
      field_definitions: FieldDefCatalog[]
      categories: { id: string; title: string }[]
    }
  }

  function load() {
    setLoading(true)
    api.get<ProductsResponse>('/admin/products')
      .then(res => {
        setProducts(res.items ?? [])
        setPaperSizes(res.meta?.sizes ?? [])
        setPaperQualities(
          (res.meta?.qualities ?? []).map(q => ({
            id: q.id, gsm: q.gsm, label: q.label,
            name: q.label ? `${q.gsm} GSM (${q.label})` : `${q.gsm} GSM`,
          }))
        )
        setPaperTypeOptions(res.meta?.types ?? [])
        setCities(res.meta?.cities ?? [])
        setFieldDefinitionCatalog(res.meta?.field_definitions ?? [])
        setCategories(res.meta?.categories ?? [])
      })
      .catch((err) => toast.error(err.message ?? 'Failed to load products'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const availableSizes = paperSizes.filter(s => !paperSizesSel.some(x => x.id === s.id))
  const availableQualities = paperQualities.filter(q => !paperQualitiesSel.some(x => x.id === q.id))
  const availableTypes = paperTypeOptions.filter(t => !paperTypesSel.some(x => x.id === t.id))
  const availableFieldDefs = fieldDefinitionCatalog.filter(fd => !productFields.some(pf => pf.field_definition_id === fd.id))

  function openCreate() {
    setEditing(null); resetForm(); setSpecifications([...DEFAULT_SPECS]); setOpen(true)
  }

  function openEdit(p: Product) {
    setEditing(p)
    setName(p.name)
    setBasePrice(String(p.base_price))
    setCategoryId(p.category_id ?? '')
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
    setFaqs(p.faqs ?? [])
    setFinishAndCare(p.finish_and_care ?? [])
    setGuidelinesArr(p.guidelines ?? [])
    setSpecifications(p.specifications?.length ? p.specifications : DEFAULT_SPECS)

    const fields: ProductFieldDef[] = []
    const optionSel: Record<string, CustomFieldOptionEntry[]> = {}
    for (const cf of p.custom_fields ?? []) {
      const catalog = fieldDefinitionCatalog.find(fd => fd.id === cf.field_definition_id)
      fields.push({
        field_definition_id: cf.field_definition_id,
        sort_order: fields.length,
        is_required: cf.is_required,
        label: cf.label,
        key: cf.key,
        field_type: cf.field_type,
        field_option_values: catalog?.field_option_values ?? [],
      })
      optionSel[cf.field_definition_id] = cf.options.map(o => ({
        id: o.id, name: o.name, price_modifier: String(o.price_modifier), is_default: o.is_default,
      }))
    }
    setProductFields(fields)
    setCustomFieldOptionSel(optionSel)
    setCustomFieldPending({}); setPendingFieldDefId('')
    setPendingSize(''); setPendingQuality(''); setPendingType('')
    descEditor?.commands.setContent(p.description ?? '')
    setCityPricing([]); originalCityPricingRef.current = []
    api.get<{ items: Array<{ id: string; city_id: string; city_name: string; price_modifier: number | null }> }>(`/admin/products/${p.id}/city-pricing`)
      .then(r => {
        const entries = (r.items ?? []).map(item => ({
          id: item.id, city_id: item.city_id, city_name: item.city_name ?? '',
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

  async function createPaperSize(name: string) {
    const res = await api.post<{ data: PaperSize }>('/admin/paper/sizes', { name, sort_order: paperSizes.length })
    const created = res.data
    setPaperSizes(prev => [...prev, created])
    setPaperSizesSel(prev => [...prev, { id: created.id, name: created.name, price_modifier: '' }])
    toast.success(`Paper size "${name}" created`)
  }

  async function createPaperQuality(input: string) {
    const match = input.match(/^(\d+)\s*(?:GSM)?\s*(?:\((.+)\))?$/i)
    const gsm = match ? Number(match[1]) : Number(input)
    const label = match?.[2]?.trim() || null
    if (!gsm || isNaN(gsm)) { toast.error('Enter a valid GSM value, e.g. "300" or "300 GSM (Premium)"'); return }
    const res = await api.post<{ data: { id: string; gsm: number; label: string | null } }>('/admin/paper/qualities', { gsm, label })
    const q = res.data
    const displayName = q.label ? `${q.gsm} GSM (${q.label})` : `${q.gsm} GSM`
    setPaperQualities(prev => [...prev, { id: q.id, gsm: q.gsm, label: q.label, name: displayName }])
    setPaperQualitiesSel(prev => [...prev, { id: q.id, name: displayName, price_modifier: '' }])
    toast.success(`Paper quality "${displayName}" created`)
  }

  async function createPaperType(name: string) {
    const res = await api.post<{ data: PaperTypeOption }>('/admin/paper/types', { name, sort_order: paperTypeOptions.length })
    const created = res.data
    setPaperTypeOptions(prev => [...prev, created])
    setPaperTypesSel(prev => [...prev, { id: created.id, name: created.name, price_modifier: '' }])
    toast.success(`Paper type "${name}" created`)
  }

  function addFieldFromCatalog(fieldDefId: string) {
    const fd = fieldDefinitionCatalog.find(f => f.id === fieldDefId)
    if (!fd || productFields.some(pf => pf.field_definition_id === fd.id)) return
    setProductFields(prev => [
      ...prev,
      { field_definition_id: fd.id, sort_order: prev.length, is_required: false, label: fd.label, key: fd.key, field_type: fd.field_type, field_option_values: fd.field_option_values },
    ])
    setPendingFieldDefId('')
  }

  function removeProductField(fieldDefId: string) {
    setProductFields(prev => prev.filter(f => f.field_definition_id !== fieldDefId).map((f, i) => ({ ...f, sort_order: i })))
    setCustomFieldOptionSel(prev => { const next = { ...prev }; delete next[fieldDefId]; return next })
    setCustomFieldPending(prev => { const next = { ...prev }; delete next[fieldDefId]; return next })
  }

  function toggleFieldRequired(fieldDefId: string) {
    setProductFields(prev => prev.map(f => f.field_definition_id === fieldDefId ? { ...f, is_required: !f.is_required } : f))
  }

  function moveField(fromIdx: number, toIdx: number) {
    setProductFields(prev => {
      const next = [...prev]
      const [moved] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, moved)
      return next.map((f, i) => ({ ...f, sort_order: i }))
    })
  }

  async function createFieldDefinition() {
    const key = newFieldKey.trim()
    const label = newFieldLabel.trim()
    if (!key || !label) { toast.error('Key and label are required'); return }
    setAddingFieldDef(true)
    try {
      const options = newFieldOptions.split(',').map(o => o.trim()).filter(Boolean)
      const res = await api.post<{ data: FieldDefCatalog }>('/admin/field-definitions', { key, label, field_type: newFieldType, options })
      const created: FieldDefCatalog = res.data
      setFieldDefinitionCatalog(prev => [...prev, created])
      setProductFields(prev => [
        ...prev,
        { field_definition_id: created.id, sort_order: prev.length, is_required: false, label: created.label, key: created.key, field_type: created.field_type, field_option_values: created.field_option_values ?? [] },
      ])
      setNewFieldKey(''); setNewFieldLabel(''); setNewFieldType('select'); setNewFieldOptions('')
      setCreatingField(false)
      toast.success('Field created and added')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create field')
    } finally { setAddingFieldDef(false) }
  }

  async function createFieldOption(fieldDefId: string, value: string) {
    try {
      const res = await api.post<{ data: { id: string; value: string; sort_order: number } }>(
        `/admin/field-definitions/${fieldDefId}/options`, { value: value.trim() }
      )
      const newOpt = res.data
      setFieldDefinitionCatalog(prev => prev.map(fd =>
        fd.id === fieldDefId
          ? { ...fd, field_option_values: [...fd.field_option_values, newOpt] }
          : fd
      ))
      setProductFields(prev => prev.map(pf =>
        pf.field_definition_id === fieldDefId
          ? { ...pf, field_option_values: [...pf.field_option_values, newOpt] }
          : pf
      ))
      setCustomFieldOptionSel(prev => ({
        ...prev,
        [fieldDefId]: [...(prev[fieldDefId] ?? []),
          { id: newOpt.id, name: newOpt.value, price_modifier: '', is_default: false }],
      }))
      toast.success(`Option "${value}" created`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create option')
    }
  }

  function addCustomFieldOption(fieldDefId: string, available: FieldOptionValue[], optionValueId: string) {
    const opt = available.find(o => o.id === optionValueId)
    if (!opt) return
    setCustomFieldOptionSel(prev => {
      const entries = prev[fieldDefId] ?? []
      if (entries.some(e => e.id === opt.id)) return prev
      return { ...prev, [fieldDefId]: [...entries, { id: opt.id, name: opt.value, price_modifier: '', is_default: entries.length === 0 }] }
    })
  }

  function updateCustomFieldModifier(fieldDefId: string, i: number, price_modifier: string) {
    setCustomFieldOptionSel(prev => ({
      ...prev,
      [fieldDefId]: (prev[fieldDefId] ?? []).map((e, j) => j === i ? { ...e, price_modifier } : e),
    }))
  }

  function removeCustomFieldOption(fieldDefId: string, i: number) {
    setCustomFieldOptionSel(prev => ({
      ...prev,
      [fieldDefId]: (prev[fieldDefId] ?? []).filter((_, j) => j !== i),
    }))
  }

  function setCustomFieldDefault(fieldDefId: string, i: number) {
    setCustomFieldOptionSel(prev => ({
      ...prev,
      [fieldDefId]: (prev[fieldDefId] ?? []).map((e, j) => ({ ...e, is_default: j === i })),
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

  async function handleSave() {
    setSaving(true)
    try {
      const body = {
        name,
        base_price: Number(basePrice),
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
        product_fields: productFields.map((f, i) => ({
          field_definition_id: f.field_definition_id,
          sort_order: i,
          is_required: f.is_required,
        })),
        custom_field_options: productFields.flatMap(f =>
          (customFieldOptionSel[f.field_definition_id] ?? []).map(e => ({
            field_definition_id: f.field_definition_id,
            field_option_value_id: e.id,
            price_modifier: Number(e.price_modifier) || 0,
            is_default: Boolean(e.is_default),
          }))
        ),
        images,
        video_url: videoUrl || null,
        category_id: categoryId || null,
        faqs,
        finish_and_care: finishAndCare,
        guidelines: guidelinesArr,
        specifications: specifications.filter(s => s.key.trim()),
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
    i: number, price_modifier: string,
  ) {
    setEntries(prev => prev.map((x, j) => j === i ? { ...x, price_modifier } : x))
  }

  function removeOption(setEntries: React.Dispatch<React.SetStateAction<OptionEntry[]>>, i: number) {
    setEntries(prev => prev.filter((_, j) => j !== i))
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
                        size="sm" variant="outline"
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
                description="The product name shown to customers and the base price per unit before any size, quality, or quantity adjustments."
              />
              <div className="space-y-1.5">
                <Label>Product Name <span className="text-destructive">*</span></Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Business Cards" />
              </div>
              <div className="space-y-1.5">
                <Label>Base Price (₹) <span className="text-destructive">*</span></Label>
                <Input type="number" value={basePrice} onChange={e => setBasePrice(e.target.value)} placeholder="0" />
              </div>
              {categories.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Combobox
                    options={categories.map(c => ({ value: c.id, label: c.title }))}
                    value={categoryId}
                    onValueChange={setCategoryId}
                    placeholder="Select category (optional)"
                    searchPlaceholder="Search categories…"
                  />
                </div>
              )}
            </section>

            {/* ── Description ── */}
            <section className="space-y-3">
              <SectionHeader
                label="Product Description"
                description="Describe what this product includes — material, finish, use case, etc."
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
                description="Upload photos of this product. The first image is used as the thumbnail. Supports PNG, JPG, and WEBP."
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
                  <p className="text-sm font-medium">{uploadingImages ? 'Uploading…' : 'Drop images here or click to browse'}</p>
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
                description="Optional. Upload a short video to show the product quality or printing process."
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
              description="Select the paper sizes this product can be printed in and their price adjustments."
              emptyHint={<>No paper sizes configured.{' '}<Link href="/paper/sizes" className="text-primary underline-offset-4 hover:underline">Add paper sizes</Link></>}
              entries={paperSizesSel}
              available={availableSizes}
              pending={pendingSize}
              setPending={setPendingSize}
              onAdd={id => addOption(setPaperSizesSel, paperSizesSel, availableSizes, id)}
              onUpdate={(i, v) => updateOptionModifier(setPaperSizesSel, i, v)}
              onRemove={i => removeOption(setPaperSizesSel, i)}
              comboboxPlaceholder="Select size…"
              onCreateOption={createPaperSize}
              createPlaceholder="e.g. A4, A5, 3.5x2 in"
            />

            {/* ── Paper Qualities ── */}
            <VariantOptionEditor
              title="Available Paper Qualities"
              description="Select the paper quality (GSM) options and their price adjustments."
              emptyHint={<>No paper qualities configured.{' '}<Link href="/paper/qualities" className="text-primary underline-offset-4 hover:underline">Add paper qualities</Link></>}
              entries={paperQualitiesSel}
              available={availableQualities}
              pending={pendingQuality}
              setPending={setPendingQuality}
              onAdd={id => addOption(setPaperQualitiesSel, paperQualitiesSel, availableQualities, id)}
              onUpdate={(i, v) => updateOptionModifier(setPaperQualitiesSel, i, v)}
              onRemove={i => removeOption(setPaperQualitiesSel, i)}
              comboboxPlaceholder="Select paper quality…"
              onCreateOption={createPaperQuality}
              createPlaceholder="e.g. 300 or 300 GSM (Premium)"
            />

            {/* ── Paper Type ── */}
            <VariantOptionEditor
              title="Available Paper Types"
              description="Select the paper types (e.g. Glossy, Matte, Kraft) and their price adjustments."
              emptyHint={<>No paper types configured.{' '}<Link href="/paper/types" className="text-primary underline-offset-4 hover:underline">Add paper types</Link></>}
              entries={paperTypesSel}
              available={availableTypes}
              pending={pendingType}
              setPending={setPendingType}
              onAdd={id => addOption(setPaperTypesSel, paperTypesSel, availableTypes, id)}
              onUpdate={(i, v) => updateOptionModifier(setPaperTypesSel, i, v)}
              onRemove={i => removeOption(setPaperTypesSel, i)}
              comboboxPlaceholder="Select paper type…"
              onCreateOption={createPaperType}
              createPlaceholder="e.g. Glossy, Matte, Kraft"
            />

            {/* ── Custom Fields ── */}
            <section className="space-y-3">
              <SectionHeader
                label="Custom Fields"
                description="Fields shown to customers when configuring this product. Drag to reorder. Select/Radio/Boolean fields can have per-option price modifiers."
              />

              {/* Draggable list of assigned fields */}
              {productFields.length > 0 && (
                <div className="space-y-2">
                  {productFields.map((pf, idx) => {
                    const isPriceAffecting = PRICE_AFFECTING_TYPES.has(pf.field_type)
                    const entries = customFieldOptionSel[pf.field_definition_id] ?? []
                    const available = pf.field_option_values.filter(v => !entries.some(e => e.id === v.id))
                    return (
                      <div
                        key={pf.field_definition_id}
                        draggable
                        onDragStart={() => { dragFieldIndexRef.current = idx }}
                        onDragOver={e => { e.preventDefault() }}
                        onDrop={() => {
                          const from = dragFieldIndexRef.current
                          if (from != null && from !== idx) moveField(from, idx)
                          dragFieldIndexRef.current = null
                        }}
                        className="rounded-md border bg-card"
                      >
                        <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-t-md border-b">
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium">{pf.label}</span>
                            <Badge variant="outline" className="ml-2 text-xs">{FIELD_TYPE_LABELS[pf.field_type] ?? pf.field_type}</Badge>
                          </div>
                          <Button
                            variant="ghost" size="icon-sm"
                            onClick={() => removeProductField(pf.field_definition_id)}
                          >
                            <XIcon className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="px-3 py-3">
                          {isPriceAffecting ? (
                            <CustomFieldOptionsEditor
                              fieldDefId={pf.field_definition_id}
                              field={{ label: pf.label, field_type: pf.field_type }}
                              isRequired={pf.is_required}
                              entries={entries}
                              available={available.map(v => ({ id: v.id, name: v.value }))}
                              pending={customFieldPending[pf.field_definition_id] ?? ''}
                              setPending={v => setCustomFieldPending(prev => ({ ...prev, [pf.field_definition_id]: v }))}
                              onAdd={id => addCustomFieldOption(pf.field_definition_id, pf.field_option_values, id)}
                              onUpdate={(i, v) => updateCustomFieldModifier(pf.field_definition_id, i, v)}
                              onRemove={i => removeCustomFieldOption(pf.field_definition_id, i)}
                              onSetDefault={i => setCustomFieldDefault(pf.field_definition_id, i)}
                              onToggleRequired={() => toggleFieldRequired(pf.field_definition_id)}
                              onCreateOption={createFieldOption}
                            />
                          ) : (
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-muted-foreground">
                                Customer input field — no price impact
                              </p>
                              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                                <input type="checkbox" checked={pf.is_required} onChange={() => toggleFieldRequired(pf.field_definition_id)} className="accent-primary" />
                                Required
                              </label>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Add field from catalog */}
              {availableFieldDefs.length > 0 && (
                <Combobox
                  options={availableFieldDefs.map(fd => ({ value: fd.id, label: `${fd.label} (${FIELD_TYPE_LABELS[fd.field_type] ?? fd.field_type})` }))}
                  value={pendingFieldDefId}
                  onValueChange={v => { setPendingFieldDefId(v); addFieldFromCatalog(v) }}
                  placeholder="Add field from catalog…"
                  searchPlaceholder="Search fields…"
                />
              )}
              {availableFieldDefs.length === 0 && productFields.length > 0 && (
                <p className="text-xs text-muted-foreground">All catalog fields are assigned to this product.</p>
              )}

              {/* Create new field definition inline */}
              {!creatingField ? (
                <Button type="button" variant="outline" size="sm" onClick={() => setCreatingField(true)}>
                  <PlusIcon className="h-3.5 w-3.5 mr-1" /> Create New Field Type
                </Button>
              ) : (
                <div className="rounded-md border p-3 space-y-3 bg-muted/20">
                  <p className="text-sm font-medium">New Field Definition</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Key (internal)</Label>
                      <Input
                        value={newFieldKey}
                        onChange={e => setNewFieldKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                        placeholder="e.g. paper_color"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Label (shown to customer)</Label>
                      <Input value={newFieldLabel} onChange={e => setNewFieldLabel(e.target.value)} placeholder="e.g. Paper Color" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Field Type</Label>
                    <select
                      value={newFieldType}
                      onChange={e => setNewFieldType(e.target.value as FieldDefCatalog['field_type'])}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="select">Dropdown (single select)</option>
                      <option value="radio">Radio Buttons</option>
                      <option value="multi_select">Checkboxes (multi-select)</option>
                      <option value="boolean">Yes / No</option>
                      <option value="number">Number</option>
                      <option value="text">Short Text</option>
                      <option value="textarea">Long Text / Textarea</option>
                      <option value="file_upload">File Upload</option>
                    </select>
                  </div>
                  {(newFieldType === 'select' || newFieldType === 'radio' || newFieldType === 'multi_select' || newFieldType === 'boolean') && (
                    <div className="space-y-1">
                      <Label className="text-xs">Options (comma-separated)</Label>
                      <Input value={newFieldOptions} onChange={e => setNewFieldOptions(e.target.value)} placeholder="e.g. Red, Blue, Green" />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={createFieldDefinition} disabled={addingFieldDef || !newFieldKey.trim() || !newFieldLabel.trim()}>
                      {addingFieldDef ? 'Creating…' : 'Create & Add'}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setCreatingField(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </section>

            {/* ── FAQs ── */}
            <section className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <SectionHeader label="FAQs" description="Question & answer pairs displayed on the product page." />
                <Button variant="outline" size="sm" className="shrink-0" onClick={() => setFaqs(prev => [...prev, { question: '', answer: '' }])}>
                  <PlusIcon className="h-3.5 w-3.5 mr-1" /> Add FAQ
                </Button>
              </div>
              {faqs.length > 0 && (
                <div className="space-y-3">
                  {faqs.map((faq, i) => (
                    <div key={i} className="rounded-md border p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Question"
                          value={faq.question}
                          onChange={e => setFaqs(prev => prev.map((f, idx) => idx === i ? { ...f, question: e.target.value } : f))}
                          className="flex-1"
                        />
                        <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => setFaqs(prev => prev.filter((_, idx) => idx !== i))}>
                          <XIcon className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <textarea
                        placeholder="Answer"
                        value={faq.answer}
                        onChange={e => setFaqs(prev => prev.map((f, idx) => idx === i ? { ...f, answer: e.target.value } : f))}
                        className="w-full rounded-md border px-3 py-2 text-sm min-h-[60px] resize-y bg-transparent"
                        rows={2}
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── Finish & Care ── */}
            <section className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <SectionHeader label="Finish & Care" description="Bullet points with care instructions." />
                <Button variant="outline" size="sm" className="shrink-0" onClick={() => setFinishAndCare(prev => [...prev, ''])}>
                  <PlusIcon className="h-3.5 w-3.5 mr-1" /> Add Point
                </Button>
              </div>
              {finishAndCare.length > 0 && (
                <div className="space-y-2">
                  {finishAndCare.map((point, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        placeholder="Care instruction point"
                        value={point}
                        onChange={e => setFinishAndCare(prev => prev.map((p, idx) => idx === i ? e.target.value : p))}
                        className="flex-1"
                      />
                      <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => setFinishAndCare(prev => prev.filter((_, idx) => idx !== i))}>
                        <XIcon className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── Guidelines ── */}
            <section className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <SectionHeader label="Guidelines" description="Guidelines with icon, title, and description." />
                <Button variant="outline" size="sm" className="shrink-0" onClick={() => setGuidelinesArr(prev => [...prev, { icon_url: '', title: '', description: '' }])}>
                  <PlusIcon className="h-3.5 w-3.5 mr-1" /> Add Guideline
                </Button>
              </div>
              {guidelinesArr.length > 0 && (
                <div className="space-y-3">
                  {guidelinesArr.map((g, i) => (
                    <div key={i} className="rounded-md border p-3 space-y-2">
                      <div className="flex items-start gap-3">
                        <div className="shrink-0">
                          {g.icon_url ? (
                            <div className="relative group">
                              <img src={g.icon_url} alt="" className="h-14 w-14 rounded-lg object-cover border" />
                              <button
                                type="button"
                                className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => setGuidelinesArr(prev => prev.map((gl, idx) => idx === i ? { ...gl, icon_url: '' } : gl))}
                              >
                                <XIcon className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <label className="flex items-center justify-center h-14 w-14 rounded-lg border-2 border-dashed cursor-pointer hover:border-primary/50 transition-colors">
                              {uploadingGuidelineIcon === i ? (
                                <span className="text-xs text-muted-foreground">...</span>
                              ) : (
                                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0]
                                  if (!file) return
                                  setUploadingGuidelineIcon(i)
                                  try {
                                    const url = await uploadToCloudinary(file, 'image')
                                    setGuidelinesArr(prev => prev.map((gl, idx) => idx === i ? { ...gl, icon_url: url } : gl))
                                  } catch (err) {
                                    toast.error('Icon upload failed')
                                  } finally {
                                    setUploadingGuidelineIcon(null)
                                  }
                                }}
                              />
                            </label>
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <Input
                            placeholder="Title"
                            value={g.title}
                            onChange={e => setGuidelinesArr(prev => prev.map((gl, idx) => idx === i ? { ...gl, title: e.target.value } : gl))}
                          />
                          <textarea
                            placeholder="Description"
                            value={g.description}
                            onChange={e => setGuidelinesArr(prev => prev.map((gl, idx) => idx === i ? { ...gl, description: e.target.value } : gl))}
                            className="w-full rounded-md border px-3 py-2 text-sm min-h-[50px] resize-y bg-transparent"
                            rows={2}
                          />
                        </div>
                        <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => setGuidelinesArr(prev => prev.filter((_, idx) => idx !== i))}>
                          <XIcon className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── Specifications ── */}
            <section className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <SectionHeader label="Specifications" description="Key-value pairs. Default fields are pre-populated for new products." />
                <Button variant="outline" size="sm" className="shrink-0" onClick={() => setSpecifications(prev => [...prev, { key: '', value: '' }])}>
                  <PlusIcon className="h-3.5 w-3.5 mr-1" /> Add Spec
                </Button>
              </div>
              {specifications.length > 0 && (
                <div className="space-y-2">
                  {specifications.map((spec, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        placeholder="Key (e.g. Material)"
                        value={spec.key}
                        onChange={e => setSpecifications(prev => prev.map((s, idx) => idx === i ? { ...s, key: e.target.value } : s))}
                        className="w-[180px] shrink-0"
                      />
                      <Input
                        placeholder="Value"
                        value={spec.value}
                        onChange={e => setSpecifications(prev => prev.map((s, idx) => idx === i ? { ...s, value: e.target.value } : s))}
                        className="flex-1"
                      />
                      <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => setSpecifications(prev => prev.filter((_, idx) => idx !== i))}>
                        <XIcon className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── Quantity Slabs ── */}
            <section className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <SectionHeader
                  label="Quantity-Based Pricing (Slabs)"
                  description="Set price adjustments based on order quantity. Leave Max Qty blank for open-ended slabs (e.g. 100+)."
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
                description="Adjust the price for customers ordering from specific cities."
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
