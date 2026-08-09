'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, FolderPlus, Globe2, Heart, LogIn, LogOut, PanelLeftClose, PanelLeftOpen, Pencil, Plus, Search, Trash2, UserPlus, X } from 'lucide-react'

const LIKE_MENU_ID = 'like'
type Menu = { id: string; name: string; parentId: string | null }
type Site = { id?: string; menuId: string; name: string; description: string; url: string; iconUrl: string }
type Navigation = { version: number; menus: Menu[]; sites: Site[] }
type Payload = { owner: string; authenticated: boolean; navigation: Navigation; favorites: string[] }

const emptyNavigation: Navigation = { version: 1, menus: [{ id: LIKE_MENU_ID, name: '收藏', parentId: null }], sites: [] }
const SITES_PER_PAGE = 24

async function api(path: string, init?: RequestInit) {
  const response = await fetch(path, { ...init, headers: { 'content-type': 'application/json', ...(init?.headers || {}) } })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || '请求失败。')
  return data
}

export default function NavigationApp({ initialData }: { initialData?: Payload }) {
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
    // Check client-side cookie to ensure authenticated state is not lost due to SSR ISR caching
    const hasSessionCookie = typeof document !== 'undefined' && document.cookie.includes('navigation_session=')
    if (!initialData || (hasSessionCookie && !initialData.authenticated)) {
      refresh()
    } else {
      setLoading(false)
    }
  }, [initialData])

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
  const selectedMenuIds = useMemo(() => {
    if (normalizedQuery) return new Set(menus.map((menu) => menu.id))
    if (!activeMenu) return new Set(menus.map((menu) => menu.id))
    const selected = menus.find((menu) => menu.id === activeMenu)
    if (!selected) return new Set<string>()
    return new Set([selected.id, ...menus.filter((menu) => menu.parentId === selected.id).map((menu) => menu.id)])
  }, [activeMenu, menus, normalizedQuery])
  const favoriteUrls = new Set(data.favorites)
  const visibleSites = data.navigation.sites.filter((site) => {
    const inScope = activeMenu === LIKE_MENU_ID ? favoriteUrls.has(site.url) : selectedMenuIds.has(site.menuId)
    return inScope && (!normalizedQuery || `${site.name} ${site.description} ${site.url}`.toLowerCase().includes(normalizedQuery))
  })
  const renderedSites = visibleSites.slice(0, visibleCount)
  const hasMoreSites = renderedSites.length < visibleSites.length

  useEffect(() => { setVisibleCount(SITES_PER_PAGE) }, [activeMenu, data.owner])
  useEffect(() => {
    const target = loadMoreRef.current
    if (!target || !hasMoreSites) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisibleCount((count) => count + SITES_PER_PAGE)
    }, { rootMargin: '320px' })
    observer.observe(target)
    return () => observer.disconnect()
  }, [hasMoreSites, renderedSites.length])

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
      fetch('/api/revalidate', { method: 'POST' }).catch(() => {})
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

  return (
    <main className="min-h-screen bg-[#090b10] text-slate-100 font-sans">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(37,99,235,.12),transparent_27%),radial-gradient(circle_at_100%_100%,rgba(124,58,237,.08),transparent_25%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-[1680px] flex-col px-3 py-3 md:px-5 md:py-4">
        {/* Header */}
        <header className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl border border-white/[.08] bg-[#11141b]/90 px-4 py-2.5 backdrop-blur-xl md:flex-nowrap">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-md shadow-blue-500/20">
              <img src="/orbit-logo.svg" alt="Orbit" className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-semibold tracking-tight leading-none">Orbit</p>
              <p className="text-[11px] text-slate-400 mt-1">{data.authenticated ? `${data.owner} 的私有导航` : '精选网址导航'}</p>
            </div>
          </div>
          <form className="order-3 flex w-full max-w-xl overflow-hidden rounded-xl border border-white/10 bg-black/20 focus-within:border-blue-400/60 lg:order-none lg:flex-1" onSubmit={(event) => { event.preventDefault(); if (searchScope === 'google' && searchQuery.trim()) window.location.assign(`https://www.google.com/search?q=${encodeURIComponent(searchQuery.trim())}`) }}>
            <div className="grid place-items-center px-3 text-slate-500"><Search size={16} /></div>
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={searchScope === 'site' ? '搜索你的导航…' : '使用 Google 搜索…'} className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-slate-600" />
            <select value={searchScope} onChange={(event) => setSearchScope(event.target.value as 'site' | 'google')} className="border-l border-white/10 bg-white/[.04] px-3 text-xs text-slate-300 outline-none"><option value="site">站内搜索</option><option value="google">Google</option></select>
          </form>
          <div className="flex items-center gap-2">
            {data.authenticated ? (
              <>
                <button onClick={() => setEditMode(!editMode)} className="icon-button" title={editMode ? "退出编辑模式" : "进入编辑模式"}>{editMode ? '✏️' : '📝'}</button>
                <button onClick={async () => { await api('/api/auth/logout', { method: 'POST' }); setData({ owner: 'admin', authenticated: false, navigation: emptyNavigation, favorites: [] }); setEditMode(false); refresh() }} className="icon-button" title="退出登录">🚪</button>
              </>
            ) : (
              <button onClick={() => setAuthMode(true)} className="icon-button" title="登录">🔑</button>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-white/[.08] bg-[#0d1016] shadow-2xl shadow-black/25 lg:flex-row">
          {/* Sidebar */}
          <aside className={`w-full shrink-0 border-b border-white/[.08] bg-[#10131a] p-3 transition-all duration-300 lg:border-b-0 lg:border-r ${sidebarCollapsed ? 'hidden lg:block lg:w-0 lg:overflow-hidden lg:border-r-0 lg:p-0' : 'lg:w-56'}`}>
            <div className="mb-3 flex items-center justify-between px-1.5">
              <div className="flex items-center gap-2">
                <button
                  title={sidebarCollapsed ? '展开分类' : '收起分类'}
                  onClick={() => setSidebarCollapsed((value) => !value)}
                  className="icon-button p-1 text-slate-400 hover:text-slate-200"
                >
                  {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                </button>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400/80">导航分类</span>
              </div>
              {data.authenticated && editMode && (
                <button title="添加分类" disabled={isSubmitting} onClick={() => setMenuEditor({ name: '', parentId: null })} className="icon-button p-1 text-xs disabled:opacity-50">➕</button>
              )}
            </div>

            <nav className="space-y-1">
              {roots.map((root) => {
                const children = menus.filter((menu) => menu.parentId === root.id);
                const open = expanded.includes(root.id);
                const isRootActive = activeMenu === root.id;
                const isLike = root.id === LIKE_MENU_ID;

                return (
                  <div key={root.id} className="space-y-0.5">
                    <div
                      className={`group relative flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer ${
                        isRootActive
                          ? 'bg-gradient-to-r from-blue-600/25 via-blue-500/15 to-violet-600/10 text-white font-semibold border border-blue-500/30 shadow-sm shadow-blue-500/10'
                          : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                      }`}
                      onClick={() => setActiveMenu(root.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {children.length > 0 ? (
                          <button
                            type="button"
                            className="p-0.5 rounded text-slate-400 hover:bg-white/10 hover:text-slate-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpanded((items) =>
                                items.includes(root.id) ? items.filter((id) => id !== root.id) : [...items, root.id]
                              );
                            }}
                          >
                            {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                          </button>
                        ) : (
                          <span className="w-3.5 shrink-0" />
                        )}

                        {isLike ? (
                          <Heart size={13} className="fill-rose-500 text-rose-500 shrink-0" />
                        ) : (
                          <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${isRootActive ? 'bg-blue-400' : 'bg-slate-500 group-hover:bg-blue-400'}`} />
                        )}

                        <span className="truncate flex-1">{root.name}</span>
                      </div>

                      {data.authenticated && editMode && !isLike && (
                        <div className="hidden items-center gap-1 pr-1 group-hover:flex">
                          <button title="添加子分类" disabled={isSubmitting} className="icon-button p-0.5 text-[10px]" onClick={(e) => { e.stopPropagation(); setMenuEditor({ name: '', parentId: root.id }); }}>➕</button>
                          <button title="编辑分类" disabled={isSubmitting} className="icon-button p-0.5 text-[10px]" onClick={(e) => { e.stopPropagation(); setMenuEditor({ id: root.id, name: root.name }); }}>✏️</button>
                          <button title="删除分类" disabled={isSubmitting} className="icon-button p-0.5 text-[10px] text-rose-300" onClick={(e) => { e.stopPropagation(); deleteItem('menu', root.id); }}>🗑️</button>
                        </div>
                      )}
                    </div>

                    {open && children.length > 0 && (
                      <div className="ml-4 pl-2 border-l border-white/10 space-y-0.5 mt-0.5">
                        {children.map((child) => {
                          const isChildActive = activeMenu === child.id;
                          return (
                            <div
                              key={child.id}
                              className={`group flex items-center justify-between rounded-lg px-2 py-1 text-xs transition-all cursor-pointer ${
                                isChildActive
                                  ? 'bg-blue-500/20 text-blue-200 font-semibold border-l-2 border-blue-400 pl-2'
                                  : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-200'
                              }`}
                              onClick={() => setActiveMenu(child.id)}
                            >
                              <span className="truncate flex-1">{child.name}</span>
                              {data.authenticated && editMode && (
                                <div className="hidden items-center gap-1 pr-1 group-hover:flex">
                                  <button title="编辑分类" disabled={isSubmitting} className="icon-button p-0.5 text-[10px]" onClick={(e) => { e.stopPropagation(); setMenuEditor({ id: child.id, name: child.name }); }}>✏️</button>
                                  <button title="删除分类" disabled={isSubmitting} className="icon-button p-0.5 text-[10px] text-rose-300" onClick={(e) => { e.stopPropagation(); deleteItem('menu', child.id); }}>🗑️</button>
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
          <section className="min-w-0 flex-1 p-4 md:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {sidebarCollapsed && (
                  <button
                    title="展开导航分类"
                    onClick={() => setSidebarCollapsed(false)}
                    className="hidden lg:flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/10 hover:text-white transition-all shadow-sm"
                  >
                    <PanelLeftOpen size={14} />
                    <span>展开分类</span>
                  </button>
                )}
                <h1 className="text-2xl font-bold tracking-tight md:text-3xl text-slate-100">
                  {activeMenu ? menus.find((menu) => menu.id === activeMenu)?.name : '全部网站'}
                </h1>
              </div>
              {data.authenticated && editMode && (
                <button title="添加网站" disabled={isSubmitting} className="button-primary text-xs py-1.5 px-3 disabled:opacity-50" onClick={() => setSiteEditor({ menuId: activeMenu && activeMenu !== LIKE_MENU_ID ? activeMenu : menus.find(m => m.id !== LIKE_MENU_ID)?.id || '', name: '', description: '', url: '' })}>➕ 添加网站</button>
              )}
            </div>

            {loading ? (
              <div className="grid place-items-center py-24 text-sm text-slate-400">正在加载你的导航…</div>
            ) : visibleSites.length ? (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {renderedSites.map((site) => {
                    const isFav = favoriteUrls.has(site.url)
                    const isPending = pendingFavs.has(site.url)
                    return (
                      <article key={site.id} className="group relative break-inside-avoid rounded-xl border border-white/10 bg-gradient-to-b from-white/[.06] to-white/[.02] p-3.5 transition hover:-translate-y-0.5 hover:border-blue-400/40 hover:shadow-lg hover:shadow-blue-950/30">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggleFavorite(site); }}
                          className={`absolute top-2.5 right-2.5 z-10 grid h-6 w-6 place-items-center rounded-md bg-black/50 border border-white/10 backdrop-blur-sm opacity-0 group-hover:opacity-100 hover:scale-110 hover:bg-black/80 transition-all ${isPending ? 'cursor-wait opacity-50' : 'cursor-pointer'}`}
                          title={isFav ? '取消收藏' : '加入收藏'}
                        >
                          <Heart
                            size={13}
                            className={isFav ? 'fill-rose-500 text-rose-500' : 'text-slate-400 hover:text-rose-400'}
                          />
                        </button>
                        <a href={site.url} target="_blank" rel="noreferrer" className="block">
                          <div className="mb-2 flex items-center justify-between pr-6">
                            <div className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-white/10">
                              <img src={site.iconUrl.startsWith('/') ? `/api/icon?url=${encodeURIComponent(site.iconUrl)}` : site.iconUrl} alt="" loading="lazy" className="h-full w-full object-contain p-1" onError={(event) => { event.currentTarget.style.display = 'none' }} />
                            </div>
                            <span className="max-w-[60%] truncate text-[11px] font-medium text-slate-500">{new URL(site.url).host}</span>
                          </div>
                          <h2 className="text-sm font-semibold tracking-tight text-slate-100 line-clamp-1">{site.name}</h2>
                          <p className="mt-1 line-clamp-2 min-h-7 text-xs leading-4 text-slate-400">{site.description}</p>
                        </a>
                        {data.authenticated && editMode && (
                          <div className="mt-2.5 flex gap-1.5 border-t border-white/10 pt-2">
                            <button title="编辑网站" disabled={isSubmitting} className="icon-button text-[11px] p-1 disabled:opacity-50" onClick={() => setSiteEditor(site)}>✏️</button>
                            <button title="删除网站" disabled={isSubmitting} className="icon-button text-[11px] p-1 text-rose-300 disabled:opacity-50" onClick={() => site.id && deleteItem('site', site.id)}>🗑️</button>
                          </div>
                        )}
                      </article>
                    )
                  })}
                </div>
                {hasMoreSites && <div ref={loadMoreRef} className="grid h-16 place-items-center text-xs text-slate-500"><span className="rounded-full border border-white/10 bg-white/[.03] px-3 py-1">正在加载更多网站…</span></div>}
              </>
            ) : (
              <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-white/15 bg-white/[.02] text-center">
                <div>
                  <Globe2 className="mx-auto mb-3 text-slate-600" size={28} />
                  <p className="font-medium text-slate-300">{activeMenu === LIKE_MENU_ID ? '暂无收藏网站' : '这里还没有网站'}</p>
                  <p className="mt-1 text-xs text-slate-500">{activeMenu === LIKE_MENU_ID ? '在任意网站卡片右上角点击爱心图标即可快速添加到收藏分类。' : data.authenticated ? '添加一个网站开始建设这个导航分类。' : '登录以创建你自己的导航。'}</p>
                </div>
              </div>
            )}
          </section>
        </div>{notice && <div className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-slate-900 px-4 py-2 text-sm shadow-xl z-40">{notice}<button className="ml-3 text-slate-400" onClick={() => setNotice('')}><X size={14} /></button></div>}
      </div>
      {authMode && <AuthDialog onClose={() => setAuthMode(false)} onDone={() => { setAuthMode(false); refresh() }} />}
      {menuEditor && <MenuDialog value={menuEditor} isSubmitting={isSubmitting} onClose={() => setMenuEditor(null)} onSave={(name) => mutate(menuEditor.id ? { action: 'update-menu', id: menuEditor.id, name } : { action: 'create-menu', parentId: menuEditor.parentId, name })} />}
      {siteEditor && <SiteDialog value={siteEditor} menus={menus} isSubmitting={isSubmitting} onClose={() => setSiteEditor(null)} onSave={(site) => mutate(siteEditor.id ? { action: 'update-site', id: siteEditor.id, ...site } : { action: 'create-site', ...site })} />}
    </main>
  )
}

function Dialog({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) { return <div className="fixed inset-0 z-30 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#11131a] p-6 shadow-2xl"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">{title}</h2><button className="icon-button" onClick={onClose}><X size={18} /></button></div>{children}</div></div> }
function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) { return <label className="block text-sm text-slate-300">{label}<input {...props} className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm outline-none placeholder:text-slate-600 focus:border-blue-400 disabled:opacity-50" /></label> }
function AuthDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) { const [error, setError] = useState(''); const [loading, setLoading] = useState(false); const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (loading) return; setLoading(true); setError(''); const form = new FormData(event.currentTarget); try { await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: form.get('username'), password: form.get('password') }) }); onDone() } catch (error) { setError(error instanceof Error ? error.message : '无法继续。') } finally { setLoading(false) } }; return <Dialog title="欢迎回来" onClose={onClose}><form className="space-y-4" onSubmit={submit}><Field label="用户名" name="username" placeholder="例如：zhang_san" required disabled={loading} /><Field label="密码" type="password" name="password" placeholder="至少 8 个字符" minLength={8} required disabled={loading} />{error && <p className="text-sm text-rose-300">{error}</p>}<button className="button-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed" type="submit" disabled={loading}>{loading ? '处理中...' : '登录'}</button></form></Dialog> }
function MenuDialog({ value, isSubmitting, onClose, onSave }: { value: { name: string }; isSubmitting?: boolean; onClose: () => void; onSave: (name: string) => void }) { const [name, setName] = useState(value.name); return <Dialog title={value.name ? '重命名分类' : '新建分类'} onClose={onClose}><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (!isSubmitting) onSave(name) }}><Field label="分类名称" value={name} onChange={(event) => setName(event.target.value)} required autoFocus disabled={isSubmitting} /><button className="button-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed" disabled={isSubmitting}>{isSubmitting ? '保存中...' : '保存分类'}</button></form></Dialog> }
function SiteDialog({ value, menus, isSubmitting, onClose, onSave }: { value: Partial<Site>; menus: Menu[]; isSubmitting?: boolean; onClose: () => void; onSave: (site: Partial<Site>) => void }) { const [site, setSite] = useState(value); const update = (key: keyof Site, value: string) => setSite((current) => ({ ...current, [key]: value })); return <Dialog title={site.id ? '编辑网站' : '添加网站'} onClose={onClose}><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (!isSubmitting) onSave(site) }}><Field label="名称" value={site.name || ''} onChange={(event) => update('name', event.target.value)} required disabled={isSubmitting} /><Field label="描述" value={site.description || ''} onChange={(event) => update('description', event.target.value)} required disabled={isSubmitting} /><Field label="网站链接" type="url" value={site.url || ''} onChange={(event) => update('url', event.target.value)} placeholder="https://example.com" required disabled={isSubmitting} /><Field label="图标链接 (可选，直接使用此 Icon)" type="url" value={site.iconUrl || ''} onChange={(event) => update('iconUrl', event.target.value)} placeholder="https://example.com/favicon.ico" disabled={isSubmitting} /><label className="block text-sm text-slate-300">所属分类<select value={site.menuId || ''} onChange={(event) => update('menuId', event.target.value)} disabled={isSubmitting} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#171923] px-3 py-2.5 text-sm outline-none focus:border-blue-400 disabled:opacity-50">{menus.filter((m) => m.id !== LIKE_MENU_ID).map((menu) => <option key={menu.id} value={menu.id}>{menu.parentId ? '↳ ' : ''}{menu.name}</option>)}</select></label><button className="button-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed" disabled={isSubmitting}>{isSubmitting ? '保存中...' : '保存网站'}</button></form></Dialog> }
