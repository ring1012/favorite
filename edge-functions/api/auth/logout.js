import { currentUser, expiredSessionCookie, json } from '../../_lib/navigation.js'

export async function onRequestPost({ request }) {
  await currentUser(request)
  return json({ ok: true }, { headers: { 'set-cookie': expiredSessionCookie, 'cache-control': 'no-store' } })
}
