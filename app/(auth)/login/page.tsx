'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, LayoutDashboard, Users, BarChart3 } from 'lucide-react'
import { login } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function DashboardIllustration() {
  const ink = 'var(--primary)'
  return (
    <svg viewBox="0 0 360 280" fill="none" className="w-full max-w-md drop-shadow-xl" aria-hidden="true">
      {/* browser-like card */}
      <rect x="40" y="34" width="280" height="206" rx="14" fill="white" />
      <rect x="40" y="34" width="280" height="30" rx="14" fill="white" />
      <rect x="40" y="50" width="280" height="14" fill="white" />
      <circle cx="58" cy="49" r="4" fill={ink} opacity="0.45" />
      <circle cx="72" cy="49" r="4" fill={ink} opacity="0.3" />
      <circle cx="86" cy="49" r="4" fill={ink} opacity="0.2" />
      <line x1="40" y1="64" x2="320" y2="64" stroke={ink} strokeOpacity="0.1" />

      {/* sidebar */}
      <rect x="56" y="78" width="54" height="146" rx="8" fill={ink} opacity="0.08" />
      <rect x="66" y="92" width="34" height="8" rx="4" fill={ink} opacity="0.55" />
      <rect x="66" y="114" width="34" height="6" rx="3" fill={ink} opacity="0.28" />
      <rect x="66" y="130" width="34" height="6" rx="3" fill={ink} opacity="0.28" />
      <rect x="66" y="146" width="34" height="6" rx="3" fill={ink} opacity="0.28" />
      <rect x="66" y="162" width="22" height="6" rx="3" fill={ink} opacity="0.28" />

      {/* stat cards */}
      <rect x="124" y="78" width="78" height="50" rx="8" fill={ink} opacity="0.07" />
      <rect x="136" y="90" width="38" height="6" rx="3" fill={ink} opacity="0.45" />
      <rect x="136" y="104" width="52" height="10" rx="4" fill={ink} opacity="0.7" />

      <rect x="210" y="78" width="78" height="50" rx="8" fill={ink} opacity="0.07" />
      <rect x="222" y="90" width="38" height="6" rx="3" fill={ink} opacity="0.45" />
      <rect x="222" y="104" width="52" height="10" rx="4" fill={ink} opacity="0.7" />

      {/* chart */}
      <rect x="124" y="138" width="164" height="86" rx="8" fill={ink} opacity="0.05" />
      <polyline
        points="140,198 166,180 192,192 218,160 244,174 270,146 282,156"
        fill="none"
        stroke={ink}
        strokeOpacity="0.6"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="282" cy="156" r="5" fill={ink} fillOpacity="0.8" />

      {/* badge */}
      <circle cx="300" cy="44" r="17" fill={ink} />
      <path d="M293 44l4.5 4.5L307 39" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      <ellipse cx="180" cy="256" rx="132" ry="9" fill="black" opacity="0.12" />
    </svg>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Branding panel — hidden on small screens */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[45%] flex-col justify-between bg-primary text-primary-foreground p-10 xl:p-14 2xl:p-20">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-foreground/15">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <span className="text-lg 2xl:text-xl font-semibold tracking-tight">PrintVana Admin</span>
        </div>

        <div className="flex justify-center text-primary-foreground/90 my-6">
          <DashboardIllustration />
        </div>

        <div className="space-y-6">
          <h1 className="font-semibold leading-tight text-[clamp(1.5rem,2.8vw,3.25rem)]">
            Manage your printing platform from one place
          </h1>
          <p className="text-primary-foreground/75 text-[clamp(0.875rem,1.05vw,1.2rem)] max-w-md">
            Review product requests, manage printers, and keep an eye on
            platform-wide activity — all from a single dashboard.
          </p>
          <ul className="space-y-3 text-[clamp(0.8rem,1vw,1.1rem)] text-primary-foreground/85">
            <li className="flex items-center gap-3">
              <LayoutDashboard className="h-4 w-4 xl:h-5 xl:w-5 shrink-0" />
              Centralized control over products and pricing
            </li>
            <li className="flex items-center gap-3">
              <Users className="h-4 w-4 xl:h-5 xl:w-5 shrink-0" />
              Manage printers, roles and permissions
            </li>
            <li className="flex items-center gap-3">
              <BarChart3 className="h-4 w-4 xl:h-5 xl:w-5 shrink-0" />
              Track requests and platform performance
            </li>
          </ul>
        </div>

        <p className="text-primary-foreground/60 text-xs 2xl:text-sm">
          © {new Date().getFullYear()} PrintVana. All rights reserved.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center p-4 sm:p-6 md:p-10">
        <div className="w-full max-w-sm sm:max-w-md xl:max-w-lg">
          <div className="mb-6 sm:mb-8 xl:mb-10 text-center lg:text-left">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground lg:hidden">
              <ShieldCheck className="h-5.5 w-5.5" />
            </div>
            <h1 className="font-semibold tracking-tight text-[clamp(1.35rem,3.4vw,2.5rem)]">
              Welcome back
            </h1>
            <p className="mt-1.5 text-muted-foreground text-[clamp(0.8rem,1.7vw,1.15rem)]">
              Sign in to your admin account to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 xl:space-y-6">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[clamp(0.8rem,1.4vw,1.05rem)]">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@printvana.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 sm:h-11 xl:h-13 text-[clamp(0.85rem,1.7vw,1.1rem)]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[clamp(0.8rem,1.4vw,1.05rem)]">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 sm:h-11 xl:h-13 text-[clamp(0.85rem,1.7vw,1.1rem)]"
              />
            </div>
            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-[clamp(0.78rem,1.4vw,1rem)] text-destructive">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="w-full h-10 sm:h-11 xl:h-13 text-[clamp(0.85rem,1.7vw,1.1rem)]"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 xl:mt-8 text-center lg:text-left text-[clamp(0.75rem,1.4vw,1rem)] text-muted-foreground">
            Having trouble signing in? Contact your platform administrator.
          </p>
        </div>
      </div>
    </div>
  )
}
