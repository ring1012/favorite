import { getUser, json } from '../../_lib/navigation.js'

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url)
  const username = (url.searchParams.get('username') || '').trim().toLowerCase()
  if (!username) {
    return json({ error: '用户名不能为空。' }, { status: 400 })
  }

  const user = await getUser(username)
  return json({ exists: Boolean(user) }, {
    headers: { 'cache-control': 'no-store' }
  })
}
