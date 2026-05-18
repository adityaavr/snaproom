import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Thin server-side proxy for the FAL queue API. Keeps FAL_KEY off the client.
 * Used for the floor-plan -> photoreal interior image edit that precedes
 * World Labs generation.
 *
 *   POST /api/fal { mode: 'submit', endpoint, input }  -> queue submit
 *   POST /api/fal { mode: 'poll',   url }               -> status / result GET
 */
const ALLOWED_HOSTS = new Set(['queue.fal.run', 'fal.run'])

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const falKey = process.env.FAL_KEY
  if (!falKey) {
    res.status(500).json({ error: 'FAL_KEY is not configured on the server.' })
    return
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' })
    return
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {})

  try {
    if (body.mode === 'submit') {
      const { endpoint, input } = body
      if (!endpoint || typeof endpoint !== 'string') {
        res.status(400).json({ error: 'Missing endpoint.' })
        return
      }
      const upstream = await fetch(`https://queue.fal.run/${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Key ${falKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(input ?? {}),
      })
      const text = await upstream.text()
      res.status(upstream.status).setHeader('Content-Type', 'application/json').send(text || '{}')
      return
    }

    if (body.mode === 'poll') {
      const { url } = body
      let parsed: URL
      try {
        parsed = new URL(String(url))
      } catch {
        res.status(400).json({ error: 'Invalid url.' })
        return
      }
      if (!ALLOWED_HOSTS.has(parsed.host)) {
        res.status(400).json({ error: 'Disallowed host.' })
        return
      }
      const upstream = await fetch(parsed.toString(), { headers: { Authorization: `Key ${falKey}` } })
      const text = await upstream.text()
      res.status(upstream.status).setHeader('Content-Type', 'application/json').send(text || '{}')
      return
    }

    res.status(400).json({ error: 'Unknown mode.' })
  } catch (err) {
    res.status(502).json({ error: `FAL proxy error: ${err instanceof Error ? err.message : String(err)}` })
  }
}
