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

async function sha256(value: string): Promise<string> {
  const hash = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export function RegisterDialog({ onClose, onDone }: { onClose: () => void; onDone: (username?: string) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [usernameSuccess, setUsernameSuccess] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const checkUsername = async () => {
    const trimmed = username.trim().toLowerCase()
    if (!trimmed) {
      setUsernameError('')
      setUsernameSuccess('')
      return
    }
    if (trimmed.length < 3 || trimmed.length > 20) {
      setUsernameError('用户名长度需在3-20个字符之间。')
      setUsernameSuccess('')
      return
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setUsernameError('用户名仅支持字母、数字和下划线。')
      setUsernameSuccess('')
      return
    }

    try {
      const data = await api(`/api/auth/check-username?username=${encodeURIComponent(trimmed)}`)
      if (data.exists) {
        setUsernameError('该用户名已被占用。')
        setUsernameSuccess('')
      } else {
        setUsernameError('')
        setUsernameSuccess('该用户名可用。')
      }
    } catch {
      // Ignore network errors or check failures silenty
    }
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (loading) return
    setError('')

    const trimmedUsername = username.trim().toLowerCase()
    if (!trimmedUsername) {
      setError('请输入用户名。')
      return
    }
    if (password.length < 8) {
      setError('密码至少为8个字符。')
      return
    }
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致。')
      return
    }
    if (usernameError) {
      setError('请先解决用户名错误。')
      return
    }

    setLoading(true)
    try {
      const hashed = await sha256(password)
      const result = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username: trimmedUsername, passwordHash: hashed }),
      })
      if (result.token) setAuthToken(result.token)
      onDone(result.username || trimmedUsername)
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败，请稍后重试。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog title="创建新账户" onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        <div>
          <Field
            label="用户名"
            name="username"
            placeholder="3-20个字符，仅支持字母、数字和下划线"
            required
            disabled={loading}
            value={username}
            onChange={(e) => {
              setUsername(e.target.value)
              setUsernameError('')
              setUsernameSuccess('')
            }}
            onBlur={checkUsername}
          />
          {usernameError && <p className="mt-1 text-xs text-rose-300">{usernameError}</p>}
          {usernameSuccess && <p className="mt-1 text-xs text-emerald-400">{usernameSuccess}</p>}
        </div>
        <Field
          label="密码"
          type="password"
          name="password"
          placeholder="至少 8 个字符"
          minLength={8}
          required
          disabled={loading}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Field
          label="确认密码"
          type="password"
          name="confirmPassword"
          placeholder="请再次输入密码"
          minLength={8}
          required
          disabled={loading}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        {error && <p className="text-sm text-rose-300">{error}</p>}
        <button
          className="button-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          type="submit"
          disabled={loading}
        >
          {loading ? '注册中...' : '注册'}
        </button>
      </form>
    </Dialog>
  )
}
