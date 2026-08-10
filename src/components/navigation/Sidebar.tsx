'use client'

import React from 'react'
import {
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Heart,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { LIKE_MENU_ID, Menu } from './types'

interface SidebarProps {
  menus: Menu[]
  activeMenu: string | null
  setActiveMenu: (id: string) => void
  expanded: string[]
  setExpanded: React.Dispatch<React.SetStateAction<string[]>>
  sidebarCollapsed: boolean
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>
  authenticated: boolean
  editMode: boolean
  isSubmitting: boolean
  onAddMenu: (parentId: string | null) => void
  onEditMenu: (menu: { id: string; name: string }) => void
  onDeleteMenu: (id: string) => void
}

export function Sidebar({
  menus,
  activeMenu,
  setActiveMenu,
  expanded,
  setExpanded,
  sidebarCollapsed,
  setSidebarCollapsed,
  authenticated,
  editMode,
  isSubmitting,
  onAddMenu,
  onEditMenu,
  onDeleteMenu,
}: SidebarProps) {
  const roots = menus.filter((menu) => !menu.parentId)

  return (
    <aside
      className={`w-full shrink-0 rounded-2xl bg-white/[.03] p-2.5 shadow-[0_12px_40px_rgba(0,0,0,.3),inset_0_1px_0_rgba(255,255,255,.04)] backdrop-blur-sm transition-all duration-300 ${
        sidebarCollapsed ? 'hidden lg:block lg:w-0 lg:overflow-hidden lg:p-0' : 'lg:w-52'
      }`}
    >
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
        {authenticated && editMode && (
          <button
            title="添加分类"
            disabled={isSubmitting}
            onClick={() => onAddMenu(null)}
            className="icon-button p-1 disabled:opacity-50"
          >
            <Plus size={13} />
          </button>
        )}
      </div>

      <nav className="space-y-0.5">
        {roots.map((root) => {
          const children = menus.filter((menu) => menu.parentId === root.id)
          const open = expanded.includes(root.id)
          const isRootActive = activeMenu === root.id
          const isLike = root.id === LIKE_MENU_ID

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
                        e.stopPropagation()
                        setExpanded((items) =>
                          items.includes(root.id) ? items.filter((id) => id !== root.id) : [...items, root.id]
                        )
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
                    <div
                      className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                        isRootActive ? 'bg-blue-400' : 'bg-slate-600 group-hover:bg-blue-400'
                      }`}
                    />
                  )}

                  <span className="truncate flex-1">{root.name}</span>
                </div>

                {authenticated && editMode && !isLike && (
                  <div className="hidden items-center gap-1 pr-1 group-hover:flex">
                    <button
                      title="添加子分类"
                      disabled={isSubmitting}
                      className="icon-button p-0.5"
                      onClick={(e) => {
                        e.stopPropagation()
                        onAddMenu(root.id)
                      }}
                    >
                      <FolderPlus size={12} />
                    </button>
                    <button
                      title="编辑分类"
                      disabled={isSubmitting}
                      className="icon-button p-0.5"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEditMenu({ id: root.id, name: root.name })
                      }}
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      title="删除分类"
                      disabled={isSubmitting}
                      className="icon-button p-0.5 text-rose-300"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteMenu(root.id)
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>

              {open && children.length > 0 && (
                <div className="ml-3.5 pl-2 space-y-0.5 mt-0.5">
                  {children.map((child) => {
                    const isChildActive = activeMenu === child.id
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
                        {authenticated && editMode && (
                          <div className="hidden items-center gap-1 pr-1 group-hover:flex">
                            <button
                              title="编辑分类"
                              disabled={isSubmitting}
                              className="icon-button p-0.5"
                              onClick={(e) => {
                                e.stopPropagation()
                                onEditMenu({ id: child.id, name: child.name })
                              }}
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              title="删除分类"
                              disabled={isSubmitting}
                              className="icon-button p-0.5 text-rose-300"
                              onClick={(e) => {
                                e.stopPropagation()
                                onDeleteMenu(child.id)
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
