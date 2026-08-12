import { createSession, getUser, json, saveUser } from '../../_lib/navigation.js'

export async function onRequestPost({ request, env }) {
  const allowReg = env['ALLOW_REG'] !== 'false'
  if (!allowReg) {
    return json({ error: '注册功能已关闭。' }, { status: 403 })
  }

  try {
    const rawBody = await request.text()
    let credentials
    try {
      credentials = JSON.parse(rawBody)
    } catch (error) {
      return json({ error: '请求体无效。' }, { status: 400 })
    }

    const { username: rawUsername, passwordHash } = credentials
    const username = typeof rawUsername === 'string' ? rawUsername.trim().toLowerCase() : ''
    
    if (!username || username.length < 3 || username.length > 20) {
      return json({ error: '用户名长度需在3-20个字符之间。' }, { status: 400 })
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return json({ error: '用户名仅支持字母、数字和下划线。' }, { status: 400 })
    }

    if (typeof passwordHash !== 'string' || passwordHash.length !== 64) {
      return json({ error: '密码哈希格式无效。' }, { status: 400 })
    }

    const existing = await getUser(username)
    if (existing) {
      return json({ error: '该用户名已被占用。' }, { status: 400 })
    }

    // Directly save the sha256 password hash submitted by frontend
    await saveUser(username, passwordHash)

    const token = await createSession(username, env)
    return json({ username, token }, { headers: { 'cache-control': 'no-store' } })
  } catch (error) {
    console.error('[navigation/auth/register] unexpected failure', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
    })
    return json({ error: '注册失败，请稍后重试。' }, { status: 500 })
  }
}
