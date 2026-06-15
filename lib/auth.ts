export interface AdminUser {
  sub: string
  role: 'admin' | 'super_admin'
  email?: string
  full_name?: string
}

function parseJwt(token: string): AdminUser | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return { sub: payload.sub, role: payload.role, email: payload.email, full_name: payload.full_name }
  } catch {
    return null
  }
}

export function getStoredToken(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)admin_token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

export function getCurrentUser(): AdminUser | null {
  const token = getStoredToken()
  if (!token) return null
  return parseJwt(token)
}

export async function login(email: string, password: string): Promise<void> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'}/admin/auth/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }
  )
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Login failed')

  const { accessToken } = json as { accessToken: string; refreshToken: string }
  // Store in a JS-readable cookie (middleware will also check this)
  document.cookie = `admin_token=${encodeURIComponent(accessToken)}; path=/; SameSite=Lax; Max-Age=604800`
}

export function logout(): void {
  document.cookie = 'admin_token=; Max-Age=0; path=/'
  window.location.href = '/login'
}
