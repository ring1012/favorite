/**
 * EdgeOne Pages KV API.
 *
 * Bind a KV namespace to this project with the variable name `fkv` before
 * deployment. Each request increments and returns the persistent counter.
 */
export async function onRequest({ request }) {
  const url = new URL(request.url)
  const key = url.searchParams.get('key') || 'visitCount'
  const currentValue = await fkv.get(key)
  const value = Number(currentValue || '0') + 1

  await fkv.put(key, String(value))

  return Response.json({
    key,
    value,
    message: 'KV counter updated by an Edge Function.',
  })
}
