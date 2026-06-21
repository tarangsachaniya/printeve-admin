'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'

interface AuditLog {
  id: string
  actor_id: string
  entity_type: string
  action: string
  timestamp: string
  metadata: unknown
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<{ items: AuditLog[] }>('/admin/website/audit-logs?limit=100')
      .then(r => setLogs(r.items ?? []))
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-6 py-20 text-center text-muted-foreground">Loading...</div>

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">Recent CMS changes tracked for accountability.</p>
      </div>

      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10 text-center">No audit logs yet.</p>
      ) : (
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log.id} className="flex items-center gap-3 rounded-md border px-4 py-3 text-sm">
              <Badge variant="outline" className="text-[10px] shrink-0">{log.action}</Badge>
              <span className="text-muted-foreground">{log.entity_type.replace('cms_', '')}</span>
              <span className="flex-1" />
              <span className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
