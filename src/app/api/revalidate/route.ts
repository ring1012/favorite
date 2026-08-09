import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const user = searchParams.get('user')
    if (user) {
      console.log(`[revalidatePath] Purging ISR cache for /nav/${user}`)
      revalidatePath(`/nav/${user}`)
    }
    revalidatePath('/')
    return NextResponse.json({ revalidated: true, user, now: Date.now() })
  } catch (error: any) {
    console.error('[revalidatePath] Error during revalidation:', error)
    return NextResponse.json({ error: error?.message || 'Revalidation failed' }, { status: 500 })
  }
}
