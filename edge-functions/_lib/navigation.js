import { SignJWT, jwtVerify } from 'jose'

const SIX_MONTHS_IN_SECONDS = 60 * 60 * 24 * 183

export const emptyNavigation = () => ({
  version: 1,
  menus: [],
  sites: [],
})

export const ensureLikeMenu = (navigation) => {
  const otherMenus = (navigation.menus || []).filter((menu) => menu.id !== 'like')
  navigation.menus = [{ id: 'like', name: '收藏', parentId: null }, ...otherMenus]
  return navigation
}

const adminNavigation = () => ({
  version: 1,
  menus: [
    { id: 'productivity', name: '效率工具', parentId: null },
    { id: 'developer', name: '开发者', parentId: null },
    { id: 'design', name: '设计', parentId: null },
    { id: 'notes', name: '笔记', parentId: 'productivity' },
  ],
  sites: [
    { id: 'notion', menuId: 'notes', name: 'Notion', description: '集笔记、文档、项目于一体的协作工作空间。', url: 'https://www.notion.so', iconUrl: 'https://www.notion.so/favicon.ico' },
    { id: 'github', menuId: 'developer', name: 'GitHub', description: '构建、协作和交付软件的平台。', url: 'https://github.com', iconUrl: 'https://github.com/favicon.ico' },
    { id: 'figma', menuId: 'design', name: 'Figma', description: '协作式界面设计工具。', url: 'https://www.figma.com', iconUrl: 'https://www.figma.com/favicon.ico' },
  ],
})

const dataKey = (username) => `navigation:data:${username}`
const userKey = (username) => `navigation:user:${username}`

const jwtSecret = (env) => {
  const secret = env['JWT_SECRET']
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters')
  return new TextEncoder().encode(secret)
}

export function json(data, options = {}) {
  return new Response(JSON.stringify(data), {
    status: options.status || 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(options.headers || {}),
    },
  })
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

const favoritesKey = (username) => `navigation:favorites:${username}`

export async function loadFavorites(username) {
  if (!username) return []
  const stored = await fkv.get(favoritesKey(username))
  return stored ? (typeof stored === 'string' ? JSON.parse(stored) : stored) : []
}

export async function saveFavorites(username, favorites) {
  await fkv.put(favoritesKey(username), JSON.stringify(favorites))
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

export async function currentUser(request, env) {
  // Session token is carried by the `x-n-auth` header (stored client-side in localStorage),
  // not by a cookie. See NavigationApp api() on the frontend for the matching usage.
  const token = (request.headers.get('x-n-auth') || '').trim()
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, jwtSecret(env))
    return payload.sub || null
  } catch {
    return null
  }
}

export async function createSession(username, env) {
  const token = await new SignJWT({ sub: username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + SIX_MONTHS_IN_SECONDS)
    .sign(jwtSecret(env))
  return token
}

export async function getUser(username) {
  const stored = await fkv.get(userKey(username))
  return stored ? String(stored).trim().toLowerCase() : null
}

export async function saveUser(username, passwordHash) {
  await fkv.put(userKey(username), passwordHash)
}



export function requireText(value, label, maxLength = 120) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text || text.length > maxLength) throw new Error(`${label}为必填项，且不能超过${maxLength}个字符。`)
  return text
}

export async function resolveIcon(url) {
  const target = new URL(url)
    if (!['https:', 'http:'].includes(target.protocol)) throw new Error('仅支持 https 和 http 链接。')

  try {
    const response = await fetch(target.toString(), { redirect: 'follow' })
    const html = await response.text()
    const links = html.match(/<link\b[^>]*>/gi) || []
    const iconLink = links.find((link) => /\brel=["'][^"']*\b(icon|shortcut icon|apple-touch-icon)[^"']*["']/i.test(link))
    const href = iconLink && iconLink.match(/\bhref=["']([^"']+)["']/i)?.[1]
    return href ? new URL(href, target).toString() : new URL('/favicon.ico', target).toString()
  } catch {
    return new URL('/favicon.ico', target).toString()
  }
}

export function menuDepth(menu, menus) {
  return menu.parentId ? 2 : 1
}
