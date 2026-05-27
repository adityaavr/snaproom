import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Thin server-side proxy for the World Labs Marble API. Keeps WORLD_LABS_API_KEY
 * off the client. Each call is short — submit returns an async operation, and
 * the browser drives the poll loop via repeated GETs here.
 *
 *   POST /api/worldlabs        -> worlds:generate (body forwarded verbatim)
 *   GET  /api/worldlabs?id=... -> operations/{id}
 */
const ENDPOINT = 'https://api.worldlabs.ai/marble/v1'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiKey = process.env.WORLD_LABS_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'WORLD_LABS_API_KEY is not configured on the server.' })
    return
  }

  try {
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {})
      const upstream = await fetch(`${ENDPOINT}/worlds:generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'WLT-Api-Key': apiKey },
        body,
      })
      const text = await upstream.text()
      res.status(upstream.status).setHeader('Content-Type', 'application/json').send(text || '{}')
      return
    }

    if (req.method === 'GET') {
      const id = String(req.query.id || '')
      if (!id) {
        res.status(400).json({ error: 'Missing operation id.' })
        return
      }
      const upstream = await fetch(`${ENDPOINT}/operations/${encodeURIComponent(id)}`, {
        headers: { 'WLT-Api-Key': apiKey },
      })
      const text = await upstream.text()
      res.status(upstream.status).setHeader('Content-Type', 'application/json').send(text || '{}')
      return
    }

    res.status(405).json({ error: 'Method not allowed.' })
  } catch (err) {
    res.status(502).json({ error: `World Labs proxy error: ${err instanceof Error ? err.message : String(err)}` })
  }
}
