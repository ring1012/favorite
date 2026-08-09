const SIX_MONTHS_IN_SECONDS = 60 * 60 * 24 * 183

export const emptyNavigation = () => ({
  version: 1,
  menus: [],
  sites: [],
})

const adminNavigation = () => ({
  version: 1,
  menus: [
    { id: 'productivity', name: 'Productivity', parentId: null },
    { id: 'developer', name: 'Developer', parentId: null },
    { id: 'design', name: 'Design', parentId: null },
    { id: 'notes', name: 'Notes', parentId: 'productivity' },
  ],
  sites: [
    { id: 'notion', menuId: 'notes', name: 'Notion', description: 'Connected workspace for notes, docs, and projects.', url: 'https://www.notion.so', iconUrl: 'https://www.notion.so/favicon.ico' },
    { id: 'github', menuId: 'developer', name: 'GitHub', description: 'Build, collaborate, and ship software.', url: 'https://github.com', iconUrl: 'https://github.com/favicon.ico' },
    { id: 'figma', menuId: 'design', name: 'Figma', description: 'The collaborative interface design tool.', url: 'https://www.figma.com', iconUrl: 'https://www.figma.com/favicon.ico' },
  ],
})

const dataKey = (username) => `navigation:data:${username}`
const userKey = (username) => `navigation:user:${username}`
const sessionKey = (token) => `navigation:session:${token}`

export function json(data, options = {}) {
  return new Response(JSON.stringify(data), {
    status: options.status || 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(options.headers || {}),
    },
  })
}

export function parseCookies(request) {
  return Object.fromEntries((request.headers.get('cookie') || '').split(';').map((part) => {
    const [key, ...value] = part.trim().split('=')
    return key ? [key, decodeURIComponent(value.join('='))] : []
  }).filter((entry) => entry.length))
}

export async function loadNavigation(username) {
  const stored = await fkv.get(dataKey(username))
  if (stored) return typeof stored === 'string' ? JSON.parse(stored) : stored

  const navigation = username === 'admin' ? adminNavigation() : emptyNavigation()
  await saveNavigation(username, navigation)
  return navigation
}

export async function saveNavigation(username, navigation) {
  await fkv.put(dataKey(username), JSON.stringify(navigation))
}

export function id(prefix) {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return `${prefix}_${[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`
}

export async function sha256(value) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function currentUser(request) {
  const token = parseCookies(request).navigation_session
  if (!token) return null
  const stored = await fkv.get(sessionKey(token))
  if (!stored) return null
  const session = typeof stored === 'string' ? JSON.parse(stored) : stored
  if (!session.expiresAt || Date.now() > session.expiresAt) {
    await fkv.delete(sessionKey(token))
    return null
  }
  return session.username
}

export async function createSession(username) {
  const token = id('session')
  await fkv.put(sessionKey(token), JSON.stringify({
    username,
    expiresAt: Date.now() + SIX_MONTHS_IN_SECONDS * 1000,
  }))
  return token
}

export function sessionCookie(token) {
  // Deliberately works with the local HTTP development proxy as well as HTTPS production.
  return `navigation_session=${encodeURIComponent(token)}; Path=/; Max-Age=${SIX_MONTHS_IN_SECONDS}; HttpOnly; SameSite=Lax`
}

export const expiredSessionCookie = 'navigation_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax'

export async function getUser(username) {
  const stored = await fkv.get(userKey(username))
  return stored ? String(stored).trim().toLowerCase() : null
}

export async function createUser(username, password) {
  await fkv.put(userKey(username), await sha256(password))
  await saveNavigation(username, emptyNavigation())
}

export function requireText(value, label, maxLength = 120) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text || text.length > maxLength) throw new Error(`${label} is required and must be at most ${maxLength} characters.`)
  return text
}

export async function resolveIcon(url) {
  const target = new URL(url)
  if (!['https:', 'http:'].includes(target.protocol)) throw new Error('Website URL must use http or https.')

  try {
    const response = await fetch(target.toString(), { redirect: 'follow' })
    const html = await response.text()
    const links = html.match(/<link\\b[^>]*>/gi) || []
    const iconLink = links.find((link) => /\\brel=["'][^"']*\\b(icon|shortcut icon|apple-touch-icon)[^"']*["']/i.test(link))
    const href = iconLink && iconLink.match(/\\bhref=["']([^"']+)["']/i)?.[1]
    return href ? new URL(href, target).toString() : new URL('/favicon.ico', target).toString()
  } catch {
    return new URL('/favicon.ico', target).toString()
  }
}

export function menuDepth(menu, menus) {
  return menu.parentId ? 2 : 1
}
