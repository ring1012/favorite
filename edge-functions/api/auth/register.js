import { createSession, createUser, getUser, json, requireText, sessionCookie } from '../../_lib/navigation.js'

export async function onRequestPost({ request }) {
  try {
    const { username: rawUsername, password } = await request.json()
    const username = requireText(rawUsername, 'Username', 32).toLowerCase()
    if (!/^[a-z0-9_]{3,32}$/.test(username)) throw new Error('Username must contain 3–32 lowercase letters, numbers, or underscores.')
    if (typeof password !== 'string' || password.length < 8) throw new Error('Password must contain at least 8 characters.')
    if (username === 'admin' || await getUser(username)) throw new Error('This username is unavailable.')

    await createUser(username, password)
    const token = await createSession(username)
    return json({ username }, { status: 201, headers: { 'set-cookie': sessionCookie(token), 'cache-control': 'no-store' } })
  } catch (error) {
    return json({ error: error.message || 'Unable to register.' }, { status: 400 })
  }
}
