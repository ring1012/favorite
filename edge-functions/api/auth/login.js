import { createSession, getUser, json, sha256 } from '../../_lib/navigation.js'

export async function onRequestPost({ request, env }) {
  try {
    const rawBody = await request.text()

    let credentials
    try {
      credentials = JSON.parse(rawBody)
    } catch (error) {
      return json({ error: '登录请求体无效。' }, { status: 400 })
    }

    const { username: rawUsername, password } = credentials
    const username = typeof rawUsername === 'string' ? rawUsername.trim().toLowerCase() : ''
    const user = await getUser(username)
    const passwordMatches = Boolean(user) && typeof password === 'string' && user === await sha256(password)
    if (!passwordMatches) {
      return json({ error: '用户名或密码错误。' }, { status: 401 })
    }
    const token = await createSession(username, env)
    // The client keeps this token in localStorage and sends it back via the `x-n-auth` header.
    return json({ username, token }, { headers: { 'cache-control': 'no-store' } })
  } catch (error) {
    console.error('[navigation/auth/login] unexpected failure', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
      cause: error?.cause,
    })
    return json({ error: '登录失败，请稍后重试。' }, { status: 400 })
  }
}
