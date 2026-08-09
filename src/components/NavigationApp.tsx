'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, FolderPlus, Globe2, Heart, LogIn, LogOut, PanelLeftClose, PanelLeftOpen, Pencil, Plus, Search, Trash2, UserPlus, X } from 'lucide-react'

const LIKE_MENU_ID = 'like'
type Menu = { id: string; name: string; parentId: string | null }
type Site = { id?: string; menuId: string; name: string; description: string; url: string; iconUrl: string }
type Navigation = { version: number; menus: Menu[]; sites: Site[] }
type Payload = { owner: string; authenticated: boolean; navigation: Navigation; favorites: string[] }

const emptyNavigation: Navigation = { version: 1, menus: [{ id: LIKE_MENU_ID, name: '收藏', parentId: null }], sites: [] }
const SITES_PER_PAGE = 12

async function api(path: string, init?: RequestInit) {
  const response = await fetch(path, { ...init, headers: { 'content-type': 'application/json', ...(init?.headers || {}) } })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || '请求失败。')
  return data
}

export default function NavigationApp() {
  const [data, setData] = useState<Payload>({ owner: 'admin', authenticated: false, navigation: emptyNavigation, favorites: [] })
  const [activeMenu, setActiveMenu] = useState<string | null>(LIKE_MENU_ID)
  const [expanded, setExpanded] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
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

  useEffect(() => { refresh() }, [])

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
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '无法保存。')
    } finally {
      setIsSubmitting(false)
    }
  }

  const deleteItem = (kind: 'menu' | 'site', id: string) => {
    if (isSubmitting) return
    if (id === LIKE_MENU_ID) {
      setNotice('“收藏”菜单不能删除。')
      return
    }
    if (window.confirm(`确定删除该${kind === 'menu' ? '菜单' : '网站'}及其关联内容？`)) mutate({ action: `delete-${kind}`, id })
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
    <main className="min-h-screen bg-[#090b10] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(37,99,235,.14),transparent_27%),radial-gradient(circle_at_100%_100%,rgba(124,58,237,.08),transparent_25%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-[1680px] flex-col px-3 py-3 md:px-5 md:py-5">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl border border-white/[.08] bg-[#11141b]/90 px-3 py-2 backdrop-blur-xl md:flex-nowrap">
          <div className="flex items-center gap-3"><button title={sidebarCollapsed ? '展开菜单' : '收起菜单'} onClick={() => setSidebarCollapsed((value) => !value)} className="icon-button hidden lg:grid">{sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button><div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-blue-400 to-violet-600 shadow-lg shadow-blue-500/25"><Globe2 size={21} /></div><div><p className="text-lg font-semibold tracking-tight">Orbit</p><p className="text-xs text-slate-400">{data.authenticated ? `${data.owner} 的私有导航` : '管理员的精选导航'}</p></div></div>
          <form className="order-3 flex w-full max-w-xl overflow-hidden rounded-xl border border-white/10 bg-black/20 focus-within:border-blue-400/60 lg:order-none lg:flex-1" onSubmit={(event) => { event.preventDefault(); if (searchScope === 'google' && searchQuery.trim()) window.location.assign(`https://www.google.com/search?q=${encodeURIComponent(searchQuery.trim())}`) }}><div className="grid place-items-center px-3 text-slate-500"><Search size={17} /></div><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={searchScope === 'site' ? '搜索你的导航…' : '使用 Google 搜索…'} className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-slate-600" /><select value={searchScope} onChange={(event) => setSearchScope(event.target.value as 'site' | 'google')} className="border-l border-white/10 bg-white/[.04] px-3 text-xs text-slate-300 outline-none"><option value="site">在此网站内搜索</option><option value="google">Google</option></select></form>
           <div className="flex items-center gap-2">
             {data.authenticated ? <><button onClick={() => setEditMode(!editMode)} className="icon-button" title={editMode ? "退出编辑模式" : "进入编辑模式"}>{editMode ? '✏️' : '📝'}</button><button onClick={async () => { await api('/api/auth/logout', { method: 'POST' }); setData({ owner: 'admin', authenticated: false, navigation: emptyNavigation, favorites: [] }); setEditMode(false); refresh() }} className="icon-button" title="退出登录">🚪</button></> : <button onClick={() => setAuthMode(true)} className="icon-button" title="登录">🔑</button>}
           </div>
        </header>

        <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-white/[.08] bg-[#0d1016] shadow-2xl shadow-black/25 lg:flex-row">
          <aside className={`w-full shrink-0 border-b border-white/[.08] bg-[#12161e] p-3 transition-[width,padding] duration-300 lg:border-b-0 lg:border-r lg:bg-[#10141b] ${sidebarCollapsed ? 'hidden lg:block lg:w-0 lg:overflow-hidden lg:border-r-0 lg:p-0' : 'lg:w-60'}`}>
             <div className="mb-4 flex items-center justify-between px-2"><span className="text-xs font-semibold uppercase tracking-[.18em] text-slate-500">收藏集</span>{data.authenticated && editMode && <button title="添加收藏集" disabled={isSubmitting} onClick={() => setMenuEditor({ name: '', parentId: null })} className="icon-button disabled:opacity-50">➕</button>}</div>
             <nav className="space-y-1">{roots.map((root) => { const children = menus.filter((menu) => menu.parentId === root.id); const open = expanded.includes(root.id); return <div key={root.id}><div className={`group flex items-center gap-1 rounded-lg ${activeMenu === root.id ? 'bg-blue-500/15 text-blue-100' : 'text-slate-300 hover:bg-white/5'}`}><button className="p-2 text-slate-500" onClick={() => setExpanded((items) => items.includes(root.id) ? items.filter((id) => id !== root.id) : [...items, root.id])}>{children.length ? open ? <ChevronDown size={15} /> : <ChevronRight size={15} /> : <span className="block w-[15px]" />}</button><button className="flex-1 px-1 py-2 text-left text-sm font-medium flex items-center gap-1.5" onClick={() => setActiveMenu(root.id)}>{root.id === LIKE_MENU_ID && <Heart size={14} className="fill-rose-500 text-rose-500 inline" />}{root.name}</button>{data.authenticated && editMode && root.id !== LIKE_MENU_ID && <div className="hidden gap-1 pr-1 group-hover:flex"><button title="添加子菜单" disabled={isSubmitting} className="icon-button" onClick={() => setMenuEditor({ name: '', parentId: root.id })}>➕</button><button title="编辑菜单" disabled={isSubmitting} className="icon-button" onClick={() => setMenuEditor({ id: root.id, name: root.name })}>✏️</button><button title="删除菜单" disabled={isSubmitting} className="icon-button text-rose-300" onClick={() => deleteItem('menu', root.id)}>🗑️</button></div>}</div>{open && children.map((child) => <div key={child.id} className={`group ml-6 flex items-center rounded-lg ${activeMenu === child.id ? 'bg-blue-500/10 text-blue-100' : 'text-slate-400 hover:bg-white/5'}`}><button onClick={() => setActiveMenu(child.id)} className="flex-1 px-3 py-2 text-left text-sm">{child.name}</button>{data.authenticated && editMode && <div className="hidden gap-1 pr-1 group-hover:flex"><button title="编辑菜单" disabled={isSubmitting} className="icon-button" onClick={() => setMenuEditor({ id: child.id, name: child.name })}>✏️</button><button title="删除菜单" disabled={isSubmitting} className="icon-button text-rose-300" onClick={() => deleteItem('menu', child.id)}>🗑️</button></div>}</div>)}</div>})}</nav>
          </aside>
           <section className="min-w-0 flex-1 p-5 md:p-8">
             <div className="mb-8 flex items-end justify-between gap-4">
               <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                 {activeMenu ? menus.find((menu) => menu.id === activeMenu)?.name : '全部收藏'}
               </h1>
               {data.authenticated && editMode && (
                 <button title="添加网站" disabled={isSubmitting} className="button-primary disabled:opacity-50" onClick={() => setSiteEditor({ menuId: activeMenu && activeMenu !== LIKE_MENU_ID ? activeMenu : menus.find(m => m.id !== LIKE_MENU_ID)?.id || '', name: '', description: '', url: '' })}>➕</button>
               )}
             </div>
             {loading ? (
               <div className="grid place-items-center py-28 text-slate-400">正在加载你的导航…</div>
             ) : visibleSites.length ? (
               <>
                 <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
                   {renderedSites.map((site) => {
                     const isFav = favoriteUrls.has(site.url)
                     const isPending = pendingFavs.has(site.url)
                     return (
                       <article key={site.id} className="group relative mb-4 break-inside-avoid rounded-2xl border border-white/10 bg-gradient-to-b from-white/[.07] to-white/[.025] p-5 transition hover:-translate-y-0.5 hover:border-blue-400/30 hover:shadow-xl hover:shadow-blue-950/20">
                         <button
                           type="button"
                           disabled={isPending}
                           onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggleFavorite(site); }}
                           className={`absolute top-3 right-3 z-10 grid h-7 w-7 place-items-center rounded-lg bg-black/40 border border-white/10 backdrop-blur-sm opacity-0 group-hover:opacity-100 hover:scale-110 hover:bg-black/70 transition-all ${isPending ? 'cursor-wait opacity-50' : 'cursor-pointer'}`}
                           title={isFav ? '取消收藏' : '加入收藏'}
                         >
                           <Heart
                             size={15}
                             className={isFav ? 'fill-rose-500 text-rose-500' : 'text-slate-400 hover:text-rose-400'}
                           />
                         </button>
                         <a href={site.url} target="_blank" rel="noreferrer" className="block">
                           <div className="mb-5 flex items-start justify-between pr-7">
                             <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-slate-200/80 via-slate-400/40 to-slate-700/70 animate-pulse">
                               <img src={`/api/icon?url=${encodeURIComponent(site.iconUrl)}`} alt="" loading="lazy" className="h-full w-full bg-white p-1.5" onLoad={(event) => event.currentTarget.parentElement?.classList.remove('animate-pulse')} onError={(event) => { event.currentTarget.style.display = 'none' }} />
                             </div>
                             <span className="max-w-[55%] truncate text-xs text-slate-500">{new URL(site.url).host}</span>
                           </div>
                           <h2 className="font-semibold text-slate-100">{site.name}</h2>
                           <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-400">{site.description}</p>
                         </a>
                         {data.authenticated && editMode && (
                           <div className="mt-4 flex gap-2 border-t border-white/10 pt-3">
                             <button title="编辑网站" disabled={isSubmitting} className="icon-button text-xs disabled:opacity-50" onClick={() => setSiteEditor(site)}>✏️</button>
                             <button title="删除网站" disabled={isSubmitting} className="icon-button text-xs text-rose-300 disabled:opacity-50" onClick={() => site.id && deleteItem('site', site.id)}>🗑️</button>
                           </div>
                         )}
                       </article>
                     )
                   })}
                 </div>
                 {hasMoreSites && <div ref={loadMoreRef} className="grid h-20 place-items-center text-sm text-slate-500"><span className="rounded-full border border-white/10 bg-white/[.03] px-3 py-1.5">正在加载更多网站…</span></div>}
               </>
             ) : (
               <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-white/15 bg-white/[.02] text-center">
                 <div>
                   <Globe2 className="mx-auto mb-3 text-slate-600" size={32} />
                   <p className="font-medium text-slate-300">{activeMenu === LIKE_MENU_ID ? '暂无收藏网站' : '这里还没有网站'}</p>
                   <p className="mt-1 text-sm text-slate-500">{activeMenu === LIKE_MENU_ID ? '在任意网站卡片右上角点击爱心图标即可快速添加到收藏菜单。' : data.authenticated ? '添加一个网站开始建设这个收藏集。' : '登录以创建你自己的导航。'}</p>
                 </div>
               </div>
             )}
           </section>
        </div>{notice && <div className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-slate-900 px-4 py-2 text-sm shadow-xl">{notice}<button className="ml-3 text-slate-400" onClick={() => setNotice('')}><X size={14} /></button></div>}
      </div>
      {authMode && <AuthDialog onClose={() => setAuthMode(false)} onDone={() => { setAuthMode(false); refresh() }} />}
      {menuEditor && <MenuDialog value={menuEditor} isSubmitting={isSubmitting} onClose={() => setMenuEditor(null)} onSave={(name) => mutate(menuEditor.id ? { action: 'update-menu', id: menuEditor.id, name } : { action: 'create-menu', parentId: menuEditor.parentId, name })} />}
      {siteEditor && <SiteDialog value={siteEditor} menus={menus} isSubmitting={isSubmitting} onClose={() => setSiteEditor(null)} onSave={(site) => mutate(siteEditor.id ? { action: 'update-site', id: siteEditor.id, ...site } : { action: 'create-site', ...site })} />}
    </main>
  )
}

function Dialog({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) { return <div className="fixed inset-0 z-30 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#11131a] p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-semibold">{title}</h2><button className="icon-button" onClick={onClose}><X size={18} /></button></div>{children}</div></div> }
function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) { return <label className="block text-sm text-slate-300">{label}<input {...props} className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm outline-none placeholder:text-slate-600 focus:border-blue-400 disabled:opacity-50" /></label> }
function AuthDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) { const [error, setError] = useState(''); const [loading, setLoading] = useState(false); const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (loading) return; setLoading(true); setError(''); const form = new FormData(event.currentTarget); try { await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: form.get('username'), password: form.get('password') }) }); onDone() } catch (error) { setError(error instanceof Error ? error.message : '无法继续。') } finally { setLoading(false) } }; return <Dialog title="欢迎回来" onClose={onClose}><form className="space-y-4" onSubmit={submit}><Field label="用户名" name="username" placeholder="例如：zhang_san" required disabled={loading} /><Field label="密码" type="password" name="password" placeholder="至少 8 个字符" minLength={8} required disabled={loading} />{error && <p className="text-sm text-rose-300">{error}</p>}<button className="button-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed" type="submit" disabled={loading}>{loading ? '处理中...' : '登录'}</button></form></Dialog> }
function MenuDialog({ value, isSubmitting, onClose, onSave }: { value: { name: string }; isSubmitting?: boolean; onClose: () => void; onSave: (name: string) => void }) { const [name, setName] = useState(value.name); return <Dialog title={value.name ? '重命名菜单' : '新建菜单'} onClose={onClose}><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (!isSubmitting) onSave(name) }}><Field label="菜单名称" value={name} onChange={(event) => setName(event.target.value)} required autoFocus disabled={isSubmitting} /><button className="button-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed" disabled={isSubmitting}>{isSubmitting ? '保存中...' : '保存菜单'}</button></form></Dialog> }
function SiteDialog({ value, menus, isSubmitting, onClose, onSave }: { value: Partial<Site>; menus: Menu[]; isSubmitting?: boolean; onClose: () => void; onSave: (site: Partial<Site>) => void }) { const [site, setSite] = useState(value); const update = (key: keyof Site, value: string) => setSite((current) => ({ ...current, [key]: value })); return <Dialog title={site.id ? '编辑网站' : '添加网站'} onClose={onClose}><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (!isSubmitting) onSave(site) }}><Field label="名称" value={site.name || ''} onChange={(event) => update('name', event.target.value)} required disabled={isSubmitting} /><Field label="描述" value={site.description || ''} onChange={(event) => update('description', event.target.value)} required disabled={isSubmitting} /><Field label="网站链接" type="url" value={site.url || ''} onChange={(event) => update('url', event.target.value)} placeholder="https://example.com" required disabled={isSubmitting} /><label className="block text-sm text-slate-300">所属菜单<select value={site.menuId || ''} onChange={(event) => update('menuId', event.target.value)} disabled={isSubmitting} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#171923] px-3 py-2.5 text-sm outline-none focus:border-blue-400 disabled:opacity-50">{menus.filter((m) => m.id !== LIKE_MENU_ID).map((menu) => <option key={menu.id} value={menu.id}>{menu.parentId ? '↳ ' : ''}{menu.name}</option>)}</select></label><button className="button-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed" disabled={isSubmitting}>{isSubmitting ? '保存中...' : '保存网站'}</button></form></Dialog> }
