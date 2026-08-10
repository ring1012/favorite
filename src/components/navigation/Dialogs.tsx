'use client'

import React, { FormEvent, useState } from 'react'
import { X } from 'lucide-react'
import { api, LIKE_MENU_ID, Menu, setAuthToken, Site } from './types'

export function Dialog({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/60 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-2xl bg-[#14141d] p-6 shadow-[0_24px_80px_rgba(0,0,0,.6),inset_0_1px_0_rgba(255,255,255,.06)]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-sm text-slate-300">
      {label}
      <input
        {...props}
        className="mt-1.5 w-full rounded-xl bg-white/[.05] px-3.5 py-2.5 text-sm outline-none ring-1 ring-inset ring-white/[.08] transition placeholder:text-slate-600 focus:ring-2 focus:ring-blue-400/50 disabled:opacity-50"
      />
    </label>
  )
}

export function AuthDialog({ onClose, onDone }: { onClose: () => void; onDone: (username?: string) => void }) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (loading) return
    setLoading(true)
    setError('')
    const form = new FormData(event.currentTarget)
    const usernameInput = String(form.get('username') || '').trim()
    try {
      const result = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: usernameInput, password: form.get('password') }),
      })
      if (result.token) setAuthToken(result.token)
      const user = result.username || usernameInput
      onDone(user)
    } catch (error) {
      setError(error instanceof Error ? error.message : '无法继续。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog title="欢迎回来" onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        <Field label="用户名" name="username" placeholder="例如：zhang_san" required disabled={loading} />
        <Field label="密码" type="password" name="password" placeholder="至少 8 个字符" minLength={8} required disabled={loading} />
        {error && <p className="text-sm text-rose-300">{error}</p>}
        <button
          className="button-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          type="submit"
          disabled={loading}
        >
          {loading ? '处理中...' : '登录'}
        </button>
      </form>
    </Dialog>
  )
}

export function MenuDialog({
  value,
  isSubmitting,
  onClose,
  onSave,
}: {
  value: { name: string }
  isSubmitting?: boolean
  onClose: () => void
  onSave: (name: string) => void
}) {
  const [name, setName] = useState(value.name)

  return (
    <Dialog title={value.name ? '重命名分类' : '新建分类'} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          if (!isSubmitting) onSave(name)
        }}
      >
        <Field label="分类名称" value={name} onChange={(event) => setName(event.target.value)} required autoFocus disabled={isSubmitting} />
        <button
          className="button-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting}
        >
          {isSubmitting ? '保存中...' : '保存分类'}
        </button>
      </form>
    </Dialog>
  )
}

export function SiteDialog({
  value,
  menus,
  isSubmitting,
  onClose,
  onSave,
}: {
  value: Partial<Site>
  menus: Menu[]
  isSubmitting?: boolean
  onClose: () => void
  onSave: (site: Partial<Site>) => void
}) {
  const [site, setSite] = useState(value)
  const update = (key: keyof Site, value: string) => setSite((current) => ({ ...current, [key]: value }))

  return (
    <Dialog title={site.id ? '编辑网站' : '添加网站'} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          if (!isSubmitting) onSave(site)
        }}
      >
        <Field label="名称" value={site.name || ''} onChange={(event) => update('name', event.target.value)} required disabled={isSubmitting} />
        <Field label="描述" value={site.description || ''} onChange={(event) => update('description', event.target.value)} required disabled={isSubmitting} />
        <Field label="网站链接" type="url" value={site.url || ''} onChange={(event) => update('url', event.target.value)} placeholder="https://example.com" required disabled={isSubmitting} />
        <Field label="图标链接 (可选，直接使用此 Icon)" type="url" value={site.iconUrl || ''} onChange={(event) => update('iconUrl', event.target.value)} placeholder="https://example.com/favicon.ico" disabled={isSubmitting} />
        <label className="block text-sm text-slate-300">
          所属分类
          <select
            value={site.menuId || ''}
            onChange={(event) => update('menuId', event.target.value)}
            disabled={isSubmitting}
            className="mt-1.5 w-full rounded-xl bg-white/[.05] px-3.5 py-2.5 text-sm outline-none ring-1 ring-inset ring-white/[.08] transition focus:ring-2 focus:ring-blue-400/50 disabled:opacity-50"
          >
            {menus
              .filter((m) => m.id !== LIKE_MENU_ID)
              .map((menu) => (
                <option key={menu.id} value={menu.id}>
                  {menu.parentId ? '↳ ' : ''}
                  {menu.name}
                </option>
              ))}
          </select>
        </label>
        <button
          className="button-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting}
        >
          {isSubmitting ? '保存中...' : '保存网站'}
        </button>
      </form>
    </Dialog>
  )
}
