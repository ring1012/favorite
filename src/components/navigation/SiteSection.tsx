'use client'

import React from 'react'
import { Site } from './types'
import { SiteCard } from './SiteCard'

interface SiteSectionProps {
  title: string
  sites: Site[]
  favoriteUrls: Set<string>
  pendingFavs: Set<string>
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

export function SiteSection({
  title,
  sites,
  favoriteUrls,
  pendingFavs,
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
}: SiteSectionProps) {
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
          const anyFavoritePending = pendingFavs.size > 0
          return (
            <SiteCard
              key={site.id}
              site={site}
              isFav={isFav}
              isPending={isPending}
              anyFavoritePending={anyFavoritePending}
              authenticated={authenticated}
              editMode={editMode}
              isSubmitting={isSubmitting}
              canReorder={canReorder}
              draggingId={draggingId}
              dragOverId={dragOverId}
              onToggleFavorite={onToggleFavorite}
              onEditSite={onEditSite}
              onDeleteSite={onDeleteSite}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
            />
          )
        })}
      </div>
    </div>
  )
}
