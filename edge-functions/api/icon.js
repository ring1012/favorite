const MAX_ICON_SIZE = 1024 * 1024

export async function onRequestGet({ request }) {
  try {
    const source = new URL(new URL(request.url).searchParams.get('url') || '')
    if (!['https:', 'http:'].includes(source.protocol)) throw new Error('Unsupported icon URL.')

    const response = await fetch(source.toString(), { redirect: 'follow' })
    const contentType = response.headers.get('content-type') || ''
    const contentLength = Number(response.headers.get('content-length') || '0')
    if (!response.ok || !contentType.startsWith('image/') || contentLength > MAX_ICON_SIZE) {
      throw new Error('Icon is unavailable.')
    }

    return new Response(response.body, {
      headers: {
        'content-type': contentType,
        'cache-control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
        'x-content-type-options': 'nosniff',
      },
    })
  } catch {
    return new Response(null, { status: 204, headers: { 'cache-control': 'public, max-age=300' } })
  }
}
