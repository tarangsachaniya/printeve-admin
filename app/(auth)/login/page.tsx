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
    <svg viewBox="0 0 360 240" fill="none" className="w-full max-w-xs drop-shadow-xl" aria-hidden="true">
      <rect x="40" y="20" width="280" height="196" rx="14" fill="white" />
      <rect x="40" y="20" width="280" height="30" rx="14" fill="white" />
      <rect x="40" y="36" width="280" height="14" fill="white" />
      <circle cx="58" cy="35" r="4" fill={ink} opacity="0.45" />
      <circle cx="72" cy="35" r="4" fill={ink} opacity="0.3" />
      <circle cx="86" cy="35" r="4" fill={ink} opacity="0.2" />
      <line x1="40" y1="50" x2="320" y2="50" stroke={ink} strokeOpacity="0.1" />

      <rect x="56" y="64" width="54" height="136" rx="8" fill={ink} opacity="0.08" />
      <rect x="66" y="78" width="34" height="8" rx="4" fill={ink} opacity="0.55" />
      <rect x="66" y="98" width="34" height="6" rx="3" fill={ink} opacity="0.28" />
      <rect x="66" y="114" width="34" height="6" rx="3" fill={ink} opacity="0.28" />
      <rect x="66" y="130" width="34" height="6" rx="3" fill={ink} opacity="0.28" />
      <rect x="66" y="146" width="22" height="6" rx="3" fill={ink} opacity="0.28" />

      <rect x="124" y="64" width="78" height="46" rx="8" fill={ink} opacity="0.07" />
      <rect x="136" y="76" width="38" height="6" rx="3" fill={ink} opacity="0.45" />
      <rect x="136" y="88" width="52" height="10" rx="4" fill={ink} opacity="0.7" />

      <rect x="210" y="64" width="78" height="46" rx="8" fill={ink} opacity="0.07" />
      <rect x="222" y="76" width="38" height="6" rx="3" fill={ink} opacity="0.45" />
      <rect x="222" y="88" width="52" height="10" rx="4" fill={ink} opacity="0.7" />

      <rect x="124" y="120" width="164" height="80" rx="8" fill={ink} opacity="0.05" />
      <polyline
        points="140,178 166,162 192,172 218,144 244,158 270,132 282,140"
        fill="none"
        stroke={ink}
        strokeOpacity="0.6"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="282" cy="140" r="5" fill={ink} fillOpacity="0.8" />

      <circle cx="300" cy="30" r="17" fill={ink} />
      <path d="M293 30l4.5 4.5L307 25" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      <ellipse cx="180" cy="228" rx="132" ry="8" fill="black" opacity="0.1" />
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
    <div className="h-screen overflow-hidden flex bg-muted/30">
      {/* Branding panel */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[45%] flex-col justify-between bg-primary text-primary-foreground p-8 xl:p-12">
        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-foreground/15">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">PrintVana Admin</span>
        </div>

        {/* Illustration — constrained so it never pushes layout */}
        <div className="flex justify-center text-primary-foreground/90 shrink-0">
          <DashboardIllustration />
        </div>

        {/* Copy */}
        <div className="space-y-4 shrink-0">
          <h1 className="font-semibold leading-tight text-2xl xl:text-3xl 2xl:text-4xl">
            Manage your printing platform from one place
          </h1>
          <p className="text-primary-foreground/75 text-sm xl:text-base max-w-md">
            Review product requests, manage printers, and keep an eye on
            platform-wide activity — all from a single dashboard.
          </p>
          <ul className="space-y-2.5 text-sm xl:text-base text-primary-foreground/85">
            <li className="flex items-center gap-3">
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              Centralized control over products and pricing
            </li>
            <li className="flex items-center gap-3">
              <Users className="h-4 w-4 shrink-0" />
              Manage printers, roles and permissions
            </li>
            <li className="flex items-center gap-3">
              <BarChart3 className="h-4 w-4 shrink-0" />
              Track requests and platform performance
            </li>
          </ul>
        </div>

        <p className="text-primary-foreground/60 text-xs shrink-0">
          © {new Date().getFullYear()} PrintVana. All rights reserved.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center p-4 sm:p-6 md:p-10">
        <div className="w-full max-w-sm sm:max-w-md">
          {/* Mobile logo */}
          <div className="mb-5 text-center lg:text-left">
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground lg:hidden">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h1 className="font-semibold tracking-tight text-2xl sm:text-3xl">
              Welcome back
            </h1>
            <p className="mt-1 text-muted-foreground text-sm sm:text-base">
              Sign in to your admin account to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@printvana.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 sm:h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 sm:h-11"
              />
            </div>
            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="w-full h-10 sm:h-11"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-5 text-center lg:text-left text-xs sm:text-sm text-muted-foreground">
            Having trouble signing in? Contact your platform administrator.
          </p>
        </div>
      </div>
    </div>
  )
}
