import NavigationApp from '@/components/NavigationApp'

// Keep the navigation shell fresh while Edge Functions serve KV-backed data.
export const revalidate = 60

export default function ISRNavigationPage() {
  return <NavigationApp />
}
