// api/espn/teamstats.js
// Proxies ESPN sports.core.api for team season stats
// Usage: /api/espn/teamstats?season=2026&type=offense|defense
// Returns all 32 teams with full stat categories

export const config = { runtime: 'edge' }

const ESPN_CORE = 'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl'

// ESPN stat category IDs for teams
// offense: passing, rushing, scoring, downs, turnovers, miscellaneous
// defense: same categories but from the defensive side
const TEAM_IDS = {
  ARI:22, ATL:1,  BAL:33, BUF:2,  CAR:29, CHI:3,  CIN:4,  CLE:5,
  DAL:6,  DEN:7,  DET:8,  GB:9,   HOU:34, IND:11, JAC:30, KC:12,
  LA:14,  LAC:24, LV:13,  MIA:15, MIN:16, NE:17,  NO:18,  NYG:19,
  NYJ:20, PHI:21, PIT:23, SEA:26, SF:25,  TB:27,  TEN:10, WAS:28,
}

// Reverse map: ESPN id → abbr
const ID_TO_ABB = Object.fromEntries(Object.entries(TEAM_IDS).map(([k,v]) => [v, k]))

export default async function handler(req) {
  const url    = new URL(req.url)
  const season = url.searchParams.get('season') || '2026'
  const type   = url.searchParams.get('type')   || 'offense'  // offense | defense

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800', // 15 min cache
  }

  try {
    // Fetch all 32 teams in parallel
    const teamEntries = Object.entries(TEAM_IDS)
    const results = await Promise.all(
      teamEntries.map(async ([abbr, id]) => {
        try {
          const r = await fetch(
            `${ESPN_CORE}/seasons/${season}/types/2/teams/${id}/statistics`,
            { headers: { 'User-Agent': 'Mozilla/5.0' } }
          )
          if (!r.ok) return null
          const data = await r.json()
          return { abbr, id, data }
        } catch { return null }
      })
    )

    // Parse into flat team stat objects
    const teams = results
      .filter(Boolean)
      .map(({ abbr, id, data }) => {
        const stats = {}

        // ESPN returns splits array — find the 'All Splits' or first entry
        const splits = data.splits?.categories || []

        splits.forEach(cat => {
          cat.stats?.forEach(s => {
            // Store by display name (normalized) and by abbreviation
            const key = s.abbreviation || s.name?.replace(/\s+/g, '_').toLowerCase()
            stats[key] = {
              value:   s.value,
              display: s.displayValue,
              rank:    s.rank,
              name:    s.shortDisplayName || s.displayName || s.name,
            }
          })
        })

        return { abbr, id, stats }
      })

    return new Response(JSON.stringify({ ok: true, teams, season, type }), { headers })

  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers }
    )
  }
}
