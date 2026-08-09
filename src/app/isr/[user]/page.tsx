import NavigationApp from '@/components/NavigationApp'

export async function generateStaticParams() {
  return [
    { user: 'anonymous' },
    { user: 'app' },
  ]
}

export default function UserISRPage() {
  return <NavigationApp />
}

export const revalidate = 60