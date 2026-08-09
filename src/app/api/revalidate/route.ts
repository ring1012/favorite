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
  } catch (error: unknown) {
    console.error('[revalidatePath] Error during revalidation:', error)
    const message = error instanceof Error ? error.message : 'Revalidation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
