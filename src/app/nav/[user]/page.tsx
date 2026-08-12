import NavigationApp from '@/components/NavigationApp'

export const revalidate = 10800

async function getISRData(user: string) {
  try {
    // Generate an absolute URL from env to ensure we can fetch data server-side
    // and keep this page purely static/ISR (without reading headers or cookies)
    const host = process.env.NAV_HOST || 'localhost:8088'
    const targetUser = user || 'admin'
    
    const url = `${host}/api/navigation?username=${encodeURIComponent(targetUser)}`

    console.log(`[getISRData] (ISR) Fetching ${url} for user: ${targetUser}`)

    const res = await fetch(url, {
      next: { revalidate: revalidate }
    })

    if (res.ok) {
      const data = await res.json()
      // ensure we return the authenticated flag false on the server side because this is ISR
      return { ...data, authenticated: false }
    } else {
      console.error(`[getISRData] (ISR) API response error, status: ${res.status}`)
    }
  } catch (e) {
    console.error(`[getISRData] (ISR) Exception during fetch:`, e)
  }

  console.warn(`[getISRData] (ISR) Falling back to default empty state`)
  return {
    owner: user,
    authenticated: false,
    navigation: { version: 1, menus: [{ id: 'like', name: '收藏', parentId: null }], sites: [] },
    favorites: []
  }
}

export async function generateStaticParams() {
  return [
    { user: 'admin' },
  ]
}

export default async function NavUserPage({ params }: { params: Promise<{ user: string }> }) {
  const resolvedParams = await params
  const initialData = await getISRData(resolvedParams.user)
  // Use the url parameter as the expected user on the client-side
  return <NavigationApp initialData={initialData} expectedUser={resolvedParams.user} />
}
