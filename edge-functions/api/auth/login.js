import { createSession, getUser, json, sessionCookie, sha256 } from '../../_lib/navigation.js'

export async function onRequestPost({ request }) {
  try {
    const rawBody = await request.text()
    console.log('[navigation/auth/login] incoming request', {
      method: request.method,
      contentType: request.headers.get('content-type'),
      bodyLength: rawBody.length,
    })

    let credentials
    try {
      credentials = JSON.parse(rawBody)
    } catch (error) {
      console.error('[navigation/auth/login] invalid JSON body', error.message)
      return json({ error: 'Invalid login request body.' }, { status: 400 })
    }

    const { username: rawUsername, password } = credentials
    const username = typeof rawUsername === 'string' ? rawUsername.trim().toLowerCase() : ''
    console.log('[navigation/auth/login] reading account', { username, hasPassword: typeof password === 'string' })
    const user = await getUser(username)
    console.log('[navigation/auth/login] account lookup complete', {
      username,
      found: Boolean(user),
      hashLength: user?.length || 0,
    })
    const passwordMatches = Boolean(user) && typeof password === 'string' && user === await sha256(password)
    console.log('[navigation/auth/login] password verification complete', { username, passwordMatches })
    if (!passwordMatches) {
      return json({ error: 'Invalid username or password.' }, { status: 401 })
    }
    const token = await createSession(username)
    console.log('[navigation/auth/login] session created', { username, tokenLength: token.length })
    return json({ username }, { headers: { 'set-cookie': sessionCookie(token), 'cache-control': 'no-store' } })
  } catch (error) {
    console.error('[navigation/auth/login] unexpected failure', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
    })
    return json({ error: 'Unable to sign in. Please try again later.' }, { status: 400 })
  }
}
