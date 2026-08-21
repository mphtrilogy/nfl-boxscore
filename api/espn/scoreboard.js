export const config = { runtime: 'edge' }

const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl'

export default async function handler(req) {
  const url   = new URL(req.url)
  const week  = url.searchParams.get('week')
  const stype = url.searchParams.get('seasontype') || '2'
  const limit = url.searchParams.get('limit') || '20'
  const debug = url.searchParams.get('debug')

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, s-maxage=60',
  }

  try {
    let espnUrl = `${ESPN}/scoreboard?seasontype=${stype}&limit=${limit}`
    if (week) espnUrl += `&week=${week}`

    const r    = await fetch(espnUrl)
    const data = await r.json()

    // If debug mode, also fetch first completed game summary
    if (debug && data.events) {
      const completed = data.events.find(e => e.status?.type?.state === 'post')
      if (completed) {
        const sumR = await fetch(`${ESPN}/summary?event=${completed.id}`)
        const sum  = await sumR.json()
        const inspection = {
          gameId: completed.id,
          gameName: completed.name,
          topKeys: Object.keys(sum),
          hasKicking: !!sum.kicking,
          kickingType: sum.kicking ? typeof sum.kicking : 'missing',
          hasRosters: !!sum.rosters,
          boxscoreKeys: sum.boxscore ? Object.keys(sum.boxscore) : [],
          playersTeams: (sum.boxscore?.players||[]).map(t => ({
            team: t.team?.abbreviation,
            statGroups: (t.statistics||[]).map(s => ({
              name: s.name,
              labels: s.labels,
              athleteCount: s.athletes?.length,
              firstAthlete: s.athletes?.[0] ? {
                name: s.athletes[0].athlete?.displayName,
                posAbbr: s.athletes[0].athlete?.position?.abbreviation,
                posName: s.athletes[0].athlete?.position?.name,
                statsLength: s.athletes[0].stats?.length,
                stats: s.athletes[0].stats
              } : null
            }))
          }))
        }
        return new Response(JSON.stringify({ scoreboard: data, inspection }, null, 2), { headers })
      }
    }

    return new Response(JSON.stringify(data), { headers })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, events: [] }), { status: 500, headers })
  }
}
