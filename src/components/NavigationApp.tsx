'use client'

import React from 'react'
import { X } from 'lucide-react'
import { Payload } from './navigation/types'
import { useNavigationState } from './navigation/useNavigationState'
import { NavigationHeader } from './navigation/NavigationHeader'
import { Sidebar } from './navigation/Sidebar'
import { MainContent } from './navigation/MainContent'
import { AuthDialog, MenuDialog, SiteDialog } from './navigation/Dialogs'

export default function NavigationApp({
  initialData,
  expectedUser,
}: {
  initialData?: Payload
  expectedUser?: string
}) {
  const {
    data,
    activeMenu,
    setActiveMenu,
    expanded,
    setExpanded,
    loading,
    notice,
    setNotice,
    authMode,
    setAuthMode,
    menuEditor,
    setMenuEditor,
    siteEditor,
    setSiteEditor,
    searchScope,
    setSearchScope,
    searchQuery,
    setSearchQuery,
    sidebarCollapsed,
    setSidebarCollapsed,
    mobileNavOpen,
    setMobileNavOpen,
    editMode,
    setEditMode,
    isSubmitting,
    blockedByAuth,
    draggingId,
    setDraggingId,
    dragOverId,
    setDragOverId,
    menuDraggingId,
    setMenuDraggingId,
    menuDragOverId,
    setMenuDragOverId,
    menus,
    normalizedQuery,
    favoriteUrls,
    renderedGroups,
    totalSites,
    hasMoreSites,
    loadMoreRef,
    handleForceRefresh,
    reorderSite,
    reorderMenu,
    refresh,
    mutate,
    deleteItem,
    toggleFavorite,
    handleLogout,
  } = useNavigationState(initialData, expectedUser)

  if (blockedByAuth) {
    return (
      <main className="min-h-screen bg-[#0b0b12] flex items-center justify-center font-sans">
        {authMode && (
          <AuthDialog
            onClose={() => {}}
            onDone={(username) => {
              setAuthMode(false)
              if (username) {
                window.location.assign(`/nav/${encodeURIComponent(username)}`)
              } else {
                window.location.reload()
              }
            }}
          />
        )}
      </main>
    )
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0b0b12] text-slate-100 font-sans">
      {/* Background glow graphics */}
      <div className="pointer-events-none fixed inset-0" aria-hidden>
        <div className="absolute -top-40 left-1/2 h-[520px] w-[840px] -translate-x-1/2 rounded-full bg-blue-500/[.07] blur-[130px]" />
        <div className="absolute -bottom-48 -right-24 h-[460px] w-[640px] rounded-full bg-violet-500/[.05] blur-[150px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,.02),transparent_55%)]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[1680px] flex-col gap-3 px-3 py-3 md:px-5 md:py-4">
        {/* Top Header Component */}
        <NavigationHeader
          ownerName={data.owner}
          authenticated={data.authenticated}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchScope={searchScope}
          setSearchScope={setSearchScope}
          editMode={editMode}
          setEditMode={setEditMode}
          mobileNavOpen={mobileNavOpen}
          setMobileNavOpen={setMobileNavOpen}
          onForceRefresh={handleForceRefresh}
          onLogout={handleLogout}
          onOpenAuth={() => setAuthMode(true)}
        />

        {/* Mobile drawer backdrop */}
        {mobileNavOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        {/* Main Body Area */}
        <div className="flex flex-1 flex-col gap-3 lg:flex-row">
          {/* Left Category Menu Sidebar Component */}
          <Sidebar
            menus={menus}
            activeMenu={activeMenu}
            setActiveMenu={setActiveMenu}
            expanded={expanded}
            setExpanded={setExpanded}
            sidebarCollapsed={sidebarCollapsed}
            setSidebarCollapsed={setSidebarCollapsed}
            mobileNavOpen={mobileNavOpen}
            onNavigate={() => setMobileNavOpen(false)}
            authenticated={data.authenticated}
            editMode={editMode}
            isSubmitting={isSubmitting}
            menuDraggingId={menuDraggingId}
            setMenuDraggingId={setMenuDraggingId}
            menuDragOverId={menuDragOverId}
            setMenuDragOverId={setMenuDragOverId}
            onAddMenu={(parentId) => setMenuEditor({ name: '', parentId })}
            onEditMenu={(menu) => setMenuEditor(menu)}
            onDeleteMenu={(id) => deleteItem('menu', id)}
            onReorderMenu={reorderMenu}
          />

          {/* Main Content Component */}
          <MainContent
            sidebarCollapsed={sidebarCollapsed}
            setSidebarCollapsed={setSidebarCollapsed}
            normalizedQuery={normalizedQuery}
            searchQuery={searchQuery}
            totalSites={totalSites}
            authenticated={data.authenticated}
            editMode={editMode}
            isSubmitting={isSubmitting}
            activeMenu={activeMenu}
            menus={menus}
            loading={loading}
            renderedGroups={renderedGroups}
            favoriteUrls={favoriteUrls}
            pendingFavs={new Set()}
            draggingId={draggingId}
            dragOverId={dragOverId}
            hasMoreSites={hasMoreSites}
            loadMoreRef={loadMoreRef}
            onToggleFavorite={toggleFavorite}
            onEditSite={(site) => setSiteEditor(site)}
            onDeleteSite={(id) => deleteItem('site', id)}
            setDraggingId={setDraggingId}
            setDragOverId={setDragOverId}
            onReorderSite={reorderSite}
          />
        </div>

        {/* Toast Notice */}
        {notice && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 rounded-full bg-[#1c1c26]/90 px-4 py-2 text-sm shadow-[0_12px_32px_rgba(0,0,0,.5)] backdrop-blur-xl">
            {notice}
            <button className="ml-3 text-slate-400 hover:text-white" onClick={() => setNotice('')}>
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Dialog Modals */}
      {authMode && (
        <AuthDialog
          onClose={() => setAuthMode(false)}
          onDone={(username) => {
            setAuthMode(false)
            if (username) {
              window.location.assign(`/nav/${encodeURIComponent(username)}`)
            } else {
              refresh()
            }
          }}
        />
      )}
      {menuEditor && (
        <MenuDialog
          value={menuEditor}
          isSubmitting={isSubmitting}
          onClose={() => setMenuEditor(null)}
          onSave={(name) =>
            mutate(
              menuEditor.id
                ? { action: 'update-menu', id: menuEditor.id, name }
                : { action: 'create-menu', parentId: menuEditor.parentId, name }
            )
          }
        />
      )}
      {siteEditor && (
        <SiteDialog
          value={siteEditor}
          menus={menus}
          isSubmitting={isSubmitting}
          onClose={() => setSiteEditor(null)}
          onSave={(site) =>
            mutate(siteEditor.id ? { action: 'update-site', id: siteEditor.id, ...site } : { action: 'create-site', ...site })
          }
        />
      )}
    </main>
  )
}
