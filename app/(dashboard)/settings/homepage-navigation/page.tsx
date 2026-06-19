'use client'

import { useEffect, useRef, useState } from 'react'
import { GripVertical, XIcon, PlusIcon } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'

interface Product {
  id: string
  name: string
  base_price: number
  images?: string[]
  slug?: string
}

interface PanelProps {
  title: string
  description: string
  maxItems: number
  selected: Product[]
  available: Product[]
  loading: boolean
  saving: boolean
  onAdd: (id: string) => void
  onRemove: (id: string) => void
  onReorder: (from: number, to: number) => void
  onSave: () => void
}

function DraggablePanel({
  title, description, maxItems, selected, available, loading, saving,
  onAdd, onRemove, onReorder, onSave,
}: PanelProps) {
  const [pending, setPending] = useState('')
  const dragIdxRef = useRef<number | null>(null)

  return (
    <div className="rounded-lg border bg-card p-5 space-y-4">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>

      {selected.length < maxItems && available.length > 0 && (
        <Combobox
          options={available.map(p => ({ value: p.id, label: p.name }))}
          value={pending}
          onValueChange={id => { setPending(''); onAdd(id) }}
          placeholder="Add product…"
          searchPlaceholder="Search products…"
        />
      )}
      {selected.length >= maxItems && (
        <p className="text-xs text-muted-foreground">Maximum {maxItems} products reached.</p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : selected.length === 0 ? (
        <p className="text-sm text-muted-foreground">No products selected yet.</p>
      ) : (
        <div className="space-y-2">
          {selected.map((product, idx) => (
            <div
              key={product.id}
              draggable
              onDragStart={() => { dragIdxRef.current = idx }}
              onDragOver={e => e.preventDefault()}
              onDrop={() => {
                const from = dragIdxRef.current
                if (from != null && from !== idx) onReorder(from, idx)
                dragIdxRef.current = null
              }}
              className="flex items-center gap-3 rounded-md border bg-background px-3 py-2.5"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />
              {product.images?.[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.images[0]} alt="" className="size-9 rounded object-cover bg-muted shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{product.name}</p>
                <p className="text-xs text-muted-foreground">₹{Number(product.base_price).toLocaleString('en-IN')}</p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => onRemove(product.id)}>
                <XIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button onClick={onSave} disabled={saving || loading} size="sm">
        {saving ? 'Saving…' : 'Save'}
      </Button>
    </div>
  )
}

export default function HomepageNavigationPage() {
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [navbarProducts, setNavbarProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [savingFeatured, setSavingFeatured] = useState(false)
  const [savingNavbar, setSavingNavbar] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get<{ items: Product[] }>('/admin/products'),
      api.get<{ key: string; value: string | null }>('/admin/settings/homepage_featured_products'),
      api.get<{ key: string; value: string | null }>('/admin/settings/navbar_products'),
    ])
      .then(([productsRes, featuredRes, navbarRes]) => {
        const products = (productsRes as { items: Product[] }).items ?? []
        setAllProducts(products)

        const productById = new Map(products.map(p => [p.id, p]))

        const featuredIds: string[] = JSON.parse((featuredRes as { value: string | null }).value ?? '[]')
        setFeaturedProducts(featuredIds.map(id => productById.get(id)).filter((p): p is Product => !!p))

        const navbarIds: string[] = JSON.parse((navbarRes as { value: string | null }).value ?? '[]')
        setNavbarProducts(navbarIds.map(id => productById.get(id)).filter((p): p is Product => !!p))
      })
      .catch(err => toast.error(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  function addToList(
    list: Product[],
    setList: React.Dispatch<React.SetStateAction<Product[]>>,
    id: string,
  ) {
    const product = allProducts.find(p => p.id === id)
    if (!product || list.some(p => p.id === id)) return
    setList(prev => [...prev, product])
  }

  function removeFromList(
    setList: React.Dispatch<React.SetStateAction<Product[]>>,
    id: string,
  ) {
    setList(prev => prev.filter(p => p.id !== id))
  }

  function reorderList(
    setList: React.Dispatch<React.SetStateAction<Product[]>>,
    from: number,
    to: number,
  ) {
    setList(prev => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  async function saveFeatured() {
    setSavingFeatured(true)
    try {
      await api.post('/admin/settings', {
        key: 'homepage_featured_products',
        value: JSON.stringify(featuredProducts.map(p => p.id)),
      })
      toast.success('Featured products saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSavingFeatured(false)
    }
  }

  async function saveNavbar() {
    setSavingNavbar(true)
    try {
      await api.post('/admin/settings', {
        key: 'navbar_products',
        value: JSON.stringify(navbarProducts.map(p => p.id)),
      })
      toast.success('Navbar products saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSavingNavbar(false)
    }
  }

  const availableForFeatured = allProducts.filter(p => !featuredProducts.some(x => x.id === p.id))
  const availableForNavbar = allProducts.filter(p => !navbarProducts.some(x => x.id === p.id))

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Homepage & Navigation</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure which products appear on the homepage featured section and in the navbar products menu.
        </p>
      </div>

      <DraggablePanel
        title="Homepage Featured Products"
        description="Up to 8 products shown in the Featured Products section on the homepage. Drag to reorder."
        maxItems={8}
        selected={featuredProducts}
        available={availableForFeatured}
        loading={loading}
        saving={savingFeatured}
        onAdd={id => addToList(featuredProducts, setFeaturedProducts, id)}
        onRemove={id => removeFromList(setFeaturedProducts, id)}
        onReorder={(from, to) => reorderList(setFeaturedProducts, from, to)}
        onSave={saveFeatured}
      />

      <DraggablePanel
        title="Navbar Products"
        description="Up to 8 products shown in the navbar mega-menu dropdown. Rendered 4+4 on desktop. Drag to reorder."
        maxItems={8}
        selected={navbarProducts}
        available={availableForNavbar}
        loading={loading}
        saving={savingNavbar}
        onAdd={id => addToList(navbarProducts, setNavbarProducts, id)}
        onRemove={id => removeFromList(setNavbarProducts, id)}
        onReorder={(from, to) => reorderList(setNavbarProducts, from, to)}
        onSave={saveNavbar}
      />
    </div>
  )
}
