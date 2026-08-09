import { headers } from 'next/headers'
import NavigationApp from '@/components/NavigationApp'

export const revalidate = 60

async function getISRData() {
  try {
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = headersList.get('x-forwarded-proto') || 'http'
    const res = await fetch(`${protocol}://${host}/api/navigation`, {
      next: { revalidate: 60 }
    })
    if (res.ok) {
      return await res.json()
    }
  } catch (e) {}

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