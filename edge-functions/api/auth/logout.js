import { currentUser, expiredSessionCookie, json } from '../../_lib/navigation.js'

export async function onRequestPost({ request, env }) {
  await currentUser(request, env)
  return json({ ok: true }, { headers: { 'set-cookie': expiredSessionCookie, 'cache-control': 'no-store' } })
}
