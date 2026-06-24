'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

interface OrderAssignmentConfig {
  radius_km: number
  acceptance_window_minutes: number
  weights: { profit: number; fairness: number; time: number }
  no_loss_min_margin: number
  cold_start_jobs: number
  warm_up_max_jobs_per_week: number
  fairness_week_start: 'monday' | 'sunday'
  signed_url_ttl_minutes: number
}

export default function OrderAssignmentPage() {
  const [config, setConfig] = useState<OrderAssignmentConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get<OrderAssignmentConfig>('/admin/order-assignment/config')
      .then(setConfig)
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load config'))
      .finally(() => setLoading(false))
  }, [])

  function set<K extends keyof OrderAssignmentConfig>(key: K, value: OrderAssignmentConfig[K]) {
    setConfig((prev) => (prev ? { ...prev, [key]: value } : prev))
  }
  function setWeight(key: keyof OrderAssignmentConfig['weights'], value: number) {
    setConfig((prev) => (prev ? { ...prev, weights: { ...prev.weights, [key]: value } } : prev))
  }

  async function save() {
    if (!config) return
    setSaving(true)
    try {
      const updated = await api.put<OrderAssignmentConfig>('/admin/order-assignment/config', config)
      setConfig(updated)
      toast.success('Order assignment settings saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !config) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>
  }

  const weightSum = config.weights.profit + config.weights.fairness + config.weights.time

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Order Assignment</h1>
          <p className="text-sm text-muted-foreground">Tune how orders are broadcast and auto-assigned to printers.</p>
        </div>
        <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Broadcast & Acceptance</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field label="Search radius (km)">
            <Input type="number" min={1} value={config.radius_km}
              onChange={(e) => set('radius_km', Number(e.target.value))} />
          </Field>
          <Field label="Acceptance window (minutes)">
            <Input type="number" min={1} value={config.acceptance_window_minutes}
              onChange={(e) => set('acceptance_window_minutes', Number(e.target.value))} />
          </Field>
          <Field label="Signed file URL TTL (minutes)">
            <Input type="number" min={1} value={config.signed_url_ttl_minutes}
              onChange={(e) => set('signed_url_ttl_minutes', Number(e.target.value))} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Auto-assignment weights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Weights are normalized automatically. Current sum: {weightSum.toFixed(2)}
            {Math.abs(weightSum - 1) > 0.001 && ' (will be rescaled to 1)'}
          </p>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Profit">
              <Input type="number" min={0} step={0.05} value={config.weights.profit}
                onChange={(e) => setWeight('profit', Number(e.target.value))} />
            </Field>
            <Field label="Fairness">
              <Input type="number" min={0} step={0.05} value={config.weights.fairness}
                onChange={(e) => setWeight('fairness', Number(e.target.value))} />
            </Field>
            <Field label="Time">
              <Input type="number" min={0} step={0.05} value={config.weights.time}
                onChange={(e) => setWeight('time', Number(e.target.value))} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Guards & Fairness</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field label="No-loss minimum margin (₹)">
            <Input type="number" step={0.01} value={config.no_loss_min_margin}
              onChange={(e) => set('no_loss_min_margin', Number(e.target.value))} />
          </Field>
          <Field label="Cold-start threshold (lifetime jobs)">
            <Input type="number" min={0} value={config.cold_start_jobs}
              onChange={(e) => set('cold_start_jobs', Number(e.target.value))} />
          </Field>
          <Field label="Warm-up cap (jobs / week)">
            <Input type="number" min={0} value={config.warm_up_max_jobs_per_week}
              onChange={(e) => set('warm_up_max_jobs_per_week', Number(e.target.value))} />
          </Field>
          <Field label="Fairness week starts on">
            <Select value={config.fairness_week_start}
              onValueChange={(v) => set('fairness_week_start', (v as 'monday' | 'sunday') ?? 'monday')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monday">Monday</SelectItem>
                <SelectItem value="sunday">Sunday</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  )
}
