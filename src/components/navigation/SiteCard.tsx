'use client'

import React from 'react'
import { Heart, Pencil, Trash2 } from 'lucide-react'
import { Site } from './types'

interface SiteCardProps {
  site: Site
  isFav: boolean
  isPending: boolean
  anyFavoritePending: boolean
  authenticated: boolean
  editMode: boolean
  isSubmitting: boolean
  canReorder: boolean
  draggingId: string | null
  dragOverId: string | null
  onToggleFavorite: (site: Site) => void
  onEditSite: (site: Site) => void
  onDeleteSite: (id: string) => void
  onDragStart: (id: string) => void
  onDragOver: (id: string | null) => void
  onDrop: (sourceId: string, targetId: string) => void
  onDragEnd: () => void
}

export function SiteCard({
  site,
  isFav,
  isPending,
  anyFavoritePending,
  authenticated,
  editMode,
  isSubmitting,
  canReorder,
  draggingId,
  dragOverId,
  onToggleFavorite,
  onEditSite,
  onDeleteSite,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: SiteCardProps) {
  const siteIdStr = String(site.id)

  return (
    <article
      draggable={canReorder}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', siteIdStr)
        onDragStart(siteIdStr)
      }}
      onDragEnter={() => {
        if (canReorder) onDragOver(siteIdStr)
      }}
      onDragOver={(event) => {
        if (canReorder) event.preventDefault()
      }}
      onDragLeave={(event) => {
        if (canReorder && event.currentTarget.contains(event.relatedTarget as Node | null)) return
        event.stopPropagation()
        onDragOver(null)
      }}
      onDrop={(event) => {
        if (!canReorder || !draggingId) return
        event.preventDefault()
        onDrop(draggingId, siteIdStr)
      }}
      onDragEnd={() => {
        onDragOver(null)
        onDragEnd()
      }}
      className={`group relative break-inside-avoid rounded-xl bg-white/[.045] p-3 shadow-[0_1px_2px_rgba(0,0,0,.2),inset_0_1px_0_rgba(255,255,255,.04)] transition duration-200 hover:-translate-y-px hover:bg-white/[.07] hover:shadow-[0_12px_32px_rgba(0,0,0,.4),0_0_0_1px_rgba(59,130,246,.12),inset_0_1px_0_rgba(255,255,255,.06)] ${
        canReorder ? 'cursor-grab active:cursor-grabbing' : ''
      } ${draggingId === site.id ? 'opacity-40' : ''} ${
        !draggingId || draggingId === site.id ? '' : dragOverId === site.id ? 'ring-2 ring-blue-400/70' : ''
      }`}
    >
      <button
        type="button"
        disabled={isPending || anyFavoritePending}
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          onToggleFavorite(site)
        }}
        className={`absolute top-2 right-2 z-10 grid h-7 w-7 place-items-center rounded-full bg-black/55 shadow-md backdrop-blur-sm transition-all hover:scale-110 hover:bg-black/80 ${
          isFav ? 'opacity-100' : 'opacity-100 md:opacity-0 md:group-hover:opacity-100'
        } ${isPending || anyFavoritePending ? 'cursor-wait opacity-50' : 'cursor-pointer'}`}
        title={isFav ? '取消收藏' : '加入收藏'}
      >
        <Heart
          size={15}
          className={isFav ? 'fill-rose-500 text-rose-500' : 'text-slate-300 hover:text-rose-400'}
        />
      </button>

      <a href={site.url} target="_blank" rel="noreferrer" title={site.description || undefined} draggable={false} className="block">
        <div className="mb-2 flex items-center gap-2.5 pr-6">
          <div className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-lg bg-white/10 shadow-[inset_0_1px_2px_rgba(0,0,0,.2)]">
            <img
              src={site.iconUrl.startsWith('/') ? `/api/icon?url=${encodeURIComponent(site.iconUrl)}` : site.iconUrl}
              alt=""
              loading="lazy"
              className="h-full w-full object-contain p-[3px]"
              onError={(event) => {
                event.currentTarget.style.display = 'none'
              }}
            />
          </div>
          <h2 className="truncate text-[13px] font-semibold tracking-tight text-slate-50 group-hover:text-white">{site.name}</h2>
        </div>
        <p className="hidden truncate text-xs leading-4 text-slate-500 md:block">{site.description || <span className="text-slate-600">—</span>}</p>
        <p className="mt-1 truncate text-[10px] text-slate-600">{new URL(site.url).host}</p>
      </a>

      {authenticated && editMode && (
        <div className="mt-2 flex gap-1.5">
          <button
            title="编辑网站"
            disabled={isSubmitting}
            className="icon-button p-1 disabled:opacity-50"
            onClick={() => onEditSite(site)}
          >
            <Pencil size={13} />
          </button>
          <button
            title="删除网站"
            disabled={isSubmitting}
            className="icon-button p-1 text-rose-300 disabled:opacity-50"
            onClick={() => site.id && onDeleteSite(site.id)}
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </article>
  )
}
