import React from 'react'
import { LogIn, LogOut, PanelLeftClose, PanelLeftOpen, Pencil, RotateCw, Search, UserPlus } from 'lucide-react'

interface NavigationHeaderProps {
  ownerName: string
  authenticated: boolean
  searchQuery: string
  setSearchQuery: (query: string) => void
  searchScope: 'site' | 'google'
  setSearchScope: (scope: 'site' | 'google') => void
  editMode: boolean
  setEditMode: (mode: boolean) => void
  mobileNavOpen: boolean
  setMobileNavOpen: (open: boolean) => void
  onForceRefresh: () => void
  onLogout: () => void
  onOpenAuth: () => void
  allowRegister?: boolean
  onOpenRegister: () => void
}

export function NavigationHeader({
  ownerName,
  authenticated,
  searchQuery,
  setSearchQuery,
  searchScope,
  setSearchScope,
  editMode,
  setEditMode,
  mobileNavOpen,
  setMobileNavOpen,
  onForceRefresh,
  onLogout,
  onOpenAuth,
  allowRegister,
  onOpenRegister,
}: NavigationHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl bg-[#16161f]/75 px-4 py-3 shadow-[0_10px_40px_rgba(0,0,0,.4),inset_0_1px_0_rgba(255,255,255,.05)] backdrop-blur-xl md:flex-nowrap">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-400 to-violet-500 shadow-lg shadow-blue-500/30">
          <img src="/orbit-logo.svg" alt="Orbit" className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold tracking-tight leading-none text-white">Orbit</p>
          <p className="mt-1 text-[10px] text-slate-500">
            {authenticated ? `${ownerName} 的网站导航` : '精选网址导航'}
          </p>
        </div>
        <button
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          title={mobileNavOpen ? '收起分类' : '展开分类'}
          className="icon-button lg:hidden"
        >
          {mobileNavOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
        </button>
      </div>

      <form
        className="order-3 flex w-full max-w-xl items-center overflow-hidden rounded-full bg-black/30 px-3 shadow-[inset_0_1px_2px_rgba(0,0,0,.4)] ring-1 ring-inset ring-white/[.06] transition focus-within:ring-2 focus-within:ring-blue-400/50 lg:order-none lg:flex-1"
        onSubmit={(event) => {
          event.preventDefault()
          if (searchScope === 'google' && searchQuery.trim()) {
            window.location.assign(`https://www.google.com/search?q=${encodeURIComponent(searchQuery.trim())}`)
          }
        }}
      >
        <div className="grid place-items-center pr-2 text-slate-500">
          <Search size={14} />
        </div>
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={searchScope === 'site' ? '搜索你的导航…' : '使用 Google 搜索…'}
          className="min-w-0 flex-1 bg-transparent py-2 text-[13px] outline-none placeholder:text-slate-600"
        />
        <select
          value={searchScope}
          onChange={(event) => setSearchScope(event.target.value as 'site' | 'google')}
          className="rounded-full bg-transparent text-xs text-slate-400 outline-none"
        >
          <option value="site">站内搜索</option>
          <option value="google">Google</option>
        </select>
      </form>

      <div className="flex items-center gap-2">

        <button
          onClick={onForceRefresh}
          className="icon-button"
          title="无缓存刷新页面"
        >
          <RotateCw size={15} />
        </button>

        {authenticated ? (
          <>
            <button
              onClick={() => setEditMode(!editMode)}
              title={editMode ? '退出编辑模式' : '进入编辑模式'}
              className={`icon-button ${editMode ? 'bg-blue-500/15 text-blue-300 hover:text-blue-200' : ''}`}
            >
              <Pencil size={15} />
            </button>
            <button onClick={onLogout} className="icon-button" title="退出登录">
              <LogOut size={15} />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-1.5">
            {allowRegister && (
              <button onClick={onOpenRegister} className="icon-button" title="注册">
                <UserPlus size={15} />
              </button>
            )}
            <button onClick={onOpenAuth} className="icon-button" title="登录">
              <LogIn size={15} />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
