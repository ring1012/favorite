import { headers } from 'next/headers'

export interface SessionUser {
  username: string
  payload?: Record<string, unknown>
}

/**
 * Helper to extract and decode session info from the `x-n-auth` request header
 * (the JWT issued at login and stored client-side in localStorage).
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const headersList = await headers()
    const token = headersList.get('x-n-auth')
    if (!token) return null

    const parts = token.split('.')
    if (parts.length === 3) {
      const base64Url = parts[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = Buffer.from(base64, 'base64').toString('utf-8')
      const payload = JSON.parse(jsonPayload) as Record<string, unknown>
      if (typeof payload?.sub === 'string') {
        return { username: payload.sub, payload }
      }
    }
  } catch (error) {
    console.error('[getSessionUser] Failed to parse session token:', error)
  }
  return null
}
