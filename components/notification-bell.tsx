'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BellIcon } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  title: string
  body: string
  read: boolean
  created_at: string
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(0)
  const [items, setItems] = useState<Notification[]>([])

  function load() {
    api.get<{ count: number }>('/admin/notifications/unread-count')
      .then(r => setCount(r.count))
      .catch(() => {})
    if (open) {
      api.get<{ items: Notification[] }>('/admin/notifications')
        .then(r => setItems(r.items ?? []))
        .catch(() => {})
    }
  }

  useEffect(() => { load() }, [open])

  async function markRead(id: string) {
    try {
      await api.patch(`/admin/notifications/${id}/read`, {})
      load()
    } catch { /* ignore */ }
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen(v => !v)}
        aria-label="Notifications"
      >
        <BellIcon className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-lg border bg-popover shadow-lg">
            <div className="flex items-center justify-between border-b px-4 py-2.5">
              <span className="text-sm font-semibold">Notifications</span>
              <Link href="/product-requests" className="text-xs text-primary hover:underline" onClick={() => setOpen(false)}>
                View product requests
              </Link>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y">
              {items.length === 0 ? (
                <p className="px-4 py-6 text-sm text-center text-muted-foreground">No notifications</p>
              ) : (
                items.map(n => (
                  <button
                    key={n.id}
                    type="button"
                    className={cn(
                      'w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors',
                      !n.read && 'bg-primary/5',
                    )}
                    onClick={() => { if (!n.read) markRead(n.id); setOpen(false) }}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      {!n.read && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                      <p className={cn('text-sm font-medium leading-snug truncate', n.read && 'pl-4')}>{n.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 pl-4">{n.body}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 pl-4">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
