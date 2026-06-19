'use client'

import { useEffect, useState } from 'react'
import { FileText, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

interface CmsPage {
  id: string
  title: string
  slug: string
  is_active: boolean
  sort_order: number
  section_count: number
}

export default function WebsitePagesPage() {
  const [pages, setPages] = useState<CmsPage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<{ items: CmsPage[] }>('/admin/website/pages')
      .then(r => setPages(r.items ?? []))
      .catch(err => toast.error(err.message ?? 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Website CMS — Pages</h1>
        <p className="text-sm text-muted-foreground">Select a page to edit its sections and content.</p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-muted-foreground">Loading...</div>
      ) : pages.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          No pages found. Run the seed script to create default pages.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map(page => (
            <Link
              key={page.id}
              href={`/website/${page.slug}`}
              className="group flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50 hover:border-primary/30"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{page.title}</p>
                  {!page.is_active && <Badge variant="outline" className="text-[10px]">Hidden</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">/{page.slug} &middot; {page.section_count} section{page.section_count !== 1 ? 's' : ''}</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
