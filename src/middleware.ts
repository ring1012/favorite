import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/isr') {
    const hasSession = request.cookies.has('navigation_session')
    return NextResponse.redirect(new URL(`/isr/${hasSession ? 'app' : 'anonymous'}`, request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: '/isr',
}