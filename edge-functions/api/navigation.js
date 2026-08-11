import { currentUser, ensureLikeMenu, id, json, loadFavorites, loadNavigation, menuDepth, requireText, resolveIcon, saveFavorites, saveNavigation } from '../_lib/navigation.js'

function responseFor(user, navigation, favorites) {
  return json({ owner: user || 'admin', authenticated: Boolean(user), navigation: ensureLikeMenu(navigation), favorites }, {
    headers: { 'cache-control': 'private, no-store' },
  })
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url)
  const requested = (url.searchParams.get('username') || '').trim().toLowerCase()
  if (requested) {
    const navigation = await loadNavigation(requested)
    const favorites = await loadFavorites(requested)
    return json({ owner: requested, authenticated: false, navigation: ensureLikeMenu(navigation), favorites }, {
      headers: { 'cache-control': 'public, max-age=60, s-maxage=60' },
    })
  }
  const user = await currentUser(request, env)
  return responseFor(user, await loadNavigation(user || 'admin'), await loadFavorites(user))
}

export async function onRequestPost({ request, env }) {
  const user = await currentUser(request, env)
  if (!user) return json({ error: '请先登录再编辑该导航。' }, { status: 401 })

  try {
    const payload = await request.json()
    const navigation = await loadNavigation(user)
    const favorites = await loadFavorites(user)
    const result = await mutate(navigation, favorites, payload)
    await saveNavigation(user, navigation)
    await saveFavorites(user, favorites)

    try {
      const url = new URL(request.url)
      fetch(`${url.origin}/api/revalidate?user=${encodeURIComponent(user)}`, { method: 'POST' }).catch(() => {})
    } catch (e) {}

    return json({ owner: user, authenticated: true, navigation: ensureLikeMenu(navigation), favorites, result }, { headers: { 'cache-control': 'no-store' } })
  } catch (error) {
    return json({ error: error.message || '无法保存更改。' }, { status: 400 })
  }
}

async function mutate(navigation, favorites, payload) {
  const action = payload?.action
  if (action === 'add-favorite' || action === 'remove-favorite') {
    const url = new URL(requireText(payload.url, 'Website URL', 2048)).toString()
    if (!['http:', 'https:'].includes(new URL(url).protocol)) throw new Error('Website URL must use http or https.')
    const index = favorites.indexOf(url)
    if (action === 'add-favorite' && index === -1) favorites.push(url)
    if (action === 'remove-favorite' && index !== -1) favorites.splice(index, 1)
    return { url, favorited: action === 'add-favorite' }
  }

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
    const iconUrl = typeof payload.iconUrl === 'string' ? payload.iconUrl.trim() : ''
    if (iconUrl) {
      site.iconUrl = iconUrl
    } else if (action === 'create-site' || urlChanged) {
      site.iconUrl = await resolveIcon(url)
    }
    if (action === 'create-site') navigation.sites.push(site)
    return site
  }

  if (action === 'delete-site') {
    const before = navigation.sites.length
    navigation.sites = navigation.sites.filter((site) => site.id !== payload.id)
    if (before === navigation.sites.length) throw new Error('Site not found.')
    return { deleted: payload.id }
  }

  if (action === 'reorder-sites') {
    const siteIds = Array.isArray(payload.siteIds) ? payload.siteIds : []
    const ids = new Set(siteIds)
    if (siteIds.length !== navigation.sites.length || navigation.sites.some((site) => !ids.has(site.id))) {
      throw new Error('站点顺序数据无效。')
    }
    const position = new Map(siteIds.map((siteId, index) => [siteId, index]))
    navigation.sites = [...navigation.sites].sort((a, b) => position.get(a.id) - position.get(b.id))
    return { reordered: siteIds.length }
  }

  if (action === 'reorder-menus') {
    const menuIds = Array.isArray(payload.menuIds) ? payload.menuIds : []
    const ids = new Set(menuIds)
    if (menuIds.length !== navigation.menus.length || navigation.menus.some((menu) => !ids.has(menu.id))) {
      throw new Error('菜单顺序数据无效。')
    }
    const position = new Map(menuIds.map((menuId, index) => [menuId, index]))
    navigation.menus = [...navigation.menus].sort((a, b) => position.get(a.id) - position.get(b.id))
    return { reordered: menuIds.length }
  }

  throw new Error('Unsupported action.')
}
