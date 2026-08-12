'use client'

import React, { useRef, useState } from 'react'
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

// Horizontal offset threshold (px from left of sidebar item) beyond which
// a drop is interpreted as "make source a child of target" rather than
// a same-level reorder / root promotion.
const CHILD_INTENT_THRESHOLD = 36

interface DropState {
  targetId: string
  intent: 'sibling' | 'child'
}

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
  onMoveMenu: (sourceId: string, targetId: string, asChild: boolean) => void
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
  setMenuDragOverId,
  onAddMenu,
  onEditMenu,
  onDeleteMenu,
  onReorderMenu,
  onMoveMenu,
}: SidebarProps) {
  const roots = menus.filter((menu) => !menu.parentId)
  const [dropState, setDropState] = useState<DropState | null>(null)
  const sidebarRef = useRef<HTMLElement>(null)

  const clearDrag = () => {
    setMenuDraggingId(null)
    setMenuDragOverId(null)
    setDropState(null)
  }

  // ─── Compute drop intent from mouse X relative to sidebar left edge ─────
  const getIntent = (e: React.DragEvent): 'sibling' | 'child' => {
    const sidebar = sidebarRef.current
    if (!sidebar) return 'sibling'
    const rect = sidebar.getBoundingClientRect()
    const relX = e.clientX - rect.left
    return relX > CHILD_INTENT_THRESHOLD ? 'child' : 'sibling'
  }

  // ─── Root drag handlers ──────────────────────────────────────────────────
  const handleRootDragStart = (e: React.DragEvent, id: string) => {
    setMenuDraggingId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleRootDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (id === menuDraggingId) return
    const intent = getIntent(e)
    setDropState({ targetId: id, intent })
    setMenuDragOverId(id)
  }

  const handleRootDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!menuDraggingId || menuDraggingId === targetId) { clearDrag(); return }
    const source = menus.find((m) => m.id === menuDraggingId)
    const target = menus.find((m) => m.id === targetId)
    if (!source || !target) { clearDrag(); return }

    const intent = getIntent(e)

    if (!source.parentId && !target.parentId) {
      // root → root
      if (intent === 'child') {
        // root wants to become child of target root
        onMoveMenu(source.id, target.id, true)
      } else {
        onReorderMenu(source.id, target.id)
      }
    } else if (source.parentId && !target.parentId) {
      // child → root
      if (intent === 'child') {
        // child wants to become child of this root
        onMoveMenu(source.id, target.id, true)
      } else {
        // child wants to be promoted to root (sibling of target)
        onMoveMenu(source.id, target.id, false)
      }
    }
    clearDrag()
  }

  // ─── Child drag handlers ─────────────────────────────────────────────────
  const handleChildDragStart = (e: React.DragEvent, id: string) => {
    e.stopPropagation()
    setMenuDraggingId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleChildDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    if (id === menuDraggingId) return
    const intent = getIntent(e)
    setDropState({ targetId: id, intent })
    setMenuDragOverId(id)
  }

  const handleChildDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!menuDraggingId || menuDraggingId === targetId) { clearDrag(); return }
    const source = menus.find((m) => m.id === menuDraggingId)
    const target = menus.find((m) => m.id === targetId)
    if (!source || !target) { clearDrag(); return }

    // child → child (same or different parent): always sibling reorder within same parent
    if (source.parentId === target.parentId) {
      onReorderMenu(source.id, target.id)
    }
    clearDrag()
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <aside
      ref={sidebarRef}
      className={`shrink-0 rounded-2xl p-2.5 shadow-[0_12px_40px_rgba(0,0,0,.3),inset_0_1px_0_rgba(255,255,255,.04)] backdrop-blur-sm transition-all duration-300 ${
        mobileNavOpen
          ? 'fixed inset-y-0 left-0 z-40 w-64 max-w-[80vw] overflow-y-auto rounded-none bg-[#15151e]/95'
          : 'hidden'
      } lg:static lg:z-auto lg:block ${
        sidebarCollapsed ? 'lg:w-0 lg:overflow-hidden lg:p-0' : 'lg:w-52 lg:max-w-none lg:overflow-visible lg:rounded-2xl lg:bg-white/[.03]'
      }`}
    >
      {/* Header */}
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
          const isDropTarget = dropState?.targetId === root.id && menuDraggingId !== root.id
          const dropIntent = isDropTarget ? dropState!.intent : null

          return (
            <div
              key={root.id}
              className={`space-y-0.5 transition-opacity duration-150 ${isDraggingThis ? 'opacity-30' : 'opacity-100'}`}
              draggable={editMode && !isLike}
              onDragStart={editMode && !isLike ? (e) => handleRootDragStart(e, root.id) : undefined}
              onDragOver={editMode && !isLike ? (e) => handleRootDragOver(e, root.id) : undefined}
              onDrop={editMode && !isLike ? (e) => handleRootDrop(e, root.id) : undefined}
              onDragEnd={clearDrag}
            >
              {/* Drop indicator line (sibling) */}
              {isDropTarget && dropIntent === 'sibling' && (
                <div className="mx-1 h-0.5 rounded-full bg-blue-400/70 shadow-[0_0_6px_rgba(96,165,250,.6)]" />
              )}

              <div
                className={`group relative flex items-center justify-between rounded-lg px-2 py-[7px] text-[13px] font-medium transition-all duration-200 cursor-pointer ${
                  isDropTarget && dropIntent === 'child'
                    ? 'ring-2 ring-violet-400/60 bg-violet-500/10'
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

              {/* Sub-menu list with visual hierarchy */}
              {open && children.length > 0 && (
                <div className="relative ml-4 mt-0.5">
                  {/* Left border line — tree connector */}
                  <div className="absolute left-0 top-1 bottom-1 w-px bg-gradient-to-b from-white/[.10] via-white/[.06] to-transparent rounded-full" />

                  <div className="pl-3 space-y-px">
                    {children.map((child) => {
                      const isChildActive = activeMenu === child.id
                      const isChildDragging = menuDraggingId === child.id
                      const isChildDrop = dropState?.targetId === child.id && menuDraggingId !== child.id

                      return (
                        <div key={child.id}>
                          {/* Drop indicator line above child */}
                          {isChildDrop && (
                            <div className="mx-1 h-0.5 rounded-full bg-blue-400/70 shadow-[0_0_6px_rgba(96,165,250,.6)] mb-px" />
                          )}
                          <div
                            className={`group flex items-center justify-between rounded-md px-2 py-[5px] text-[12px] transition-all cursor-pointer ${
                              isChildDragging
                                ? 'opacity-30'
                                : isChildActive
                                ? 'bg-violet-500/[.18] font-semibold text-violet-100 shadow-[inset_0_1px_0_rgba(255,255,255,.04)]'
                                : 'text-slate-500 hover:bg-white/[.04] hover:text-slate-300'
                            }`}
                            draggable={editMode}
                            onDragStart={editMode ? (e) => handleChildDragStart(e, child.id) : undefined}
                            onDragOver={editMode ? (e) => handleChildDragOver(e, child.id) : undefined}
                            onDrop={editMode ? (e) => handleChildDrop(e, child.id) : undefined}
                            onDragEnd={clearDrag}
                            onClick={() => {
                              setActiveMenu(child.id)
                              onNavigate()
                            }}
                          >
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              {editMode && (
                                <span
                                  className="shrink-0 cursor-grab text-slate-700 hover:text-slate-400 active:cursor-grabbing"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <GripVertical size={11} />
                                </span>
                              )}
                              {/* Small dash connector */}
                              <span className={`shrink-0 text-[10px] leading-none ${isChildActive ? 'text-violet-400' : 'text-slate-600'}`}>
                                ─
                              </span>
                              <span className="truncate flex-1">{child.name}</span>
                            </div>
                            {authenticated && editMode && (
                              <div className="hidden items-center gap-1 pr-0.5 group-hover:flex">
                                <button
                                  title="编辑分类"
                                  disabled={isSubmitting}
                                  className="icon-button p-0.5"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onEditMenu({ id: child.id, name: child.name })
                                  }}
                                >
                                  <Pencil size={11} />
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
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Drop hint for child intent: show indented placeholder */}
              {isDropTarget && dropIntent === 'child' && (
                <div className="ml-4 pl-3 mt-px">
                  <div className="flex items-center gap-1.5 rounded-md px-2 py-[5px] border border-dashed border-violet-400/40 text-[11px] text-violet-400/60">
                    <span>─</span>
                    <span className="truncate">
                      {menus.find((m) => m.id === menuDraggingId)?.name ?? ''}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
