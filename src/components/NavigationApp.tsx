'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, FolderPlus, Globe2, LogIn, LogOut, PanelLeftClose, PanelLeftOpen, Pencil, Plus, Search, Trash2, UserPlus, X } from 'lucide-react'

type Menu = { id: string; name: string; parentId: string | null }
type Site = { id: string; menuId: string; name: string; description: string; url: string; iconUrl: string }
type Navigation = { version: number; menus: Menu[]; sites: Site[] }
type Payload = { owner: string; authenticated: boolean; navigation: Navigation }

const emptyNavigation: Navigation = { version: 1, menus: [], sites: [] }
const SITES_PER_PAGE = 12

async function api(path: string, init?: RequestInit) {
  const response = await fetch(path, { ...init, headers: { 'content-type': 'application/json', ...(init?.headers || {}) } })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Request failed.')
  return data
}

export default function NavigationApp() {
  const [data, setData] = useState<Payload>({ owner: 'admin', authenticated: false, navigation: emptyNavigation })
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [authMode, setAuthMode] = useState<'login' | 'register' | null>(null)
  const [menuEditor, setMenuEditor] = useState<{ id?: string; parentId?: string | null; name: string } | null>(null)
  const [siteEditor, setSiteEditor] = useState<Partial<Site> | null>(null)
  const [visibleCount, setVisibleCount] = useState(SITES_PER_PAGE)
  const [searchScope, setSearchScope] = useState<'site' | 'google'>('site')
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const refresh = async () => {
    setLoading(true)
    try {
      const result = await api('/api/navigation') as Payload
      setData(result)
      const first = result.navigation.menus.find((menu) => !menu.parentId)
      setActiveMenu((current) => current && result.navigation.menus.some((menu) => menu.id === current) ? current : first?.id || null)
      setExpanded(result.navigation.menus.filter((menu) => !menu.parentId).map((menu) => menu.id))
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to load navigation.')
    } finally { setLoading(false) }
  }

  useEffect(() => { refresh() }, [])

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
  const visibleSites = data.navigation.sites.filter((site) => selectedMenuIds.has(site.menuId) && (!normalizedQuery || `${site.name} ${site.description} ${site.url}`.toLowerCase().includes(normalizedQuery)))
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
    try {
      const result = await api('/api/navigation', { method: 'POST', body: JSON.stringify(body) }) as Payload
      setData(result)
      setNotice('Saved.')
      setMenuEditor(null)
      setSiteEditor(null)
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to save.') }
  }

  const deleteItem = (kind: 'menu' | 'site', id: string) => {
    if (window.confirm(`Delete this ${kind} and its related items?`)) mutate({ action: `delete-${kind}`, id })
  }

  return (
    <main className="min-h-screen bg-[#090b10] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(37,99,235,.14),transparent_27%),radial-gradient(circle_at_100%_100%,rgba(124,58,237,.08),transparent_25%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-[1680px] flex-col px-3 py-3 md:px-5 md:py-5">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl border border-white/[.08] bg-[#11141b]/90 px-3 py-2 backdrop-blur-xl md:flex-nowrap">
          <div className="flex items-center gap-3"><button title={sidebarCollapsed ? 'Expand menu' : 'Collapse menu'} onClick={() => setSidebarCollapsed((value) => !value)} className="icon-button hidden lg:grid">{sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button><div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-blue-400 to-violet-600 shadow-lg shadow-blue-500/25"><Globe2 size={21} /></div><div><p className="text-lg font-semibold tracking-tight">Orbit</p><p className="text-xs text-slate-400">{data.authenticated ? `${data.owner}'s private navigation` : 'admin’s curated navigation'}</p></div></div>
          <form className="order-3 flex w-full max-w-xl overflow-hidden rounded-xl border border-white/10 bg-black/20 focus-within:border-blue-400/60 lg:order-none lg:flex-1" onSubmit={(event) => { event.preventDefault(); if (searchScope === 'google' && searchQuery.trim()) window.location.assign(`https://www.google.com/search?q=${encodeURIComponent(searchQuery.trim())}`) }}><div className="grid place-items-center px-3 text-slate-500"><Search size={17} /></div><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={searchScope === 'site' ? 'Search your navigation…' : 'Search with Google…'} className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-slate-600" /><select value={searchScope} onChange={(event) => setSearchScope(event.target.value as 'site' | 'google')} className="border-l border-white/10 bg-white/[.04] px-3 text-xs text-slate-300 outline-none"><option value="site">Search this site</option><option value="google">Google</option></select></form>
          <div className="flex items-center gap-2">
            {data.authenticated ? <><span className="hidden rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-300 sm:inline">Editing enabled</span><button onClick={async () => { await api('/api/auth/logout', { method: 'POST' }); setData({ owner: 'admin', authenticated: false, navigation: emptyNavigation }); refresh() }} className="button-ghost"><LogOut size={16} /> Sign out</button></> : <><button onClick={() => setAuthMode('login')} className="button-ghost"><LogIn size={16} /> Sign in</button><button onClick={() => setAuthMode('register')} className="button-primary"><UserPlus size={16} /> Create space</button></>}
          </div>
        </header>

        <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-white/[.08] bg-[#0d1016] shadow-2xl shadow-black/25 lg:flex-row">
          <aside className={`w-full shrink-0 border-b border-white/[.08] bg-[#12161e] p-3 transition-[width,padding] duration-300 lg:border-b-0 lg:border-r lg:bg-[#10141b] ${sidebarCollapsed ? 'hidden lg:block lg:w-0 lg:overflow-hidden lg:border-r-0 lg:p-0' : 'lg:w-60'}`}>
            <div className="mb-4 flex items-center justify-between px-2"><span className="text-xs font-semibold uppercase tracking-[.18em] text-slate-500">Collections</span>{data.authenticated && <button title="Add collection" onClick={() => setMenuEditor({ name: '', parentId: null })} className="icon-button"><FolderPlus size={17} /></button>}</div>
            <nav className="space-y-1">{roots.map((root) => { const children = menus.filter((menu) => menu.parentId === root.id); const open = expanded.includes(root.id); return <div key={root.id}><div className={`group flex items-center gap-1 rounded-lg ${activeMenu === root.id ? 'bg-blue-500/15 text-blue-100' : 'text-slate-300 hover:bg-white/5'}`}><button className="p-2 text-slate-500" onClick={() => setExpanded((items) => items.includes(root.id) ? items.filter((id) => id !== root.id) : [...items, root.id])}>{children.length ? open ? <ChevronDown size={15} /> : <ChevronRight size={15} /> : <span className="block w-[15px]" />}</button><button className="flex-1 px-1 py-2 text-left text-sm font-medium" onClick={() => setActiveMenu(root.id)}>{root.name}</button>{data.authenticated && <div className="hidden gap-1 pr-1 group-hover:flex"><button title="Add sub-menu" className="icon-button" onClick={() => setMenuEditor({ name: '', parentId: root.id })}><Plus size={14} /></button><button title="Edit" className="icon-button" onClick={() => setMenuEditor({ id: root.id, name: root.name })}><Pencil size={13} /></button><button title="Delete" className="icon-button text-rose-300" onClick={() => deleteItem('menu', root.id)}><Trash2 size={13} /></button></div>}</div>{open && children.map((child) => <div key={child.id} className={`group ml-6 flex items-center rounded-lg ${activeMenu === child.id ? 'bg-blue-500/10 text-blue-100' : 'text-slate-400 hover:bg-white/5'}`}><button onClick={() => setActiveMenu(child.id)} className="flex-1 px-3 py-2 text-left text-sm">{child.name}</button>{data.authenticated && <div className="hidden gap-1 pr-1 group-hover:flex"><button className="icon-button" onClick={() => setMenuEditor({ id: child.id, name: child.name })}><Pencil size={13} /></button><button className="icon-button text-rose-300" onClick={() => deleteItem('menu', child.id)}><Trash2 size={13} /></button></div>}</div>)}</div>})}</nav>
          </aside>
          <section className="min-w-0 flex-1 p-5 md:p-8"><div className="mb-8 flex items-end justify-between gap-4"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-blue-300">Your launchpad</p><h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{activeMenu ? menus.find((menu) => menu.id === activeMenu)?.name : 'All favorites'}</h1><p className="mt-2 text-sm text-slate-400">A considered set of places worth returning to.</p></div>{data.authenticated && <button className="button-primary" onClick={() => setSiteEditor({ menuId: activeMenu || menus[0]?.id || '', name: '', description: '', url: '' })}><Plus size={16} /> Add website</button>}</div>
            {loading ? <div className="grid place-items-center py-28 text-slate-400">Loading your navigation…</div> : visibleSites.length ? <><div className="columns-1 gap-4 sm:columns-2 xl:columns-3">{renderedSites.map((site) => <article key={site.id} className="group relative mb-4 break-inside-avoid rounded-2xl border border-white/10 bg-gradient-to-b from-white/[.07] to-white/[.025] p-5 transition hover:-translate-y-0.5 hover:border-blue-400/30 hover:shadow-xl hover:shadow-blue-950/20"><a href={site.url} target="_blank" rel="noreferrer" className="block"><div className="mb-5 flex items-start justify-between"><div className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-slate-200/80 via-slate-400/40 to-slate-700/70 animate-pulse"><img src={`/api/icon?url=${encodeURIComponent(site.iconUrl)}`} alt="" loading="lazy" className="h-full w-full bg-white p-1.5" onLoad={(event) => event.currentTarget.parentElement?.classList.remove('animate-pulse')} onError={(event) => { event.currentTarget.style.display = 'none' }} /></div><span className="max-w-[55%] truncate text-xs text-slate-500">{new URL(site.url).host}</span></div><h2 className="font-semibold text-slate-100">{site.name}</h2><p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-400">{site.description}</p></a>{data.authenticated && <div className="mt-4 flex gap-2 border-t border-white/10 pt-3"><button className="button-ghost text-xs" onClick={() => setSiteEditor(site)}><Pencil size={14} /> Edit</button><button className="button-ghost text-xs text-rose-300" onClick={() => deleteItem('site', site.id)}><Trash2 size={14} /> Delete</button></div>}</article>)}</div>{hasMoreSites && <div ref={loadMoreRef} className="grid h-20 place-items-center text-sm text-slate-500"><span className="rounded-full border border-white/10 bg-white/[.03] px-3 py-1.5">Loading more sites…</span></div>}</> : <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-white/15 bg-white/[.02] text-center"><div><Globe2 className="mx-auto mb-3 text-slate-600" size={32} /><p className="font-medium text-slate-300">No websites here yet</p><p className="mt-1 text-sm text-slate-500">{data.authenticated ? 'Add a site to begin building this collection.' : 'Sign in to create your own navigation.'}</p></div></div>}
          </section>
        </div>{notice && <div className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-slate-900 px-4 py-2 text-sm shadow-xl">{notice}<button className="ml-3 text-slate-400" onClick={() => setNotice('')}><X size={14} /></button></div>}
      </div>
      {authMode && <AuthDialog mode={authMode} onClose={() => setAuthMode(null)} onDone={() => { setAuthMode(null); refresh() }} />}
      {menuEditor && <MenuDialog value={menuEditor} onClose={() => setMenuEditor(null)} onSave={(name) => mutate(menuEditor.id ? { action: 'update-menu', id: menuEditor.id, name } : { action: 'create-menu', parentId: menuEditor.parentId, name })} />}
      {siteEditor && <SiteDialog value={siteEditor} menus={menus} onClose={() => setSiteEditor(null)} onSave={(site) => mutate(siteEditor.id ? { action: 'update-site', id: siteEditor.id, ...site } : { action: 'create-site', ...site })} />}
    </main>
  )
}

function Dialog({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) { return <div className="fixed inset-0 z-30 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#11131a] p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-semibold">{title}</h2><button className="icon-button" onClick={onClose}><X size={18} /></button></div>{children}</div></div> }
function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) { return <label className="block text-sm text-slate-300">{label}<input {...props} className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm outline-none placeholder:text-slate-600 focus:border-blue-400" /></label> }
function AuthDialog({ mode, onClose, onDone }: { mode: 'login' | 'register'; onClose: () => void; onDone: () => void }) { const [error, setError] = useState(''); const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); try { await api(`/api/auth/${mode}`, { method: 'POST', body: JSON.stringify({ username: form.get('username'), password: form.get('password') }) }); onDone() } catch (error) { setError(error instanceof Error ? error.message : 'Unable to continue.') } }; return <Dialog title={mode === 'login' ? 'Welcome back' : 'Create your space'} onClose={onClose}><form className="space-y-4" onSubmit={submit}><Field label="Username" name="username" placeholder="your_name" required /><Field label="Password" type="password" name="password" placeholder="At least 8 characters" minLength={8} required />{error && <p className="text-sm text-rose-300">{error}</p>}<button className="button-primary w-full justify-center" type="submit">{mode === 'login' ? 'Sign in' : 'Create navigation'}</button></form></Dialog> }
function MenuDialog({ value, onClose, onSave }: { value: { name: string }; onClose: () => void; onSave: (name: string) => void }) { const [name, setName] = useState(value.name); return <Dialog title={value.name ? 'Rename menu' : 'New menu'} onClose={onClose}><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); onSave(name) }}><Field label="Menu name" value={name} onChange={(event) => setName(event.target.value)} required autoFocus /><button className="button-primary w-full justify-center">Save menu</button></form></Dialog> }
function SiteDialog({ value, menus, onClose, onSave }: { value: Partial<Site>; menus: Menu[]; onClose: () => void; onSave: (site: Partial<Site>) => void }) { const [site, setSite] = useState(value); const update = (key: keyof Site, value: string) => setSite((current) => ({ ...current, [key]: value })); return <Dialog title={site.id ? 'Edit website' : 'Add website'} onClose={onClose}><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); onSave(site) }}><Field label="Name" value={site.name || ''} onChange={(event) => update('name', event.target.value)} required /><Field label="Description" value={site.description || ''} onChange={(event) => update('description', event.target.value)} required /><Field label="Website URL" type="url" value={site.url || ''} onChange={(event) => update('url', event.target.value)} placeholder="https://example.com" required /><label className="block text-sm text-slate-300">Menu<select value={site.menuId || ''} onChange={(event) => update('menuId', event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#171923] px-3 py-2.5 text-sm outline-none focus:border-blue-400">{menus.map((menu) => <option key={menu.id} value={menu.id}>{menu.parentId ? '↳ ' : ''}{menu.name}</option>)}</select></label><button className="button-primary w-full justify-center">Save website</button></form></Dialog> }
