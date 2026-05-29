import { useEffect, useMemo, useState } from 'react'

const PAGE_SIZE = 25

export function useDataTable<T extends object>(
  data: T[],
  searchKeys: (keyof T)[],
) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [search])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return data
    return data.filter(item =>
      searchKeys.some(key => {
        const val = (item as Record<string, unknown>)[key as string]
        return val != null && String(val).toLowerCase().includes(q)
      }),
    )
  // searchKeys identity is stable (literal array at call site); safe to omit
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, search])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return {
    search,
    setSearch,
    page: safePage,
    setPage,
    rows,
    total: filtered.length,
    pageCount,
    pageSize: PAGE_SIZE,
  }
}
