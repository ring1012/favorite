'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  api,
  clearAuthToken,
  emptyNavigation,
  getAuthToken,
  LIKE_MENU_ID,
  Payload,
  Site,
  SITES_PER_PAGE,
} from './types'

export function useNavigationState(initialData?: Payload, expectedUser?: string) {
  const [data, setData] = useState<Payload>(
    initialData || { owner: 'admin', authenticated: false, navigation: emptyNavigation, favorites: [] }
  )
  const [activeMenu, setActiveMenu] = useState<string | null>(LIKE_MENU_ID)
  const [expanded, setExpanded] = useState<string[]>([])
  const [loading, setLoading] = useState(!initialData)
  const [notice, setNotice] = useState('')
  const [authMode, setAuthMode] = useState<boolean>(false)
  const [registerMode, setRegisterMode] = useState<boolean>(false)
  const [menuEditor, setMenuEditor] = useState<{ id?: string; parentId?: string | null; name: string } | null>(null)
  const [siteEditor, setSiteEditor] = useState<Partial<Site> | null>(null)
  const [visibleCount, setVisibleCount] = useState(SITES_PER_PAGE)
  const [searchScope, setSearchScope] = useState<'site' | 'google'>('site')
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingFavs, setPendingFavs] = useState<Set<string>>(new Set())
  const [blockedByAuth, setBlockedByAuth] = useState(!!expectedUser)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const cacheRefreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const reorderingRef = useRef(false)
  const nextOrderRef = useRef<Site[] | null>(null)
  const [menuDraggingId, setMenuDraggingId] = useState<string | null>(null)
  const [menuDragOverId, setMenuDragOverId] = useState<string | null>(null)

  const scheduleCacheRefresh = useCallback(() => {
    if (cacheRefreshTimer.current) clearTimeout(cacheRefreshTimer.current)
    cacheRefreshTimer.current = setTimeout(() => {
      cacheRefreshTimer.current = null
      if (!window.location.pathname.startsWith('/nav/')) return
      fetch(window.location.href, { cache: 'reload' }).catch(() => {})
    }, 10000)
  }, [])

  const handleForceRefresh = useCallback(() => {
    if (typeof window !== 'undefined') {
      fetch(window.location.href, { cache: 'reload' })
        .catch(() => {})
        .finally(() => {
          window.location.reload()
        })
    }
  }, [])

  useEffect(() => () => {
    if (cacheRefreshTimer.current) clearTimeout(cacheRefreshTimer.current)
  }, [])

  const flushReorder = useCallback(async () => {
    if (reorderingRef.current) return
    const order = nextOrderRef.current
    if (!order) return
    nextOrderRef.current = null
    reorderingRef.current = true
    try {
      const result = (await api('/api/navigation', {
        method: 'POST',
        body: JSON.stringify({ action: 'reorder-sites', siteIds: order.map((site) => site.id) }),
      })) as Payload
      const otherMenus = (result.navigation.menus || []).filter((m) => m.id !== LIKE_MENU_ID)
      result.navigation.menus = [{ id: LIKE_MENU_ID, name: '收藏', parentId: null }, ...otherMenus]
      setData(result)
      scheduleCacheRefresh()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '无法保存顺序。')
    } finally {
      reorderingRef.current = false
      if (nextOrderRef.current) flushReorder()
    }
  }, [scheduleCacheRefresh])

  const reorderMenu = useCallback(
    async (sourceId: string, targetId: string) => {
      if (sourceId === targetId) return
      const menus = data.navigation.menus
      const source = menus.find((m) => m.id === sourceId)
      const target = menus.find((m) => m.id === targetId)
      if (!source || !target) return
      // Both must be at the same level (both root or same parent)
      if (source.parentId !== target.parentId) return

      let newMenus: typeof menus
      if (!source.parentId) {
        // Root-level: move source group (root + its children) before/after target group
        const buildGroup = (rootId: string) => [
          menus.find((m) => m.id === rootId)!,
          ...menus.filter((m) => m.parentId === rootId),
        ]
        const roots = menus.filter((m) => !m.parentId)
        const fromIdx = roots.findIndex((m) => m.id === sourceId)
        const toIdx = roots.findIndex((m) => m.id === targetId)
        const reorderedRoots = [...roots]
        const [moved] = reorderedRoots.splice(fromIdx, 1)
        reorderedRoots.splice(toIdx, 0, moved)
        newMenus = reorderedRoots.flatMap((root) => buildGroup(root.id))
      } else {
        // Child-level: reorder within the same parent
        const parentId = source.parentId
        const siblings = menus.filter((m) => m.parentId === parentId)
        const fromIdx = siblings.findIndex((m) => m.id === sourceId)
        const toIdx = siblings.findIndex((m) => m.id === targetId)
        const reorderedSiblings = [...siblings]
        const [moved] = reorderedSiblings.splice(fromIdx, 1)
        reorderedSiblings.splice(toIdx, 0, moved)
        // Rebuild full menus: roots interleaved with their (possibly reordered) children
        const allRoots = menus.filter((m) => !m.parentId)
        newMenus = allRoots.flatMap((root) => [
          root,
          ...(root.id === parentId
            ? reorderedSiblings
            : menus.filter((m) => m.parentId === root.id)),
        ])
      }

      setData((prev) => ({ ...prev, navigation: { ...prev.navigation, menus: newMenus } }))
      try {
        const result = (await api('/api/navigation', {
          method: 'POST',
          body: JSON.stringify({ action: 'reorder-menus', menuIds: newMenus.map((m) => m.id) }),
        })) as Payload
        const otherMenus = (result.navigation.menus || []).filter((m) => m.id !== LIKE_MENU_ID)
        result.navigation.menus = [{ id: LIKE_MENU_ID, name: '收藏', parentId: null }, ...otherMenus]
        setData(result)
        scheduleCacheRefresh()
      } catch (error) {
        setNotice(error instanceof Error ? error.message : '无法保存菜单顺序。')
        // Rollback
        setData((prev) => ({ ...prev, navigation: { ...prev.navigation, menus } }))
      }
    },
    [data.navigation.menus, scheduleCacheRefresh]
  )

  /**
   * Move a menu to a different parent (or promote to root).
   * asChild=true  → make source a child of target's root
   * asChild=false → promote source to root level (sibling of target's root)
   */
  const moveMenu = useCallback(
    async (sourceId: string, targetId: string, asChild: boolean) => {
      if (sourceId === targetId) return
      const menus = data.navigation.menus
      const source = menus.find((m) => m.id === sourceId)
      const target = menus.find((m) => m.id === targetId)
      if (!source || !target) return
      if (source.id === LIKE_MENU_ID) return

      // Determine new parent: for asChild, parent is the target root
      const newParentId = asChild
        ? (target.parentId ? target.parentId : target.id)  // target root or target's own parent
        : null  // promote to root

      // Prevent making a root-with-children into a sub-menu (backend also blocks this)
      if (asChild) {
        const hasChildren = menus.some((m) => m.parentId === source.id)
        if (hasChildren) {
          setNotice('含有子分类的菜单不能移动到其他菜单下。')
          return
        }
      }

      // Optimistic update: re-parent source in local state
      const updatedSource = { ...source, parentId: newParentId }
      let newMenus: typeof menus

      if (asChild) {
        // Remove source, then insert it after the last child of newParentId
        const withoutSource = menus.filter((m) => m.id !== source.id)
        let insertIdx = withoutSource.findIndex((m) => m.id === newParentId)
        // Find last child of newParentId
        withoutSource.forEach((m, i) => { if (m.parentId === newParentId) insertIdx = i })
        newMenus = [
          ...withoutSource.slice(0, insertIdx + 1),
          updatedSource,
          ...withoutSource.slice(insertIdx + 1),
        ]
      } else {
        // Promote to root: remove source and its children from current position,
        // insert source as root before the target root
        const withoutSource = menus.filter((m) => m.id !== source.id)
        const targetRootId = target.parentId ? target.parentId : target.id
        const targetRootIdx = withoutSource.findIndex((m) => m.id === targetRootId)
        newMenus = [
          ...withoutSource.slice(0, targetRootIdx),
          updatedSource,
          ...withoutSource.slice(targetRootIdx),
        ]
      }

      setData((prev) => ({ ...prev, navigation: { ...prev.navigation, menus: newMenus } }))
      try {
        const result = (await api('/api/navigation', {
          method: 'POST',
          body: JSON.stringify({
            action: 'move-menu',
            id: source.id,
            newParentId,
          }),
        })) as Payload
        const otherMenus = (result.navigation.menus || []).filter((m) => m.id !== LIKE_MENU_ID)
        result.navigation.menus = [{ id: LIKE_MENU_ID, name: '收藏', parentId: null }, ...otherMenus]
        setData(result)
        scheduleCacheRefresh()
      } catch (error) {
        setNotice(error instanceof Error ? error.message : '无法移动菜单。')
        // Rollback
        setData((prev) => ({ ...prev, navigation: { ...prev.navigation, menus } }))
      }
    },
    [data.navigation.menus, scheduleCacheRefresh]
  )

  const reorderSite = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return
    const sites = [...data.navigation.sites]
    const from = sites.findIndex((site) => site.id === sourceId)
    const to = sites.findIndex((site) => site.id === targetId)
    if (from < 0 || to < 0) return
    const [moved] = sites.splice(from, 1)
    sites.splice(to, 0, moved)
    setData((prev) => ({ ...prev, navigation: { ...prev.navigation, sites } }))
    nextOrderRef.current = sites
    flushReorder()
  }

  const refresh = async () => {
    setLoading(true)
    try {
      const result = (await api('/api/navigation')) as Payload
      const otherMenus = (result.navigation.menus || []).filter((m) => m.id !== LIKE_MENU_ID)
      result.navigation.menus = [{ id: LIKE_MENU_ID, name: '收藏', parentId: null }, ...otherMenus]
      setData(result)
      const first = result.navigation.menus.find((menu) => !menu.parentId)
      setActiveMenu((current) =>
        current && result.navigation.menus.some((menu) => menu.id === current) ? current : first?.id || LIKE_MENU_ID
      )
      setExpanded(result.navigation.menus.filter((menu) => !menu.parentId).map((menu) => menu.id))
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '无法加载导航。')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let loggedInUser: string | null = null
    const token = getAuthToken()
    if (token) {
      try {
        const parts = token.split('.')
        if (parts.length === 3) {
          const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
          const payloadStr = decodeURIComponent(escape(window.atob(base64)))
          loggedInUser = JSON.parse(payloadStr).sub as string
        }
      } catch (e) {
        console.error('Failed to parse local session token:', e)
      }
    }

    if (typeof window !== 'undefined' && window.location.pathname === '/' && loggedInUser) {
      window.location.assign(`/nav/${encodeURIComponent(loggedInUser)}`)
      return
    }

    if (expectedUser && expectedUser !== loggedInUser) {
      setBlockedByAuth(true)
      setAuthMode(true)
      setLoading(false)
      return
    } else {
      setBlockedByAuth(false)
    }

    if (!initialData) {
      refresh()
    } else if (loggedInUser) {
      if (initialData.owner === loggedInUser) {
        setData((prev) => ({ ...prev, authenticated: true }))
        setLoading(false)
      } else {
        refresh()
      }
    } else {
      setLoading(false)
    }
  }, [initialData, expectedUser])

  useEffect(() => {
    if (!data.authenticated) {
      try {
        const saved = localStorage.getItem('guest_favorites')
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed)) setData((prev) => ({ ...prev, favorites: parsed }))
        }
      } catch (e) {}
    }
  }, [data.authenticated])

  const menus = data.navigation.menus
  const normalizedQuery = searchScope === 'site' ? searchQuery.trim().toLowerCase() : ''
  const matchesQuery = (site: Site) =>
    !normalizedQuery || `${site.name} ${site.description} ${site.url}`.toLowerCase().includes(normalizedQuery)
  const favoriteUrls = useMemo(() => new Set(data.favorites), [data.favorites])

  const groups = useMemo(() => {
    const allSites = data.navigation.sites
    if (normalizedQuery) {
      return menus
        .filter((m) => m.id !== LIKE_MENU_ID)
        .map((menu) => ({
          id: menu.id,
          title: menu.name,
          sites: allSites.filter((s) => s.menuId === menu.id && matchesQuery(s)),
        }))
        .filter((g) => g.sites.length > 0)
    }
    if (activeMenu === LIKE_MENU_ID) {
      return [
        {
          id: LIKE_MENU_ID,
          title: '收藏',
          sites: allSites.filter((s) => data.favorites.includes(s.url) && matchesQuery(s)),
        },
      ]
    }
    const selected = menus.find((m) => m.id === activeMenu)
    if (!selected) return []
    const childIds = new Set(menus.filter((m) => m.parentId === selected.id).map((m) => m.id))
    const ordered = [selected, ...menus.filter((m) => childIds.has(m.id))]
    return ordered.map((menu) => ({
      id: menu.id,
      title: menu.name,
      sites: allSites.filter((s) => s.menuId === menu.id && matchesQuery(s)),
    }))
  }, [normalizedQuery, menus, activeMenu, data.navigation.sites, data.favorites])

  const totalSites = groups.reduce((n, g) => n + g.sites.length, 0)
  let renderBudget = visibleCount
  const renderedGroups = groups
    .map((g) => {
      const shown = g.sites.slice(0, renderBudget)
      renderBudget -= shown.length
      return { id: g.id, title: g.title, sites: shown }
    })
    .filter((g) => g.sites.length > 0)
  const hasMoreSites = totalSites > visibleCount

  useEffect(() => {
    setVisibleCount(SITES_PER_PAGE)
  }, [activeMenu, normalizedQuery, data.owner])

  useEffect(() => {
    const target = loadMoreRef.current
    if (!target || !hasMoreSites) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisibleCount((count) => count + SITES_PER_PAGE)
      },
      { rootMargin: '320px' }
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [hasMoreSites, totalSites])

  const mutate = async (body: object) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      const result = (await api('/api/navigation', { method: 'POST', body: JSON.stringify(body) })) as Payload
      const otherMenus = (result.navigation.menus || []).filter((m) => m.id !== LIKE_MENU_ID)
      result.navigation.menus = [{ id: LIKE_MENU_ID, name: '收藏', parentId: null }, ...otherMenus]
      setData(result)
      setNotice('已保存。')
      setMenuEditor(null)
      setSiteEditor(null)
      scheduleCacheRefresh()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '无法保存。')
    } finally {
      setIsSubmitting(false)
    }
  }

  const deleteItem = (kind: 'menu' | 'site', id: string) => {
    if (isSubmitting) return
    if (id === LIKE_MENU_ID) {
      setNotice('“收藏”分类不能删除。')
      return
    }
    if (window.confirm(`确定删除该${kind === 'menu' ? '分类' : '网站'}及其关联内容？`)) mutate({ action: `delete-${kind}`, id })
  }

  const toggleFavorite = async (site: Site) => {
    if (pendingFavs.size > 0 || pendingFavs.has(site.url)) return
    setPendingFavs((prev) => new Set(prev).add(site.url))

    const favorited = favoriteUrls.has(site.url)
    if (!data.authenticated) {
      const newFavs = favorited ? data.favorites.filter((u) => u !== site.url) : [...data.favorites, site.url]
      try {
        localStorage.setItem('guest_favorites', JSON.stringify(newFavs))
      } catch (e) {}
      setData((prev) => ({ ...prev, favorites: newFavs }))
      setPendingFavs((prev) => {
        const next = new Set(prev)
        next.delete(site.url)
        return next
      })
      return
    }

    try {
      const result = (await api('/api/navigation', {
        method: 'POST',
        body: JSON.stringify({ action: favorited ? 'remove-favorite' : 'add-favorite', url: site.url }),
      })) as Payload
      const otherMenus = (result.navigation.menus || []).filter((m) => m.id !== LIKE_MENU_ID)
      result.navigation.menus = [{ id: LIKE_MENU_ID, name: '收藏', parentId: null }, ...otherMenus]
      setData(result)
      scheduleCacheRefresh()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '无法更新收藏。')
    } finally {
      setPendingFavs((prev) => {
        const next = new Set(prev)
        next.delete(site.url)
        return next
      })
    }
  }

  const handleLogout = async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' })
    } catch {}
    finally {
      clearAuthToken()
      setData({ owner: 'admin', authenticated: false, navigation: emptyNavigation, favorites: [] })
      setEditMode(false)
      refresh()
    }
  }

  return {
    data,
    activeMenu,
    setActiveMenu,
    expanded,
    setExpanded,
    loading,
    notice,
    setNotice,
    authMode,
    setAuthMode,
    registerMode,
    setRegisterMode,
    menuEditor,
    setMenuEditor,
    siteEditor,
    setSiteEditor,
    searchScope,
    setSearchScope,
    searchQuery,
    setSearchQuery,
    sidebarCollapsed,
    setSidebarCollapsed,
    mobileNavOpen,
    setMobileNavOpen,
    editMode,
    setEditMode,
    isSubmitting,
    pendingFavs,
    blockedByAuth,
    draggingId,
    setDraggingId,
    dragOverId,
    setDragOverId,
    menuDraggingId,
    setMenuDraggingId,
    menuDragOverId,
    setMenuDragOverId,
    menus,
    normalizedQuery,
    favoriteUrls,
    renderedGroups,
    totalSites,
    hasMoreSites,
    loadMoreRef,
    handleForceRefresh,
    reorderSite,
    reorderMenu,
    moveMenu,
    refresh,
    mutate,
    deleteItem,
    toggleFavorite,
    handleLogout,
  }
}
