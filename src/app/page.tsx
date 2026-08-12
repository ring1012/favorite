import { headers } from 'next/headers'
import { getSessionUser } from '@/lib/auth'
import NavigationApp from '@/components/NavigationApp'

export const revalidate = 10800

async function getISRData() {
  try {
    const session = await getSessionUser()
    const targetUser = session?.username || 'admin'

    // Server Components fetch requires absolute URLs.
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:8088'
    const protocol = headersList.get('x-forwarded-proto') || 'http'

    // The query parameter ?username=... makes this URL unique per user,
    // which serves as the cache key for Next.js Data Cache (revalidate: 24 * 3600).
    // Note: Since we use cookies()/headers(), the HTML itself is dynamically 
    // rendered per request, but this fetch data is cached by URL.
    const url = `${protocol}://${host}/api/navigation?username=${encodeURIComponent(targetUser)}`

    console.log(`[getISRData] Fetching ${url} for user: ${targetUser}`)

    const res = await fetch(url, {
      next: { revalidate: revalidate }
    })

    if (res.ok) {
      const data = await res.json()
      console.log(`[getISRData] Success fetched data for owner: ${data?.owner}`)
      return data
    } else {
      console.error(`[getISRData] API response error, status: ${res.status}, statusText: ${res.statusText}`)
    }
  } catch (e) {
    console.error(`[getISRData] Exception during fetch:`, e)
  }

  console.warn(`[getISRData] Falling back to default empty state`)
  return {
    owner: 'admin',
    authenticated: false,
    navigation: { version: 1, menus: [{ id: 'like', name: '收藏', parentId: null }], sites: [] },
    favorites: []
  }
}

export default async function Home() {
  const initialData = await getISRData()
  return <NavigationApp initialData={initialData} />
}