// api/espn/scoreboard.js
// Proxies ESPN scoreboard API — passes all query params through
// Usage: /api/espn/scoreboard?week=1&seasontype=1&limit=20

export const config = { runtime: 'edge' }

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl'

export default async function handler(req) {
  const url    = new URL(req.url)
  const week   = url.searchParams.get('week')
  const stype  = url.searchParams.get('seasontype') || '2'
  const limit  = url.searchParams.get('limit') || '20'

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
  }

  try {
    let espnUrl = `${ESPN_BASE}/scoreboard?seasontype=${stype}&limit=${limit}`
    if (week) espnUrl += `&week=${week}`

    const r    = await fetch(espnUrl)
    const data = await r.json()
    return new Response(JSON.stringify(data), { headers })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, events: [] }), { status: 500, headers })
  }
}
