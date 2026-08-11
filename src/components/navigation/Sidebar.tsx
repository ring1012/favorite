'use client'

import React from 'react'
import {
  ChevronDown,
  ChevronRight,
  FolderPlus,
  GripVertical,
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
  mobileNavOpen: boolean
  onNavigate: () => void
  authenticated: boolean
  editMode: boolean
  isSubmitting: boolean
  menuDraggingId: string | null
  setMenuDraggingId: (id: string | null) => void
  menuDragOverId: string | null
  setMenuDragOverId: (id: string | null) => void
  onAddMenu: (parentId: string | null) => void
  onEditMenu: (menu: { id: string; name: string }) => void
  onDeleteMenu: (id: string) => void
  onReorderMenu: (sourceId: string, targetId: string) => void
}

export function Sidebar({
  menus,
  activeMenu,
  setActiveMenu,
  expanded,
  setExpanded,
  sidebarCollapsed,
  setSidebarCollapsed,
  mobileNavOpen,
  onNavigate,
  authenticated,
  editMode,
  isSubmitting,
  menuDraggingId,
  setMenuDraggingId,
  menuDragOverId,
  setMenuDragOverId,
  onAddMenu,
  onEditMenu,
  onDeleteMenu,
  onReorderMenu,
}: SidebarProps) {
  const roots = menus.filter((menu) => !menu.parentId)

  const handleRootDragStart = (e: React.DragEvent, id: string) => {
    setMenuDraggingId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleRootDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (id !== menuDraggingId) setMenuDragOverId(id)
  }

  const handleRootDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (menuDraggingId && menuDraggingId !== targetId) {
      // Only allow root-to-root reorder
      const source = menus.find((m) => m.id === menuDraggingId)
      const target = menus.find((m) => m.id === targetId)
      if (source && target && !source.parentId && !target.parentId) {
        onReorderMenu(menuDraggingId, targetId)
      }
    }
    setMenuDraggingId(null)
    setMenuDragOverId(null)
  }

  const handleChildDragStart = (e: React.DragEvent, id: string) => {
    e.stopPropagation()
    setMenuDraggingId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleChildDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    if (id !== menuDraggingId) setMenuDragOverId(id)
  }

  const handleChildDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (menuDraggingId && menuDraggingId !== targetId) {
      const source = menus.find((m) => m.id === menuDraggingId)
      const target = menus.find((m) => m.id === targetId)
      if (source && target && source.parentId && source.parentId === target.parentId) {
        onReorderMenu(menuDraggingId, targetId)
      }
    }
    setMenuDraggingId(null)
    setMenuDragOverId(null)
  }

  return (
    <aside
      className={`shrink-0 rounded-2xl p-2.5 shadow-[0_12px_40px_rgba(0,0,0,.3),inset_0_1px_0_rgba(255,255,255,.04)] backdrop-blur-sm transition-all duration-300 ${
        mobileNavOpen
          ? 'fixed inset-y-0 left-0 z-40 w-64 max-w-[80vw] overflow-y-auto rounded-none bg-[#15151e]/95'
          : 'hidden'
      } lg:static lg:z-auto lg:block ${
        sidebarCollapsed ? 'lg:w-0 lg:overflow-hidden lg:p-0' : 'lg:w-52 lg:max-w-none lg:overflow-visible lg:rounded-2xl lg:bg-white/[.03]'
      }`}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <button
            title={sidebarCollapsed ? '展开分类' : '收起分类'}
            onClick={() => setSidebarCollapsed((value) => !value)}
            className="icon-button hidden p-1 text-slate-400 hover:text-slate-200 lg:inline-grid"
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
          const isDraggingThis = menuDraggingId === root.id
          const isDragOver = menuDragOverId === root.id

          return (
            <div
              key={root.id}
              className={`space-y-0.5 transition-opacity duration-150 ${isDraggingThis ? 'opacity-40' : 'opacity-100'}`}
              draggable={editMode && !isLike}
              onDragStart={editMode && !isLike ? (e) => handleRootDragStart(e, root.id) : undefined}
              onDragOver={editMode && !isLike ? (e) => handleRootDragOver(e, root.id) : undefined}
              onDrop={editMode && !isLike ? (e) => handleRootDrop(e, root.id) : undefined}
              onDragEnd={() => { setMenuDraggingId(null); setMenuDragOverId(null) }}
            >
              <div
                className={`group relative flex items-center justify-between rounded-lg px-2 py-[7px] text-[13px] font-medium transition-all duration-200 cursor-pointer ${
                  isDragOver && !isDraggingThis
                    ? 'ring-2 ring-blue-400/60 bg-blue-500/10'
                    : isRootActive
                    ? 'bg-gradient-to-r from-blue-500/20 to-violet-500/10 text-blue-50 font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,.06)]'
                    : 'text-slate-400 hover:bg-white/[.05] hover:text-slate-100'
                }`}
                onClick={() => {
                  setActiveMenu(root.id)
                  onNavigate()
                }}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  {editMode && !isLike && (
                    <span
                      className="shrink-0 cursor-grab text-slate-600 hover:text-slate-400 active:cursor-grabbing"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <GripVertical size={12} />
                    </span>
                  )}

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
                    const isChildDragging = menuDraggingId === child.id
                    const isChildDragOver = menuDragOverId === child.id
                    return (
                      <div
                        key={child.id}
                        className={`group flex items-center justify-between rounded-lg px-2 py-[6px] text-[13px] transition-all cursor-pointer ${
                          isChildDragging
                            ? 'opacity-40'
                            : isChildDragOver
                            ? 'ring-2 ring-blue-400/60 bg-blue-500/10'
                            : isChildActive
                            ? 'bg-blue-500/[.14] font-semibold text-blue-50'
                            : 'text-slate-500 hover:bg-white/[.05] hover:text-slate-200'
                        }`}
                        draggable={editMode}
                        onDragStart={editMode ? (e) => handleChildDragStart(e, child.id) : undefined}
                        onDragOver={editMode ? (e) => handleChildDragOver(e, child.id) : undefined}
                        onDrop={editMode ? (e) => handleChildDrop(e, child.id) : undefined}
                        onDragEnd={() => { setMenuDraggingId(null); setMenuDragOverId(null) }}
                        onClick={() => {
                          setActiveMenu(child.id)
                          onNavigate()
                        }}
                      >
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          {editMode && (
                            <span
                              className="shrink-0 cursor-grab text-slate-600 hover:text-slate-400 active:cursor-grabbing"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <GripVertical size={12} />
                            </span>
                          )}
                          <span className="truncate flex-1">{child.name}</span>
                        </div>
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
