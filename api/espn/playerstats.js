// api/espn/playerstats.js
// Proxies ESPN site.api for player season stat leaders
// Usage: /api/espn/playerstats?season=2026&category=passing|rushing|receiving|defensive
// Returns top players sorted by the primary stat for that category

export const config = { runtime: 'edge' }

const ESPN_SITE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl'
const ESPN_CORE = 'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl'

// ESPN stat category → their internal athlete stats endpoint params
const CATEGORY_MAP = {
  passing:   { limit: 50, group: 'passing'   },
  rushing:   { limit: 50, group: 'rushing'   },
  receiving: { limit: 50, group: 'receiving' },
  defensive: { limit: 50, group: 'defensive' },
  kicking:   { limit: 30, group: 'kicking'   },
}

export default async function handler(req) {
  const url      = new URL(req.url)
  const season   = url.searchParams.get('season')   || '2026'
  const category = url.searchParams.get('category') || 'passing'
  const limit    = url.searchParams.get('limit')    || '50'

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
  }

  const cat = CATEGORY_MAP[category]
  if (!cat) {
    return new Response(
      JSON.stringify({ ok: false, error: `Unknown category: ${category}` }),
      { status: 400, headers }
    )
  }

  try {
    // ESPN's athlete stats leaders endpoint
    const r = await fetch(
      `${ESPN_SITE}/statistics/athletes?season=${season}&seasontype=2&limit=${limit}&category=${cat.group}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    )

    if (!r.ok) {
      // Fallback: try the season stats endpoint directly
      const r2 = await fetch(
        `${ESPN_CORE}/seasons/${season}/types/2/statistics/byathlete?limit=${limit}&groups=${cat.group}`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      )
      if (!r2.ok) throw new Error(`ESPN returned ${r.status} for ${category}`)
      const data2 = await r2.json()
      return new Response(JSON.stringify({ ok: true, raw: data2, category, season }), { headers })
    }

    const data = await r.json()

    // Parse athletes array
    const athletes = (data.athletes || []).map(entry => {
      const athlete  = entry.athlete || {}
      const teamRef  = athlete.team   || {}
      const stats    = {}

      // Map stat labels to values
      const statLabels = data.labels       || []
      const statNames  = data.displayNames || data.names || []
      const statAbbrs  = data.abbreviations || statLabels

      ;(entry.stats || []).forEach((val, i) => {
        const key = statAbbrs[i] || statLabels[i] || `stat_${i}`
        stats[key] = {
          value:   parseFloat(val) || 0,
          display: val,
          name:    statNames[i] || key,
        }
      })

      return {
        id:       athlete.id,
        name:     athlete.displayName || athlete.fullName || '',
        shortName: athlete.shortName  || '',
        pos:      athlete.position?.abbreviation || '',
        team:     teamRef.abbreviation || '',
        teamName: teamRef.shortDisplayName || teamRef.displayName || '',
        stats,
        // Pre-compute primary sort stat per category
        primaryStat: (() => {
          const primKey = {
            passing:   'YDS',
            rushing:   'YDS',
            receiving: 'YDS',
            defensive: 'TOT',
            kicking:   'PTS',
          }[category]
          return stats[primKey]?.value || 0
        })(),
      }
    })

    return new Response(
      JSON.stringify({
        ok: true,
        athletes,
        labels:        data.labels        || [],
        displayNames:  data.displayNames   || [],
        abbreviations: data.abbreviations  || [],
        category,
        season,
        count: athletes.length,
      }),
      { headers }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers }
    )
  }
}
