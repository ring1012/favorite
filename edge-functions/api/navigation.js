import { currentUser, id, json, loadNavigation, menuDepth, requireText, resolveIcon, saveNavigation } from '../_lib/navigation.js'

function responseFor(user, navigation) {
  return json({ owner: user || 'admin', authenticated: Boolean(user), navigation }, {
    headers: { 'cache-control': user ? 'private, no-store' : 'public, max-age=60, s-maxage=60' },
  })
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url)
  const requested = (url.searchParams.get('username') || '').trim().toLowerCase()
  if (requested) {
    return json({ owner: requested, authenticated: false, navigation: await loadNavigation(requested) }, {
      headers: { 'cache-control': 'public, max-age=60, s-maxage=60' },
    })
  }
  const user = await currentUser(request)
  return responseFor(user, await loadNavigation(user || 'admin'))
}

export async function onRequestPost({ request }) {
  const user = await currentUser(request)
  if (!user) return json({ error: 'Sign in to edit this navigation.' }, { status: 401 })

  try {
    const payload = await request.json()
    const navigation = await loadNavigation(user)
    const result = await mutate(navigation, payload)
    await saveNavigation(user, navigation)
    return json({ owner: user, authenticated: true, navigation, result }, { headers: { 'cache-control': 'no-store' } })
  } catch (error) {
    return json({ error: error.message || 'Unable to save changes.' }, { status: 400 })
  }
}

async function mutate(navigation, payload) {
  const action = payload?.action
  if (action === 'create-menu') {
    const parentId = payload.parentId || null
    if (parentId) {
      const parent = navigation.menus.find((menu) => menu.id === parentId)
      if (!parent || menuDepth(parent, navigation.menus) !== 1) throw new Error('A menu can contain only one child level.')
    }
    const menu = { id: id('menu'), name: requireText(payload.name, 'Menu name', 48), parentId }
    navigation.menus.push(menu)
    return menu
  }

  if (action === 'update-menu') {
    const menu = navigation.menus.find((item) => item.id === payload.id)
    if (!menu) throw new Error('Menu not found.')
    menu.name = requireText(payload.name, 'Menu name', 48)
    return menu
  }

  if (action === 'delete-menu') {
    const menu = navigation.menus.find((item) => item.id === payload.id)
    if (!menu) throw new Error('Menu not found.')
    const removedIds = new Set([menu.id, ...navigation.menus.filter((item) => item.parentId === menu.id).map((item) => item.id)])
    navigation.menus = navigation.menus.filter((item) => !removedIds.has(item.id))
    navigation.sites = navigation.sites.filter((site) => !removedIds.has(site.menuId))
    return { deleted: payload.id }
  }

  if (action === 'create-site' || action === 'update-site') {
    const menu = navigation.menus.find((item) => item.id === payload.menuId)
    if (!menu) throw new Error('Choose an existing menu.')
    const url = new URL(requireText(payload.url, 'Website URL', 2048)).toString()
    if (!['http:', 'https:'].includes(new URL(url).protocol)) throw new Error('Website URL must use http or https.')
    const site = action === 'create-site'
      ? { id: id('site'), menuId: menu.id }
      : navigation.sites.find((item) => item.id === payload.id)
    if (!site) throw new Error('Site not found.')
    const urlChanged = site.url !== url
    site.menuId = menu.id
    site.name = requireText(payload.name, 'Website name', 80)
    site.description = requireText(payload.description, 'Website description', 280)
    site.url = url
    if (action === 'create-site' || urlChanged) site.iconUrl = await resolveIcon(url)
    if (action === 'create-site') navigation.sites.push(site)
    return site
  }

  if (action === 'delete-site') {
    const before = navigation.sites.length
    navigation.sites = navigation.sites.filter((site) => site.id !== payload.id)
    if (before === navigation.sites.length) throw new Error('Site not found.')
    return { deleted: payload.id }
  }

  throw new Error('Unsupported action.')
}
