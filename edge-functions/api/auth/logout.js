import { currentUser, json } from '../../_lib/navigation.js'

export async function onRequestPost({ request, env }) {
  await currentUser(request, env)
  // The client simply drops the token from localStorage; nothing to invalidate server-side.
  return json({ ok: true }, { headers: { 'cache-control': 'no-store' } })
}
