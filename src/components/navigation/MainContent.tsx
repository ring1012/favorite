'use client'

import React from 'react'
import { Globe2, PanelLeftOpen, Plus, Search } from 'lucide-react'
import { LIKE_MENU_ID, Menu, Site } from './types'
import { SiteSection } from './SiteSection'

interface MainContentProps {
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  normalizedQuery: string
  searchQuery: string
  totalSites: number
  authenticated: boolean
  editMode: boolean
  isSubmitting: boolean
  activeMenu: string | null
  menus: Menu[]
  loading: boolean
  renderedGroups: { id: string; title: string; sites: Site[] }[]
  favoriteUrls: Set<string>
  pendingFavs: Set<string>
  draggingId: string | null
  dragOverId: string | null
  hasMoreSites: boolean
  loadMoreRef: React.RefObject<HTMLDivElement | null>
  onToggleFavorite: (site: Site) => void
  onEditSite: (site: Partial<Site>) => void
  onDeleteSite: (id: string) => void
  setDraggingId: (id: string | null) => void
  setDragOverId: (id: string | null) => void
  onReorderSite: (sourceId: string, targetId: string) => void
}

export function MainContent({
  sidebarCollapsed,
  setSidebarCollapsed,
  normalizedQuery,
  searchQuery,
  totalSites,
  authenticated,
  editMode,
  isSubmitting,
  activeMenu,
  menus,
  loading,
  renderedGroups,
  favoriteUrls,
  pendingFavs,
  draggingId,
  dragOverId,
  hasMoreSites,
  loadMoreRef,
  onToggleFavorite,
  onEditSite,
  onDeleteSite,
  setDraggingId,
  setDragOverId,
  onReorderSite,
}: MainContentProps) {
  return (
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
              <span className="truncate">
                “{searchQuery.trim()}” 共 {totalSites} 条结果
              </span>
            </span>
          )}
        </div>
        {authenticated && editMode && !normalizedQuery && (
          <button
            title="添加网站"
            disabled={isSubmitting}
            className="button-primary text-xs py-1.5 px-3 disabled:opacity-50"
            onClick={() =>
              onEditSite({
                menuId: activeMenu && activeMenu !== LIKE_MENU_ID ? activeMenu : menus.find((m) => m.id !== LIKE_MENU_ID)?.id || '',
                name: '',
                description: '',
                url: '',
              })
            }
          >
            <Plus size={14} /> 添加网站
          </button>
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
                authenticated={authenticated}
                editMode={editMode}
                isSubmitting={isSubmitting}
                canReorder={authenticated && editMode && !normalizedQuery}
                draggingId={draggingId}
                dragOverId={dragOverId}
                onToggleFavorite={onToggleFavorite}
                onEditSite={onEditSite}
                onDeleteSite={onDeleteSite}
                onDragStart={setDraggingId}
                onDragOver={setDragOverId}
                onDrop={onReorderSite}
                onDragEnd={() => {
                  setDraggingId(null)
                  setDragOverId(null)
                }}
              />
            ))}
          </div>
          {hasMoreSites && (
            <div ref={loadMoreRef} className="grid h-14 place-items-center text-xs text-slate-500">
              <span className="rounded-full bg-white/[.05] px-3 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,.04)]">
                正在加载更多网站…
              </span>
            </div>
          )}
        </>
      ) : (
        <div className="grid min-h-64 place-items-center rounded-2xl bg-white/[.025] text-center shadow-[inset_0_1px_0_rgba(255,255,255,.03)]">
          <div>
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-blue-500/15 to-violet-500/10 shadow-[inset_0_1px_0_rgba(255,255,255,.06)]">
              <Globe2 className="text-slate-500" size={22} />
            </div>
            <p className="font-medium text-slate-200 text-sm">
              {normalizedQuery ? '没有找到匹配的网站' : activeMenu === LIKE_MENU_ID ? '暂无收藏网站' : '这里还没有网站'}
            </p>
            <p className="mt-1.5 max-w-sm text-xs leading-5 text-slate-500">
              {normalizedQuery
                ? '换个关键词试试，或者使用右上角的 Google 搜索。'
                : activeMenu === LIKE_MENU_ID
                ? '在任意网站卡片右上角点击爱心图标即可快速添加到收藏分类。'
                : authenticated
                ? '添加一个网站开始建设这个导航分类。'
                : '登录以创建你自己的导航。'}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
