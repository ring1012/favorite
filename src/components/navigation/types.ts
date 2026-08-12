export const LIKE_MENU_ID = 'like'

export type Menu = { id: string; name: string; parentId: string | null }
export type Site = { id?: string; menuId: string; name: string; description: string; url: string; iconUrl: string }
export type Navigation = { version: number; menus: Menu[]; sites: Site[] }
export type Payload = { owner: string; authenticated: boolean; navigation: Navigation; favorites: string[]; allowRegister?: boolean }

export const AUTH_KEY = 'navigation_session'

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(AUTH_KEY)
  } catch {
    return null
  }
}

export function setAuthToken(token: string): void {
  try {
    window.localStorage.setItem(AUTH_KEY, token)
  } catch {}
}

export function clearAuthToken(): void {
  try {
    window.localStorage.removeItem(AUTH_KEY)
  } catch {}
}

export const emptyNavigation: Navigation = {
  version: 1,
  menus: [{ id: LIKE_MENU_ID, name: '收藏', parentId: null }],
  sites: [],
}

export const SITES_PER_PAGE = 24

export async function api(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers)
  headers.set('content-type', 'application/json')
  const token = getAuthToken()
  if (token) headers.set('x-n-auth', token)
  const response = await fetch(path, { ...init, headers })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || '请求失败。')
  return data
}
