'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, FolderPlus, Globe2, Heart, LogIn, LogOut, PanelLeftClose, PanelLeftOpen, Pencil, Plus, Search, Trash2, X } from 'lucide-react'

const LIKE_MENU_ID = 'like'
type Menu = { id: string; name: string; parentId: string | null }
type Site = { id?: string; menuId: string; name: string; description: string; url: string; iconUrl: string }
type Navigation = { version: number; menus: Menu[]; sites: Site[] }
type Payload = { owner: string; authenticated: boolean; navigation: Navigation; favorites: string[] }

// The session token lives in localStorage so the user stays logged in across browser restarts.
// Every request carries it back to the server via the `x-n-auth` header.
const AUTH_KEY = 'navigation_session'
function getAuthToken() {
  if (typeof window === 'undefined') return null
  try { return window.localStorage.getItem(AUTH_KEY) } catch { return null }
}
function setAuthToken(token: string) {
  try { window.localStorage.setItem(AUTH_KEY, token) } catch {}
}
function clearAuthToken() {
  try { window.localStorage.removeItem(AUTH_KEY) } catch {}
}

const emptyNavigation: Navigation = { version: 1, menus: [{ id: LIKE_MENU_ID, name: '收藏', parentId: null }], sites: [] }
const SITES_PER_PAGE = 24

async function api(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers)
  headers.set('content-type', 'application/json')
  const token = getAuthToken()
  if (token) headers.set('x-n-auth', token)
  const response = await fetch(path, { ...init, headers })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || '请求失败。')
  return data
}

export default function NavigationApp({ initialData, expectedUser }: { initialData?: Payload, expectedUser?: string }) {
  const [data, setData] = useState<Payload>(initialData || { owner: 'admin', authenticated: false, navigation: emptyNavigation, favorites: [] })
  const [activeMenu, setActiveMenu] = useState<string | null>(LIKE_MENU_ID)
  const [expanded, setExpanded] = useState<string[]>([])
  const [loading, setLoading] = useState(!initialData)
  const [notice, setNotice] = useState('')
  const [authMode, setAuthMode] = useState<boolean>(false)
  const [menuEditor, setMenuEditor] = useState<{ id?: string; parentId?: string | null; name: string } | null>(null)
  const [siteEditor, setSiteEditor] = useState<Partial<Site> | null>(null)
  const [visibleCount, setVisibleCount] = useState(SITES_PER_PAGE)
  const [searchScope, setSearchScope] = useState<'site' | 'google'>('site')
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingFavs, setPendingFavs] = useState<Set<string>>(new Set())
  const [blockedByAuth, setBlockedByAuth] = useState(!!expectedUser)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const refresh = async () => {
    setLoading(true)
    try {
      const result = await api('/api/navigation') as Payload
      const otherMenus = (result.navigation.menus || []).filter((m) => m.id !== LIKE_MENU_ID)
      result.navigation.menus = [{ id: LIKE_MENU_ID, name: '收藏', parentId: null }, ...otherMenus]
      setData(result)
      const first = result.navigation.menus.find((menu) => !menu.parentId)
      setActiveMenu((current) => current && result.navigation.menus.some((menu) => menu.id === current) ? current : first?.id || LIKE_MENU_ID)
      setExpanded(result.navigation.menus.filter((menu) => !menu.parentId).map((menu) => menu.id))
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '无法加载导航。')
    } finally { setLoading(false) }
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
  const roots = menus.filter((menu) => !menu.parentId)
  const normalizedQuery = searchScope === 'site' ? searchQuery.trim().toLowerCase() : ''
  const matchesQuery = (site: Site) =>
    !normalizedQuery || `${site.name} ${site.description} ${site.url}`.toLowerCase().includes(normalizedQuery)
  const favoriteUrls = new Set(data.favorites)

  // Group sites by menu: clicking a menu renders one section per menu
  // (parent menu shows its own section + one section per child).
  // Searching renders a section for every menu that has a match (global search).
  const groups: { id: string; title: string; sites: Site[] }[] = useMemo(() => {
    const allSites = data.navigation.sites
    if (normalizedQuery) {
      return menus
        .filter((m) => m.id !== LIKE_MENU_ID)
        .map((menu) => ({ id: menu.id, title: menu.name, sites: allSites.filter((s) => s.menuId === menu.id && matchesQuery(s)) }))
        .filter((g) => g.sites.length > 0)
    }
    if (activeMenu === LIKE_MENU_ID) {
      return [{ id: LIKE_MENU_ID, title: '收藏', sites: allSites.filter((s) => data.favorites.includes(s.url) && matchesQuery(s)) }]
    }
    const selected = menus.find((m) => m.id === activeMenu)
    if (!selected) return []
    const childIds = new Set(menus.filter((m) => m.parentId === selected.id).map((m) => m.id))
    const ordered = [selected, ...menus.filter((m) => childIds.has(m.id))]
    return ordered
      .map((menu) => ({ id: menu.id, title: menu.name, sites: allSites.filter((s) => s.menuId === menu.id && matchesQuery(s)) }))
  }, [normalizedQuery, menus, activeMenu, data.navigation.sites, data.favorites])

  const totalSites = groups.reduce((n, g) => n + g.sites.length, 0)
  let renderBudget = visibleCount
  const renderedGroups = groups
    .map((g) => { const shown = g.sites.slice(0, renderBudget); renderBudget -= shown.length; return { id: g.id, title: g.title, sites: shown } })
    .filter((g) => g.sites.length > 0)
  const hasMoreSites = totalSites > visibleCount

  useEffect(() => { setVisibleCount(SITES_PER_PAGE) }, [activeMenu, normalizedQuery, data.owner])
  useEffect(() => {
    const target = loadMoreRef.current
    if (!target || !hasMoreSites) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisibleCount((count) => count + SITES_PER_PAGE)
    }, { rootMargin: '320px' })
    observer.observe(target)
    return () => observer.disconnect()
  }, [hasMoreSites, totalSites])

  const mutate = async (body: object) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      const result = await api('/api/navigation', { method: 'POST', body: JSON.stringify(body) }) as Payload
      const otherMenus = (result.navigation.menus || []).filter((m) => m.id !== LIKE_MENU_ID)
      result.navigation.menus = [{ id: LIKE_MENU_ID, name: '收藏', parentId: null }, ...otherMenus]
      setData(result)
      setNotice('已保存。')
      setMenuEditor(null)
      setSiteEditor(null)
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
    if (pendingFavs.has(site.url)) return
    setPendingFavs((prev) => new Set(prev).add(site.url))

    const favorited = favoriteUrls.has(site.url)
    if (!data.authenticated) {
      const newFavs = favorited
        ? data.favorites.filter((u) => u !== site.url)
        : [...data.favorites, site.url]
      try { localStorage.setItem('guest_favorites', JSON.stringify(newFavs)) } catch (e) {}
      setData((prev) => ({ ...prev, favorites: newFavs }))
      setPendingFavs((prev) => { const next = new Set(prev); next.delete(site.url); return next })
      return
    }

    try {
      const result = await api('/api/navigation', {
        method: 'POST',
        body: JSON.stringify({ action: favorited ? 'remove-favorite' : 'add-favorite', url: site.url }),
      }) as Payload
      const otherMenus = (result.navigation.menus || []).filter((m) => m.id !== LIKE_MENU_ID)
      result.navigation.menus = [{ id: LIKE_MENU_ID, name: '收藏', parentId: null }, ...otherMenus]
      setData(result)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '无法更新收藏。')
    } finally {
      setPendingFavs((prev) => { const next = new Set(prev); next.delete(site.url); return next })
    }
  }

  if (blockedByAuth) {
    return (
      <main className="min-h-screen bg-[#0b0b12] flex items-center justify-center font-sans">
        {authMode && <AuthDialog onClose={() => {}} onDone={() => { setAuthMode(false); window.location.reload() }} />}
      </main>
    )
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0b0b12] text-slate-100 font-sans">
      <div className="pointer-events-none fixed inset-0" aria-hidden>
        <div className="absolute -top-40 left-1/2 h-[520px] w-[840px] -translate-x-1/2 rounded-full bg-blue-500/[.07] blur-[130px]" />
        <div className="absolute -bottom-48 -right-24 h-[460px] w-[640px] rounded-full bg-violet-500/[.05] blur-[150px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,.02),transparent_55%)]" />
      </div>
      <div className="relative mx-auto flex min-h-screen max-w-[1680px] flex-col gap-3 px-3 py-3 md:px-5 md:py-4">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl bg-[#16161f]/75 px-4 py-3 shadow-[0_10px_40px_rgba(0,0,0,.4),inset_0_1px_0_rgba(255,255,255,.05)] backdrop-blur-xl md:flex-nowrap">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-400 to-violet-500 shadow-lg shadow-blue-500/30">
              <img src="/orbit-logo.svg" alt="Orbit" className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight leading-none text-white">Orbit</p>
              <p className="mt-1 text-[10px] text-slate-500">{data.authenticated ? `${data.owner} 的网站导航` : '精选网址导航'}</p>
            </div>
          </div>
          <form className="order-3 flex w-full max-w-xl items-center overflow-hidden rounded-full bg-black/30 px-3 shadow-[inset_0_1px_2px_rgba(0,0,0,.4)] ring-1 ring-inset ring-white/[.06] transition focus-within:ring-2 focus-within:ring-blue-400/50 lg:order-none lg:flex-1" onSubmit={(event) => { event.preventDefault(); if (searchScope === 'google' && searchQuery.trim()) window.location.assign(`https://www.google.com/search?q=${encodeURIComponent(searchQuery.trim())}`) }}>
            <div className="grid place-items-center pr-2 text-slate-500"><Search size={14} /></div>
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={searchScope === 'site' ? '搜索你的导航…' : '使用 Google 搜索…'} className="min-w-0 flex-1 bg-transparent py-2 text-[13px] outline-none placeholder:text-slate-600" />
            <select value={searchScope} onChange={(event) => setSearchScope(event.target.value as 'site' | 'google')} className="rounded-full bg-transparent text-xs text-slate-400 outline-none"><option value="site">站内搜索</option><option value="google">Google</option></select>
          </form>
          <div className="flex items-center gap-2">
            {data.authenticated ? (
              <>
                <button onClick={() => setEditMode(!editMode)} title={editMode ? "退出编辑模式" : "进入编辑模式"} className={`icon-button ${editMode ? 'bg-blue-500/15 text-blue-300 hover:text-blue-200' : ''}`}><Pencil size={15} /></button>
                <button onClick={async () => { try { await api('/api/auth/logout', { method: 'POST' }) } catch {} finally { clearAuthToken(); setData({ owner: 'admin', authenticated: false, navigation: emptyNavigation, favorites: [] }); setEditMode(false); refresh() } }} className="icon-button" title="退出登录"><LogOut size={15} /></button>
              </>
            ) : (
              <button onClick={() => setAuthMode(true)} className="icon-button" title="登录"><LogIn size={15} /></button>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col gap-3 lg:flex-row">
          {/* Sidebar */}
          <aside className={`w-full shrink-0 rounded-2xl bg-white/[.03] p-2.5 shadow-[0_12px_40px_rgba(0,0,0,.3),inset_0_1px_0_rgba(255,255,255,.04)] backdrop-blur-sm transition-all duration-300 ${sidebarCollapsed ? 'hidden lg:block lg:w-0 lg:overflow-hidden lg:p-0' : 'lg:w-52'}`}>
            <div className="mb-2 flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <button
                  title={sidebarCollapsed ? '展开分类' : '收起分类'}
                  onClick={() => setSidebarCollapsed((value) => !value)}
                  className="icon-button p-1 text-slate-400 hover:text-slate-200"
                >
                  {sidebarCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
                </button>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">导航分类</span>
              </div>
              {data.authenticated && editMode && (
                <button title="添加分类" disabled={isSubmitting} onClick={() => setMenuEditor({ name: '', parentId: null })} className="icon-button p-1 disabled:opacity-50"><Plus size={13} /></button>
              )}
            </div>

            <nav className="space-y-0.5">
              {roots.map((root) => {
                const children = menus.filter((menu) => menu.parentId === root.id);
                const open = expanded.includes(root.id);
                const isRootActive = activeMenu === root.id;
                const isLike = root.id === LIKE_MENU_ID;

                return (
                  <div key={root.id} className="space-y-0.5">
                    <div
                      className={`group relative flex items-center justify-between rounded-lg px-2 py-[7px] text-[13px] font-medium transition-all duration-200 cursor-pointer ${
                        isRootActive
                          ? 'bg-gradient-to-r from-blue-500/20 to-violet-500/10 text-blue-50 font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,.06)]'
                          : 'text-slate-400 hover:bg-white/[.05] hover:text-slate-100'
                      }`}
                      onClick={() => setActiveMenu(root.id)}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        {children.length > 0 ? (
                          <button
                            type="button"
                            className="p-0.5 rounded text-slate-500 hover:bg-white/10 hover:text-slate-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpanded((items) =>
                                items.includes(root.id) ? items.filter((id) => id !== root.id) : [...items, root.id]
                              );
                            }}
                          >
                            {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          </button>
                        ) : (
                          <span className="w-3.5 shrink-0" />
                        )}

                        {isLike ? (
                          <Heart size={12} className="fill-rose-500 text-rose-500 shrink-0" />
                        ) : (
                          <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${isRootActive ? 'bg-blue-400' : 'bg-slate-600 group-hover:bg-blue-400'}`} />
                        )}

                        <span className="truncate flex-1">{root.name}</span>
                      </div>

                      {data.authenticated && editMode && !isLike && (
                        <div className="hidden items-center gap-1 pr-1 group-hover:flex">
                          <button title="添加子分类" disabled={isSubmitting} className="icon-button p-0.5" onClick={(e) => { e.stopPropagation(); setMenuEditor({ name: '', parentId: root.id }); }}><FolderPlus size={12} /></button>
                          <button title="编辑分类" disabled={isSubmitting} className="icon-button p-0.5" onClick={(e) => { e.stopPropagation(); setMenuEditor({ id: root.id, name: root.name }); }}><Pencil size={12} /></button>
                          <button title="删除分类" disabled={isSubmitting} className="icon-button p-0.5 text-rose-300" onClick={(e) => { e.stopPropagation(); deleteItem('menu', root.id); }}><Trash2 size={12} /></button>
                        </div>
                      )}
                    </div>

                    {open && children.length > 0 && (
                      <div className="ml-3.5 pl-2 space-y-0.5 mt-0.5">
                        {children.map((child) => {
                          const isChildActive = activeMenu === child.id;
                          return (
                            <div
                              key={child.id}
                              className={`group flex items-center justify-between rounded-lg px-2 py-[6px] text-[13px] transition-all cursor-pointer ${
                                isChildActive
                                  ? 'bg-blue-500/[.14] font-semibold text-blue-50'
                                  : 'text-slate-500 hover:bg-white/[.05] hover:text-slate-200'
                              }`}
                              onClick={() => setActiveMenu(child.id)}
                            >
                              <span className="truncate flex-1">{child.name}</span>
                              {data.authenticated && editMode && (
                                <div className="hidden items-center gap-1 pr-1 group-hover:flex">
                                  <button title="编辑分类" disabled={isSubmitting} className="icon-button p-0.5" onClick={(e) => { e.stopPropagation(); setMenuEditor({ id: child.id, name: child.name }); }}><Pencil size={12} /></button>
                                  <button title="删除分类" disabled={isSubmitting} className="icon-button p-0.5 text-rose-300" onClick={(e) => { e.stopPropagation(); deleteItem('menu', child.id); }}><Trash2 size={12} /></button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </aside>

          {/* Section Main View */}
          <section className="min-w-0 flex-1 p-0.5 md:p-1">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {sidebarCollapsed && (
                  <button
                    title="展开导航分类"
                    onClick={() => setSidebarCollapsed(false)}
                    className="hidden lg:flex items-center gap-1.5 rounded-lg bg-white/[.05] px-2.5 py-1.5 text-xs text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,.04)] backdrop-blur-sm transition hover:bg-white/[.09] hover:text-white"
                  >
                    <PanelLeftOpen size={14} />
                    <span>展开分类</span>
                  </button>
                )}
                {normalizedQuery && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 px-3 py-1 text-xs font-medium text-blue-200 min-w-0">
                    <Search size={12} className="shrink-0" />
                    <span className="truncate">“{searchQuery.trim()}” 共 {totalSites} 条结果</span>
                  </span>
                )}
              </div>
              {data.authenticated && editMode && !normalizedQuery && (
                <button title="添加网站" disabled={isSubmitting} className="button-primary text-xs py-1.5 px-3 disabled:opacity-50" onClick={() => setSiteEditor({ menuId: activeMenu && activeMenu !== LIKE_MENU_ID ? activeMenu : menus.find(m => m.id !== LIKE_MENU_ID)?.id || '', name: '', description: '', url: '' })}><Plus size={14} /> 添加网站</button>
              )}
            </div>

            {loading ? (
              <div className="grid place-items-center py-20 text-sm text-slate-500">正在加载你的导航…</div>
            ) : renderedGroups.length ? (
              <>
                <div className="space-y-6">
                  {renderedGroups.map((group) => (
                    <SiteSection
                      key={group.id}
                      title={group.title}
                      sites={group.sites}
                      favoriteUrls={favoriteUrls}
                      pendingFavs={pendingFavs}
                      authenticated={data.authenticated}
                      editMode={editMode}
                      isSubmitting={isSubmitting}
                      onToggleFavorite={toggleFavorite}
                      onEditSite={setSiteEditor}
                      onDeleteSite={(id) => deleteItem('site', id)}
                    />
                  ))}
                </div>
                {hasMoreSites && <div ref={loadMoreRef} className="grid h-14 place-items-center text-xs text-slate-500"><span className="rounded-full bg-white/[.05] px-3 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,.04)]">正在加载更多网站…</span></div>}
              </>
            ) : (
              <div className="grid min-h-64 place-items-center rounded-2xl bg-white/[.025] text-center shadow-[inset_0_1px_0_rgba(255,255,255,.03)]">
                <div>
                  <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-blue-500/15 to-violet-500/10 shadow-[inset_0_1px_0_rgba(255,255,255,.06)]">
                    <Globe2 className="text-slate-500" size={22} />
                  </div>
                  <p className="font-medium text-slate-200 text-sm">{normalizedQuery ? '没有找到匹配的网站' : activeMenu === LIKE_MENU_ID ? '暂无收藏网站' : '这里还没有网站'}</p>
                  <p className="mt-1.5 max-w-sm text-xs leading-5 text-slate-500">{normalizedQuery ? '换个关键词试试，或者使用右上角的 Google 搜索。' : activeMenu === LIKE_MENU_ID ? '在任意网站卡片右上角点击爱心图标即可快速添加到收藏分类。' : data.authenticated ? '添加一个网站开始建设这个导航分类。' : '登录以创建你自己的导航。'}</p>
                </div>
              </div>
            )}
          </section>
        </div>{notice && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 rounded-full bg-[#1c1c26]/90 px-4 py-2 text-sm shadow-[0_12px_32px_rgba(0,0,0,.5)] backdrop-blur-xl">{notice}<button className="ml-3 text-slate-400 hover:text-white" onClick={() => setNotice('')}><X size={14} /></button></div>}
      </div>
      {authMode && <AuthDialog onClose={() => setAuthMode(false)} onDone={() => { setAuthMode(false); refresh() }} />}
      {menuEditor && <MenuDialog value={menuEditor} isSubmitting={isSubmitting} onClose={() => setMenuEditor(null)} onSave={(name) => mutate(menuEditor.id ? { action: 'update-menu', id: menuEditor.id, name } : { action: 'create-menu', parentId: menuEditor.parentId, name })} />}
      {siteEditor && <SiteDialog value={siteEditor} menus={menus} isSubmitting={isSubmitting} onClose={() => setSiteEditor(null)} onSave={(site) => mutate(siteEditor.id ? { action: 'update-site', id: siteEditor.id, ...site } : { action: 'create-site', ...site })} />}
    </main>
  )
}

function SiteSection({ title, sites, favoriteUrls, pendingFavs, authenticated, editMode, isSubmitting, onToggleFavorite, onEditSite, onDeleteSite }: {
  title: string
  sites: Site[]
  favoriteUrls: Set<string>
  pendingFavs: Set<string>
  authenticated: boolean
  editMode: boolean
  isSubmitting: boolean
  onToggleFavorite: (site: Site) => void
  onEditSite: (site: Site) => void
  onDeleteSite: (id: string) => void
}) {
  return (
    <div>
      <div className="mb-2.5 flex items-center gap-2">
        <h2 className="text-base font-bold tracking-tight text-white">{title}</h2>
        <span className="rounded-full bg-white/[.05] px-2 py-0.5 text-[11px] font-medium text-slate-500">{sites.length}</span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
        {sites.map((site) => {
          const isFav = favoriteUrls.has(site.url)
          const isPending = pendingFavs.has(site.url)
          return (
            <article key={site.id} className="group relative break-inside-avoid rounded-xl bg-white/[.045] p-3 shadow-[0_1px_2px_rgba(0,0,0,.2),inset_0_1px_0_rgba(255,255,255,.04)] transition duration-200 hover:-translate-y-px hover:bg-white/[.07] hover:shadow-[0_12px_32px_rgba(0,0,0,.4),0_0_0_1px_rgba(59,130,246,.12),inset_0_1px_0_rgba(255,255,255,.06)]">
              <button
                type="button"
                disabled={isPending}
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onToggleFavorite(site); }}
                className={`absolute top-2 right-2 z-10 grid h-7 w-7 place-items-center rounded-full bg-black/55 shadow-md backdrop-blur-sm transition-all hover:scale-110 hover:bg-black/80 ${isFav ? 'opacity-100' : 'opacity-100 md:opacity-0 md:group-hover:opacity-100'} ${isPending ? 'cursor-wait opacity-50' : 'cursor-pointer'}`}
                title={isFav ? '取消收藏' : '加入收藏'}
              >
                <Heart
                  size={15}
                  className={isFav ? 'fill-rose-500 text-rose-500' : 'text-slate-300 hover:text-rose-400'}
                />
              </button>
              <a href={site.url} target="_blank" rel="noreferrer" title={site.description || undefined} className="block">
                <div className="mb-2 flex items-center gap-2.5 pr-6">
                  <div className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-lg bg-white/10 shadow-[inset_0_1px_2px_rgba(0,0,0,.2)]">
                    <img src={site.iconUrl.startsWith('/') ? `/api/icon?url=${encodeURIComponent(site.iconUrl)}` : site.iconUrl} alt="" loading="lazy" className="h-full w-full object-contain p-[3px]" onError={(event) => { event.currentTarget.style.display = 'none' }} />
                  </div>
                  <h2 className="truncate text-[13px] font-semibold tracking-tight text-slate-50 group-hover:text-white">{site.name}</h2>
                </div>
                <p className="hidden truncate text-xs leading-4 text-slate-500 md:block">{site.description || <span className="text-slate-600">—</span>}</p>
                <p className="mt-1 truncate text-[10px] text-slate-600">{new URL(site.url).host}</p>
              </a>
              {authenticated && editMode && (
                <div className="mt-2 flex gap-1.5">
                  <button title="编辑网站" disabled={isSubmitting} className="icon-button p-1 disabled:opacity-50" onClick={() => onEditSite(site)}><Pencil size={13} /></button>
                  <button title="删除网站" disabled={isSubmitting} className="icon-button p-1 text-rose-300 disabled:opacity-50" onClick={() => site.id && onDeleteSite(site.id)}><Trash2 size={13} /></button>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}

function Dialog({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) { return <div className="fixed inset-0 z-30 grid place-items-center bg-black/60 p-4 backdrop-blur-md"><div className="w-full max-w-md rounded-2xl bg-[#14141d] p-6 shadow-[0_24px_80px_rgba(0,0,0,.6),inset_0_1px_0_rgba(255,255,255,.06)]"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-semibold text-white">{title}</h2><button className="icon-button" onClick={onClose}><X size={18} /></button></div>{children}</div></div> }
function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) { return <label className="block text-sm text-slate-300">{label}<input {...props} className="mt-1.5 w-full rounded-xl bg-white/[.05] px-3.5 py-2.5 text-sm outline-none ring-1 ring-inset ring-white/[.08] transition placeholder:text-slate-600 focus:ring-2 focus:ring-blue-400/50 disabled:opacity-50" /></label> }
function AuthDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) { const [error, setError] = useState(''); const [loading, setLoading] = useState(false); const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (loading) return; setLoading(true); setError(''); const form = new FormData(event.currentTarget); try { const result = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: form.get('username'), password: form.get('password') }) }); if (result.token) setAuthToken(result.token); onDone() } catch (error) { setError(error instanceof Error ? error.message : '无法继续。') } finally { setLoading(false) } }; return <Dialog title="欢迎回来" onClose={onClose}><form className="space-y-4" onSubmit={submit}><Field label="用户名" name="username" placeholder="例如：zhang_san" required disabled={loading} /><Field label="密码" type="password" name="password" placeholder="至少 8 个字符" minLength={8} required disabled={loading} />{error && <p className="text-sm text-rose-300">{error}</p>}<button className="button-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed" type="submit" disabled={loading}>{loading ? '处理中...' : '登录'}</button></form></Dialog> }
function MenuDialog({ value, isSubmitting, onClose, onSave }: { value: { name: string }; isSubmitting?: boolean; onClose: () => void; onSave: (name: string) => void }) { const [name, setName] = useState(value.name); return <Dialog title={value.name ? '重命名分类' : '新建分类'} onClose={onClose}><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (!isSubmitting) onSave(name) }}><Field label="分类名称" value={name} onChange={(event) => setName(event.target.value)} required autoFocus disabled={isSubmitting} /><button className="button-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed" disabled={isSubmitting}>{isSubmitting ? '保存中...' : '保存分类'}</button></form></Dialog> }
function SiteDialog({ value, menus, isSubmitting, onClose, onSave }: { value: Partial<Site>; menus: Menu[]; isSubmitting?: boolean; onClose: () => void; onSave: (site: Partial<Site>) => void }) { const [site, setSite] = useState(value); const update = (key: keyof Site, value: string) => setSite((current) => ({ ...current, [key]: value })); return <Dialog title={site.id ? '编辑网站' : '添加网站'} onClose={onClose}><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (!isSubmitting) onSave(site) }}><Field label="名称" value={site.name || ''} onChange={(event) => update('name', event.target.value)} required disabled={isSubmitting} /><Field label="描述" value={site.description || ''} onChange={(event) => update('description', event.target.value)} required disabled={isSubmitting} /><Field label="网站链接" type="url" value={site.url || ''} onChange={(event) => update('url', event.target.value)} placeholder="https://example.com" required disabled={isSubmitting} /><Field label="图标链接 (可选，直接使用此 Icon)" type="url" value={site.iconUrl || ''} onChange={(event) => update('iconUrl', event.target.value)} placeholder="https://example.com/favicon.ico" disabled={isSubmitting} /><label className="block text-sm text-slate-300">所属分类<select value={site.menuId || ''} onChange={(event) => update('menuId', event.target.value)} disabled={isSubmitting} className="mt-1.5 w-full rounded-xl bg-white/[.05] px-3.5 py-2.5 text-sm outline-none ring-1 ring-inset ring-white/[.08] transition focus:ring-2 focus:ring-blue-400/50 disabled:opacity-50">{menus.filter((m) => m.id !== LIKE_MENU_ID).map((menu) => <option key={menu.id} value={menu.id}>{menu.parentId ? '↳ ' : ''}{menu.name}</option>)}</select></label><button className="button-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed" disabled={isSubmitting}>{isSubmitting ? '保存中...' : '保存网站'}</button></form></Dialog> }
