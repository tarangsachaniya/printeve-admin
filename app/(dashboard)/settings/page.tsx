'use client'

import { useEffect, useCallback, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { RichTextEditor, useRichTextEditor } from '@/components/rich-text-editor'

const CONTENT_KEYS = {
  printer_legal_terms: 'Printer Legal Terms',
  driver_legal_terms: 'Driver Legal Terms',
} as const

type ContentKey = keyof typeof CONTENT_KEYS

export default function SettingsPage() {
  const [contentKey, setContentKey] = useState<ContentKey>('printer_legal_terms')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const editor = useRichTextEditor('', '300px')

  const loadContent = useCallback(async () => {
    if (!editor) return
    setLoading(true)
    setSaved(false)
    try {
      const res = await api.get<{ key: string; value: string | null }>(`/admin/settings/${contentKey}`)
      editor.commands.setContent(res.value ?? '')
    } catch {
      editor.commands.setContent('')
    } finally {
      setLoading(false)
    }
  }, [editor, contentKey])

  useEffect(() => {
    if (editor) loadContent()
  }, [editor, loadContent])

  async function handleSave() {
    if (!editor) return
    setSaving(true)
    try {
      await api.post('/admin/settings', { key: contentKey, value: editor.getHTML() })
      setSaved(true)
      toast.success('Settings saved')
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Content Settings</h1>
        <div className="flex items-center gap-2">
          <Select value={contentKey} onValueChange={(v) => setContentKey(v as ContentKey)}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CONTENT_KEYS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border bg-card px-4 py-8 text-center text-muted-foreground text-sm">Loading…</div>
      ) : (
        <RichTextEditor editor={editor} minHeight="300px" />
      )}

      <p className="text-xs text-muted-foreground">
        Editing: <strong>{CONTENT_KEYS[contentKey]}</strong> — stored as HTML
      </p>
    </div>
  )
}
