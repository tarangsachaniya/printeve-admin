'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Ruler, Layers, FileText, ChevronRightIcon } from 'lucide-react'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Count { items: unknown[] }

function DashCard({
  href, icon: Icon, title, description, count,
}: {
  href: string
  icon: React.ElementType
  title: string
  description: string
  count: number | null
}) {
  return (
    <Link href={href}>
      <Card className="hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer h-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-primary/10 p-2">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">{description}</p>
          <p className="text-2xl font-bold">
            {count ?? '—'}
            <span className="text-sm font-normal text-muted-foreground ml-1">entries</span>
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}

export default function PaperDashboard() {
  const [sizesCount,     setSizesCount]     = useState<number | null>(null)
  const [qualitiesCount, setQualitiesCount] = useState<number | null>(null)
  const [typesCount,     setTypesCount]     = useState<number | null>(null)

  useEffect(() => {
    api.get<Count>('/admin/paper/sizes').then(r => setSizesCount(r.items?.length ?? 0)).catch(() => {})
    api.get<Count>('/admin/paper/qualities').then(r => setQualitiesCount(r.items?.length ?? 0)).catch(() => {})
    api.get<Count>('/admin/paper/types').then(r => setTypesCount(r.items?.length ?? 0)).catch(() => {})
  }, [])

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Paper Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage master data for paper sizes, GSM, and types used in products.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <DashCard
          href="/paper/sizes"
          icon={Ruler}
          title="Paper Sizes"
          description="Standard and custom dimensions available for products."
          count={sizesCount}
        />
        <DashCard
          href="/paper/qualities"
          icon={Layers}
          title="Paper GSM"
          description="Paper weight (GSM) options with optional labels."
          count={qualitiesCount}
        />
        <DashCard
          href="/paper/types"
          icon={FileText}
          title="Paper Types"
          description="Finish types such as Matte, Glossy, UV, Silk."
          count={typesCount}
        />
      </div>
    </div>
  )
}
