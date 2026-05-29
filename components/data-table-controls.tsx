'use client'

import { SearchIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface DataTableSearchProps {
  value: string
  onChange: (v: string) => void
  total: number
  filtered: number
  placeholder?: string
}

export function DataTableSearch({
  value,
  onChange,
  total,
  filtered,
  placeholder = 'Search…',
}: DataTableSearchProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1 max-w-xs">
        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          className="pl-8"
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      </div>
      {value && (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {filtered} of {total}
        </span>
      )}
    </div>
  )
}

interface DataTablePaginationProps {
  page: number
  pageCount: number
  total: number
  pageSize: number
  onPageChange: (p: number) => void
}

export function DataTablePagination({
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
}: DataTablePaginationProps) {
  const from = Math.min((page - 1) * pageSize + 1, total)
  const to = Math.min(page * pageSize, total)

  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span>{total === 0 ? 'No results' : `${from}–${to} of ${total}`}</span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(1)}>«</Button>
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Prev</Button>
        <span className="px-2 text-sm font-medium">{page} / {pageCount}</span>
        <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>Next</Button>
        <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => onPageChange(pageCount)}>»</Button>
      </div>
    </div>
  )
}
