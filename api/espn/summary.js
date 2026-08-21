// api/espn/summary.js
// Proxies ESPN game summary (box score) API
// Usage: /api/espn/summary?event=401547417

export const config = { runtime: 'edge' }

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl'

export default async function handler(req) {
  const url     = new URL(req.url)
  const eventId = url.searchParams.get('event')

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
  }

  if (!eventId) {
    return new Response(JSON.stringify({ error: 'Missing event param' }), { status: 400, headers })
  }

  try {
    const r    = await fetch(`${ESPN_BASE}/summary?event=${eventId}`)
    const data = await r.json()
    return new Response(JSON.stringify(data), { headers })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers })
  }
}
