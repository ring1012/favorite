import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

export interface SessionUser {
  username: string
  payload?: any
}

/**
 * Common helper function to extract and decode session info from cookies.
 * Extracts username (sub) from `navigation_session` cookie.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('navigation_session')?.value
    if (!token) return null

    const parts = token.split('.')
    if (parts.length === 3) {
      const base64Url = parts[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = Buffer.from(base64, 'base64').toString('utf-8')
      const payload = JSON.parse(jsonPayload)
      if (payload?.sub) {
        return { username: payload.sub, payload }
      }
    }
  } catch (error) {
    console.error('[getSessionUser] Failed to parse session token:', error)
  }
  return null
}
