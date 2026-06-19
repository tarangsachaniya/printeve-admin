'use client'

import { useEffect, useState } from 'react'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

interface NavItem { id: string; group_key: string; label: string; href: string; is_active: boolean; sort_order: number }
interface FooterGroup { id: string; title: string; sort_order: number; links: FooterLink[] }
interface FooterLink { id: string; label: string; href: string; is_active: boolean; sort_order: number }

export default function NavigationPage() {
  const [navItems, setNavItems] = useState<Record<string, NavItem[]>>({})
  const [footerGroups, setFooterGroups] = useState<FooterGroup[]>([])
  const [loading, setLoading] = useState(true)

  const [newNavLabel, setNewNavLabel] = useState('')
  const [newNavHref, setNewNavHref] = useState('')
  const [newNavGroup, setNewNavGroup] = useState('main')

  const [newGroupTitle, setNewGroupTitle] = useState('')
  const [addingLink, setAddingLink] = useState<{ groupId: string; label: string; href: string } | null>(null)

  function load() {
    setLoading(true)
    Promise.all([
      api.get<{ items: Record<string, NavItem[]> }>('/admin/website/navigation'),
      api.get<{ items: FooterGroup[] }>('/admin/website/footer'),
    ])
      .then(([nav, footer]) => {
        setNavItems(nav.items ?? {})
        setFooterGroups(footer.items ?? [])
      })
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function addNavItem() {
    if (!newNavLabel.trim() || !newNavHref.trim()) return
    try {
      await api.post('/admin/website/navigation', { group_key: newNavGroup, label: newNavLabel.trim(), href: newNavHref.trim() })
      setNewNavLabel(''); setNewNavHref('')
      load()
      toast.success('Nav item added')
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed') }
  }

  async function removeNavItem(id: string) {
    try { await api.delete(`/admin/website/navigation/${id}`); load() }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Failed') }
  }

  async function addFooterGroup() {
    if (!newGroupTitle.trim()) return
    try {
      await api.post('/admin/website/footer/groups', { title: newGroupTitle.trim(), sort_order: footerGroups.length })
      setNewGroupTitle('')
      load()
      toast.success('Group added')
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed') }
  }

  async function removeFooterGroup(id: string) {
    try { await api.delete(`/admin/website/footer/groups/${id}`); load() }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Failed') }
  }

  async function addFooterLink(groupId: string, label: string, href: string) {
    try {
      await api.post(`/admin/website/footer/groups/${groupId}/links`, { label, href })
      setAddingLink(null)
      load()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed') }
  }

  async function removeFooterLink(id: string) {
    try { await api.delete(`/admin/website/footer/links/${id}`); load() }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Failed') }
  }

  if (loading) return <div className="p-6 py-20 text-center text-muted-foreground">Loading...</div>

  return (
    <div className="p-6 space-y-10 max-w-3xl">
      {/* ── Navbar ── */}
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Navigation</h1>
          <p className="text-sm text-muted-foreground">Manage navbar and footer links.</p>
        </div>

        {['main', 'topbar'].map(group => (
          <div key={group}>
            <h3 className="text-sm font-semibold mb-3 capitalize">{group} Navigation</h3>
            <div className="space-y-2">
              {(navItems[group] ?? []).map(item => (
                <div key={item.id} className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
                  <span className="font-medium flex-1">{item.label}</span>
                  <span className="text-muted-foreground text-xs">{item.href}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeNavItem(item.id)}>
                    <Trash2Icon className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold mb-3">Add Navigation Item</h3>
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Group</Label>
              <select value={newNavGroup} onChange={e => setNewNavGroup(e.target.value)} className="h-9 rounded-md border px-2 text-sm bg-background">
                <option value="main">Main</option>
                <option value="topbar">Top Bar</option>
              </select>
            </div>
            <div className="space-y-1 flex-1">
              <Label className="text-xs">Label</Label>
              <Input value={newNavLabel} onChange={e => setNewNavLabel(e.target.value)} placeholder="About" />
            </div>
            <div className="space-y-1 flex-1">
              <Label className="text-xs">URL</Label>
              <Input value={newNavHref} onChange={e => setNewNavHref(e.target.value)} placeholder="/about" />
            </div>
            <Button size="sm" onClick={addNavItem} disabled={!newNavLabel.trim() || !newNavHref.trim()}>
              <PlusIcon className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold">Footer Groups</h2>

        {footerGroups.map(group => (
          <Card key={group.id}>
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-medium text-sm">{group.title}</h3>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setAddingLink({ groupId: group.id, label: '', href: '' })}>
                  <PlusIcon className="h-3.5 w-3.5 mr-1" /> Link
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeFooterGroup(group.id)}>
                  <Trash2Icon className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
            <CardContent className="p-2">
              {group.links.map(link => (
                <div key={link.id} className="flex items-center gap-2 px-2 py-1.5 text-sm">
                  <span className="flex-1">{link.label}</span>
                  <span className="text-xs text-muted-foreground">{link.href}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFooterLink(link.id)}>
                    <Trash2Icon className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
              {addingLink?.groupId === group.id && (
                <div className="flex items-end gap-2 px-2 py-2 border-t mt-2">
                  <Input placeholder="Label" value={addingLink.label} onChange={e => setAddingLink({ ...addingLink, label: e.target.value })} className="flex-1" />
                  <Input placeholder="/path" value={addingLink.href} onChange={e => setAddingLink({ ...addingLink, href: e.target.value })} className="flex-1" />
                  <Button size="sm" onClick={() => addFooterLink(addingLink.groupId, addingLink.label, addingLink.href)} disabled={!addingLink.label || !addingLink.href}>Add</Button>
                  <Button size="sm" variant="ghost" onClick={() => setAddingLink(null)}>Cancel</Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">New Footer Group</Label>
            <Input value={newGroupTitle} onChange={e => setNewGroupTitle(e.target.value)} placeholder="e.g. Resources" />
          </div>
          <Button size="sm" onClick={addFooterGroup} disabled={!newGroupTitle.trim()}>
            <PlusIcon className="h-4 w-4 mr-1" /> Add Group
          </Button>
        </div>
      </div>
    </div>
  )
}
