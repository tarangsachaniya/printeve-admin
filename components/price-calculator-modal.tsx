'use client'

import { useEffect, useState } from 'react'
import { CalculatorIcon } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Combobox } from '@/components/ui/combobox'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'

interface SizeOption    { paper_size_id: string;    name: string; price_modifier: number }
interface QualityOption { paper_quality_id: string; name: string; price_modifier: number }
interface TypeOption    { paper_type_id: string;    name: string; price_modifier: number }
interface QuantitySlab {
  min_qty: number; max_qty: number | null
  price_modifier: number; max_completion_minutes: number | null
}
interface Product {
  id: string; name: string; base_price: number
  paper_sizes?: SizeOption[]
  paper_qualities?: QualityOption[]
  paper_types?: TypeOption[]
  quantity_slabs?: QuantitySlab[]
}
interface City { id: string; name: string; state: string }

interface Props {
  products: Product[]
  cities: City[]
}

function fmt(n: number) {
  return (n >= 0 ? '+' : '') + '₹' + n.toLocaleString('en-IN')
}

export function PriceCalculatorModal({ products, cities }: Props) {
  const [open, setOpen] = useState(false)

  const [productId, setProductId] = useState('')
  const [sizeId, setSizeId] = useState('')
  const [qualityId, setQualityId] = useState('')
  const [typeId, setTypeId] = useState('')
  const [qty, setQty] = useState('')
  const [cityId, setCityId] = useState('')
  const [cityModifier, setCityModifier] = useState(0)
  const [loadingCity, setLoadingCity] = useState(false)

  const product = products.find(p => p.id === productId) ?? null

  // Reset selectors when product changes
  useEffect(() => {
    setSizeId('')
    setQualityId('')
    setTypeId('')
    setQty('')
    setCityId('')
    setCityModifier(0)
  }, [productId])

  // Load city pricing for this product when city changes
  useEffect(() => {
    if (!productId || !cityId) { setCityModifier(0); return }
    setLoadingCity(true)
    api.get<{ items: Array<{ city_id: string; price_modifier: number }> }>(`/admin/products/${productId}/city-pricing`)
      .then(r => {
        const row = (r.items ?? []).find(x => x.city_id === cityId)
        setCityModifier(row ? Number(row.price_modifier) : 0)
      })
      .catch(() => setCityModifier(0))
      .finally(() => setLoadingCity(false))
  }, [productId, cityId])

  function breakdown() {
    if (!product) return null
    const quantity = Number(qty)
    if (!quantity || quantity <= 0) return null

    const slab = (product.quantity_slabs ?? []).find(s =>
      quantity >= s.min_qty && (s.max_qty == null || quantity <= s.max_qty)
    )
    if (!slab) return null

    const size    = (product.paper_sizes ?? []).find(s => s.paper_size_id === sizeId)
    const quality = (product.paper_qualities ?? []).find(q => q.paper_quality_id === qualityId)
    const type    = (product.paper_types ?? []).find(t => t.paper_type_id === typeId)

    if (!size || !type) return null

    const basePrice  = Number(product.base_price)
    const sizeMod    = Number(size.price_modifier)
    const qualityMod = quality ? Number(quality.price_modifier) : 0
    const typeMod    = Number(type.price_modifier)
    const slabMod    = Number(slab.price_modifier)
    const cityMod    = cityModifier
    const unitPrice  = basePrice + sizeMod + qualityMod + typeMod + slabMod + cityMod

    return {
      basePrice, sizeMod, qualityMod, typeMod, slabMod, cityMod, quality,
      unitPrice, totalPrice: unitPrice * quantity, quantity,
      completionMinutes: slab.max_completion_minutes,
    }
  }

  const result = breakdown()

  const sizes     = product?.paper_sizes     ?? []
  const qualities = product?.paper_qualities ?? []
  const types     = product?.paper_types     ?? []


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <CalculatorIcon className="h-4 w-4 mr-2" />
        Price Calculator
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Live Price Calculator</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Product */}
          <div className="space-y-1.5">
            <Label className="text-xs">Product</Label>
            <Combobox
              options={products.map(p => ({ value: p.id, label: p.name }))}
              value={productId}
              onValueChange={setProductId}
              placeholder="Select product…"
              searchPlaceholder="Search products…"
            />
          </div>

          {product && (
            <>
              {/* Paper Size */}
              {sizes.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Paper Size</Label>
                  <Combobox
                    options={sizes.map(s => ({ value: s.paper_size_id, label: `${s.name} (${fmt(s.price_modifier)})` }))}
                    value={sizeId}
                    onValueChange={setSizeId}
                    placeholder="Select size…"
                    searchPlaceholder="Search…"
                  />
                </div>
              )}

              {/* Paper Quality */}
              {qualities.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Paper Quality (GSM)</Label>
                  <Combobox
                    options={qualities.map(q => ({ value: q.paper_quality_id, label: `${q.name} (${fmt(q.price_modifier)})` }))}
                    value={qualityId}
                    onValueChange={setQualityId}
                    placeholder="Select quality…"
                    searchPlaceholder="Search…"
                  />
                </div>
              )}

              {/* Paper Type */}
              {types.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Paper Type</Label>
                  <Combobox
                    options={types.map(t => ({ value: t.paper_type_id, label: `${t.name} (${fmt(t.price_modifier)})` }))}
                    value={typeId}
                    onValueChange={setTypeId}
                    placeholder="Select type…"
                    searchPlaceholder="Search…"
                  />
                </div>
              )}

              {/* Quantity */}
              <div className="space-y-1.5">
                <Label className="text-xs">Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="e.g. 250"
                  value={qty}
                  onChange={e => setQty(e.target.value)}
                />
              </div>

              {/* City */}
              <div className="space-y-1.5">
                <Label className="text-xs">City <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Combobox
                  options={cities.map(c => ({ value: c.id, label: `${c.name}, ${c.state}` }))}
                  value={cityId}
                  onValueChange={setCityId}
                  placeholder="No city (global pricing)"
                  searchPlaceholder="Search city…"
                />
              </div>

              {/* Result */}
              {result ? (
                <div className="rounded-lg border bg-muted/30 px-4 py-3 space-y-1.5 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Product base price</span>
                    <span>₹{result.basePrice.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Size modifier</span>
                    <span>{fmt(result.sizeMod)}</span>
                  </div>
                  {result.quality && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Quality modifier</span>
                      <span>{fmt(result.qualityMod)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-muted-foreground">
                    <span>Type modifier</span>
                    <span>{fmt(result.typeMod)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Quantity slab modifier</span>
                    <span>{fmt(result.slabMod)}</span>
                  </div>
                  {cityId && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>City modifier {loadingCity && <span className="text-xs">(loading…)</span>}</span>
                      <span>{fmt(result.cityMod)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold pt-1.5 border-t text-base">
                    <span>Unit price</span>
                    <span>₹{result.unitPrice.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Total ({result.quantity.toLocaleString('en-IN')} units)</span>
                    <span>₹{result.totalPrice.toLocaleString('en-IN')}</span>
                  </div>
                  {result.completionMinutes != null && (
                    <p className="text-xs text-muted-foreground pt-1 border-t">
                      Est. completion: up to {result.completionMinutes} min
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {sizes.length > 0 && !sizeId ? 'Select a paper size.' :
                   types.length > 0 && !typeId ? 'Select a paper type.' :
                   !qty || Number(qty) <= 0 ? 'Enter a quantity.' :
                   'No slab configured for this quantity.'}
                </p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
