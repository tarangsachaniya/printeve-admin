'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Users, ShoppingBag, Printer, CreditCard,
  Package, BarChart2, ShieldCheck, LogOut, Settings, Layers, Inbox, RefreshCcw, Tag, MapPin, Truck,
  ChevronDown, MonitorPlay, LayoutGrid, Globe, FileText, Navigation, Settings2, ScrollText, TicketPercent, Radio,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { logout, getCurrentUser, type AdminUser } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { invalidatePaperCache } from '@/lib/paper-cache'
import { toast } from 'sonner'

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badgeKey?: 'productRequests' | 'priceRequests'
  superAdminOnly?: boolean
}

const topNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
]

const customerNavItems: NavItem[] = [
  { href: '/users',    label: 'Users',    icon: Users },
  { href: '/printers', label: 'Printers', icon: Printer },
  { href: '/drivers',  label: 'Drivers',  icon: Truck },
  { href: '/admins',   label: 'Admins',   icon: ShieldCheck, superAdminOnly: true },
]

const productNavItems: NavItem[] = [
  { href: '/categories', label: 'Categories', icon: LayoutGrid },
  { href: '/products',   label: 'Products',   icon: Package },
  { href: '/field-definitions', label: 'Field Definitions', icon: Layers },
  { href: '/product-requests', label: 'Product requests', icon: Inbox, badgeKey: 'productRequests' },
  { href: '/product-price-requests', label: 'Price requests', icon: Tag, badgeKey: 'priceRequests' },
  { href: '/cities', label: 'Cities', icon: MapPin },
]

const otherNavItems: NavItem[] = [
  { href: '/orders',      label: 'Orders',      icon: ShoppingBag },
  { href: '/payments',    label: 'Payments',    icon: CreditCard },
  { href: '/promo-codes', label: 'Promo Codes', icon: TicketPercent },
  { href: '/reports',     label: 'Reports',     icon: BarChart2 },
]

const settingsNavItems: NavItem[] = [
  { href: '/settings',  label: 'Content Settings', icon: Settings },
  { href: '/order-assignment', label: 'Order Assignment', icon: Radio, superAdminOnly: true },
]

const cmsNavItems: NavItem[] = [
  { href: '/website',                         label: 'Pages',                icon: FileText,   superAdminOnly: true },
  { href: '/settings/homepage-navigation',    label: 'Homepage & Navigation', icon: MonitorPlay, superAdminOnly: true },
  { href: '/website/navigation',              label: 'Navbar & Footer',      icon: Navigation, superAdminOnly: true },
  { href: '/website/settings',                label: 'Site Settings',        icon: Settings2,  superAdminOnly: true },
  { href: '/website/logs',                    label: 'Audit Logs',           icon: ScrollText, superAdminOnly: true },
]

function NavLink({
  href, label, icon: Icon, badge, active,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
  active: boolean
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {!!badge && badge > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-white">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </Link>
  )
}

function NavGroup({
  label, items, pathname, badges, defaultOpen = true,
}: {
  label: string
  items: NavItem[]
  pathname: string
  badges: Record<string, number>
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  if (items.length === 0) return null

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
      >
        {label}
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', !open && '-rotate-90')} />
      </button>
      {open && (
        <div className="space-y-1">
          {items.map(({ href, label: itemLabel, icon, badgeKey }) => (
            <NavLink
              key={href}
              href={href}
              label={itemLabel}
              icon={icon}
              badge={badgeKey ? badges[badgeKey] : undefined}
              active={pathname === href}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function AppSidebar() {
  const pathname = usePathname()
  const [user, setUser] = useState<AdminUser | null>(null)
  const [pendingRequests, setPendingRequests] = useState(0)
  const [pendingPriceRequests, setPendingPriceRequests] = useState(0)
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    setUser(getCurrentUser())
  }, [])

  useEffect(() => {
    import('@/lib/api').then(({ api }) => {
      api.get<{ count: number }>('/admin/product-requests/pending-count')
        .then(r => setPendingRequests(r.count))
        .catch(() => {})
      api.get<{ count: number }>('/admin/product-price-requests/pending-count')
        .then(r => setPendingPriceRequests(r.count))
        .catch(() => {})
    })
  }, [])

  const isSuperAdmin = user?.role === 'super_admin'

  async function handleClearCache() {
    setClearing(true)
    try {
      await api.post('/admin/cache/clear', {})
      invalidatePaperCache()
      toast.success('Cache cleared')
    } catch {
      invalidatePaperCache()
      toast.success('Cache cleared')
    } finally {
      setClearing(false)
    }
  }

  return (
    <aside className="flex flex-col w-60 shrink-0 border-r bg-sidebar h-screen sticky top-0">
      <div className="flex items-center h-16 px-6 border-b">
        <span className="font-bold text-lg tracking-tight">PrintEve</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-3 no-scrollbar">
        <div className="space-y-1">
          {topNavItems.map(({ href, label, icon }) => (
            <NavLink key={href} href={href} label={label} icon={icon} active={pathname === href} />
          ))}
        </div>

        <NavGroup
          label="Customers"
          items={customerNavItems.filter(item => !item.superAdminOnly || isSuperAdmin)}
          pathname={pathname}
          badges={{ productRequests: pendingRequests, priceRequests: pendingPriceRequests }}
        />

        <NavGroup
          label="Products"
          items={productNavItems}
          pathname={pathname}
          badges={{ productRequests: pendingRequests, priceRequests: pendingPriceRequests }}
        />

        <div className="space-y-1">
          {otherNavItems.map(({ href, label, icon }) => (
            <NavLink key={href} href={href} label={label} icon={icon} active={pathname === href} />
          ))}
        </div>

        <NavGroup
          label="Settings"
          items={settingsNavItems.filter(item => !item.superAdminOnly || isSuperAdmin)}
          pathname={pathname}
          badges={{}}
          defaultOpen={false}
        />

        {isSuperAdmin && (
          <NavGroup
            label="Website"
            items={cmsNavItems}
            pathname={pathname}
            badges={{}}
            defaultOpen={false}
          />
        )}

        <button
          type="button"
          onClick={handleClearCache}
          disabled={clearing}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          <RefreshCcw className={cn('h-4 w-4 shrink-0', clearing && 'animate-spin')} />
          {clearing ? 'Clearing…' : 'Clear Cache'}
        </button>

      </nav>

      <div className="px-3 py-4 border-t">
        <div className="px-3 py-2 text-xs text-muted-foreground mb-2">
          {user?.full_name && <p className="text-sm font-medium text-foreground">{user.full_name}</p>}
          {user?.email && <p className="truncate">{user.email}</p>}
          <p>{user?.role?.replace('_', ' ').toUpperCase()}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  )
}
