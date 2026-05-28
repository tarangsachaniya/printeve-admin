'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { getCurrentUser } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'

interface Role {
  id: string
  name: string
  role_permissions?: { permission_id: string; permissions?: { id: string; key: string; description: string } }[]
}

interface Permission {
  id: string
  key: string
  description: string
}

export default function RolesPage() {
  const user = getCurrentUser()
  const isSuperAdmin = user?.role === 'super_admin'

  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [checkedPerms, setCheckedPerms] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // New role dialog
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')

  // New permission dialog
  const [permDialogOpen, setPermDialogOpen] = useState(false)
  const [newPermKey, setNewPermKey] = useState('')
  const [newPermDesc, setNewPermDesc] = useState('')

  function load() {
    setLoading(true)
    Promise.all([
      api.get<{ data: Role[] }>('/admin/roles'),
      api.get<{ data: Permission[] }>('/admin/roles/permissions'),
    ])
      .then(([r, p]) => {
        setRoles(r.data ?? [])
        setPermissions(p.data ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function selectRole(role: Role) {
    setSelectedRole(role)
    const assigned = new Set(
      (role.role_permissions ?? []).map((rp) => rp.permission_id)
    )
    setCheckedPerms(assigned)
  }

  function togglePerm(id: string) {
    setCheckedPerms((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function savePermissions() {
    if (!selectedRole) return
    setSaving(true)
    try {
      await api.post(`/admin/roles/${selectedRole.id}/permissions`, {
        permissionIds: Array.from(checkedPerms),
      })
      load()
    } finally {
      setSaving(false)
    }
  }

  async function createRole() {
    if (!newRoleName.trim()) return
    await api.post('/admin/roles', { name: newRoleName.trim() })
    setRoleDialogOpen(false)
    setNewRoleName('')
    load()
  }

  async function deleteRole(id: string) {
    await api.delete(`/admin/roles/${id}`)
    if (selectedRole?.id === id) setSelectedRole(null)
    load()
  }

  async function createPermission() {
    if (!newPermKey.trim()) return
    await api.post('/admin/roles/permissions', { key: newPermKey.trim(), description: newPermDesc.trim() })
    setPermDialogOpen(false)
    setNewPermKey('')
    setNewPermDesc('')
    load()
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Roles & Permissions</h1>
        {isSuperAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPermDialogOpen(true)}>
              + Permission
            </Button>
            <Button size="sm" onClick={() => setRoleDialogOpen(true)}>
              + Role
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid grid-cols-12 gap-4">
          {/* Roles list */}
          <div className="col-span-4 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Roles</p>
            {roles.map((role) => (
              <div
                key={role.id}
                className={`flex items-center justify-between rounded-md border px-3 py-2 cursor-pointer transition-colors ${
                  selectedRole?.id === role.id ? 'border-primary bg-primary/5' : 'bg-card hover:bg-muted'
                }`}
                onClick={() => selectRole(role)}
              >
                <span className="text-sm font-medium">{role.name}</span>
                {isSuperAdmin && !['admin', 'super_admin', 'customer', 'printer', 'rider'].includes(role.name) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); deleteRole(role.id) }}
                  >
                    ×
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Permissions panel */}
          <div className="col-span-8">
            {selectedRole ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Permissions for <Badge variant="outline">{selectedRole.name}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-1">
                    {permissions.map((perm) => (
                      <label
                        key={perm.id}
                        className={`flex items-start gap-2 rounded-md border px-3 py-2 cursor-pointer transition-colors ${
                          checkedPerms.has(perm.id) ? 'border-primary bg-primary/5' : 'bg-muted/20 hover:bg-muted'
                        } ${!isSuperAdmin ? 'pointer-events-none opacity-70' : ''}`}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 shrink-0"
                          checked={checkedPerms.has(perm.id)}
                          onChange={() => isSuperAdmin && togglePerm(perm.id)}
                          disabled={!isSuperAdmin}
                        />
                        <div>
                          <p className="text-sm font-mono font-medium">{perm.key}</p>
                          {perm.description && (
                            <p className="text-xs text-muted-foreground">{perm.description}</p>
                          )}
                        </div>
                      </label>
                    ))}
                    {permissions.length === 0 && (
                      <p className="col-span-2 text-sm text-muted-foreground">No permissions defined yet.</p>
                    )}
                  </div>

                  {isSuperAdmin && (
                    <>
                      <Separator />
                      <div className="flex justify-end">
                        <Button onClick={savePermissions} disabled={saving}>
                          {saving ? 'Saving…' : 'Save Permissions'}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="flex items-center justify-center h-40 rounded-md border border-dashed text-muted-foreground text-sm">
                Select a role to manage its permissions
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Role</DialogTitle></DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label>Role Name</Label>
            <Input
              placeholder="e.g. moderator"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createRole()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>Cancel</Button>
            <Button onClick={createRole}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Permission Dialog */}
      <Dialog open={permDialogOpen} onOpenChange={setPermDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Permission</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Key</Label>
              <Input
                placeholder="e.g. orders.refund"
                value={newPermKey}
                onChange={(e) => setNewPermKey(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                placeholder="Short description"
                value={newPermDesc}
                onChange={(e) => setNewPermDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermDialogOpen(false)}>Cancel</Button>
            <Button onClick={createPermission}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
