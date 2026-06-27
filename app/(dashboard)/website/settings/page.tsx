'use client'

import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const FIELDS = [
  { key: 'brand_name', label: 'Brand Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'address', label: 'Address', textarea: true },
  { key: 'topbar_message', label: 'Top Bar Message' },
  { key: 'footer_description', label: 'Footer Description', textarea: true },
  { key: 'copyright_text', label: 'Copyright Text (use {year} for dynamic year)' },
  { key: 'social_facebook', label: 'Facebook URL' },
  { key: 'social_instagram', label: 'Instagram URL' },
  { key: 'social_twitter', label: 'Twitter / X URL' },
  { key: 'social_linkedin', label: 'LinkedIn URL' },
  { key: 'empty_cart_title', label: 'Empty Cart — Heading' },
  { key: 'empty_cart_subtitle', label: 'Empty Cart — Message', textarea: true },
  { key: 'empty_orders_title', label: 'Empty Orders — Heading' },
  { key: 'empty_orders_subtitle', label: 'Empty Orders — Message', textarea: true },
]

export default function SiteSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get<{ settings: Record<string, string | null> }>('/admin/website/settings')
      .then(r => {
        const s: Record<string, string> = {}
        for (const [k, v] of Object.entries(r.settings ?? {})) s[k] = v ?? ''
        setSettings(s)
      })
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [])

  function update(key: string, value: string) {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  async function save() {
    setSaving(true)
    try {
      await api.patch('/admin/website/settings', settings)
      toast.success('Settings saved')
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="p-6 py-20 text-center text-muted-foreground">Loading...</div>

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Site Settings</h1>
        <p className="text-sm text-muted-foreground">Global settings used across the website.</p>
      </div>

      {FIELDS.map(f => (
        <div key={f.key} className="space-y-1.5">
          <Label>{f.label}</Label>
          {f.textarea ? (
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={settings[f.key] ?? ''}
              onChange={e => update(f.key, e.target.value)}
            />
          ) : (
            <Input value={settings[f.key] ?? ''} onChange={e => update(f.key, e.target.value)} />
          )}
        </div>
      ))}

      <Button onClick={save} disabled={saving}>
        <Save className="h-4 w-4 mr-1" /> {saving ? 'Saving...' : 'Save Settings'}
      </Button>
    </div>
  )
}
