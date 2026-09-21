// scripts/warm-espn-cache.js
//
// Runs on GitHub Actions, not Vercel — that's the entire point. ESPN blocks
// requests from Vercel's server IPs with a 403; GitHub's runners are
// completely separate infrastructure, so this fetches ESPN's real data
// successfully and writes it into the same Supabase cache table the site
// and newsletter already read from (fw_espn_cache).
//
// This replaces "hope a real visitor loaded the right page recently" with
// a fixed, predictable schedule — same free ESPN data, just fetched from
// somewhere that isn't blocked, on a timer instead of on luck.
//
// Required env vars (set as GitHub repo secrets, see the workflow file):
//   SUPABASE_URL        — e.g. https://fnxoucliekhotvartyfu.supabase.co
//   SUPABASE_ANON_KEY    — the same anon key already used elsewhere in this app

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars — check repo secrets.')
  process.exit(1)
}

const ESPN_HEADERS = {
  'User-Agent': 'TheFinalWhistle/1.0 (+https://nflboxscore.com)',
  'Accept': 'application/json',
}
const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl'

// Same date-based week/seasontype math already proven correct in
// api/newsletter/send.js — keep these in sync if that logic ever changes.
function getSeasonType(now) {
  const preseasonStart = new Date('2026-08-07T00:00:00-04:00')
  const regularStart   = new Date('2026-09-09T00:00:00-04:00')
  if (now >= regularStart)   return 2
  if (now >= preseasonStart) return 1
  return 1
}
function getCurrentWeek(now) {
  const regularStart = new Date('2026-09-09T00:00:00-04:00')
  if (now < regularStart) return 1
  const week = Math.floor((now - regularStart) / (7 * 24 * 60 * 60 * 1000)) + 1
  return Math.min(Math.max(week, 1), 18)
}

// Real upsert — one row per cache_key, never accumulates duplicates.
// Requires the unique constraint on cache_key (added via migration
// alongside this script, after cleaning up ~thousands of duplicate rows
// the old per-visitor write path had left behind).
async function upsertCache(cacheKey, payload) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/fw_espn_cache?on_conflict=cache_key`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ cache_key: cacheKey, payload, fetched_at: new Date().toISOString() }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Supabase write failed for ${cacheKey}: ${res.status} ${detail.slice(0, 300)}`)
  }
}

async function espnFetch(path) {
  const res = await fetch(`${ESPN_BASE}${path}`, { headers: ESPN_HEADERS })
  if (!res.ok) throw new Error(`ESPN fetch failed: ${path} -> HTTP ${res.status}`)
  return res.json()
}

async function main() {
  const now = new Date()
  const week = getCurrentWeek(now)
  const seasonType = getSeasonType(now)

  // Last week (Monday's recap), this week, and next week (the "coming up"
  // preview) — three scoreboard calls per run, a small fixed number, not
  // one per visitor and not unbounded.
  const weeksToWarm = [...new Set([Math.max(1, week - 1), week, Math.min(18, week + 1)])]

  let scoreboardWrites = 0
  let boxScoreWrites = 0
  const errors = []

  for (const w of weeksToWarm) {
    try {
      const sb = await espnFetch(`/scoreboard?week=${w}&seasontype=${seasonType}&limit=20`)
      await upsertCache(`scoreboard:week${w}:type${seasonType}`, sb)
      scoreboardWrites++
      console.log(`✓ scoreboard:week${w}:type${seasonType} (${sb.events?.length || 0} events)`)

      // Refresh box scores for any completed game in this week's slate —
      // this is what actually keeps Monday/Tuesday/Friday's recaps fed
      // with real data instead of depending on someone having clicked
      // into that specific game recently.
      const completed = (sb.events || []).filter(ev => ev.status?.type?.completed)
      for (const ev of completed) {
        try {
          const summary = await espnFetch(`/summary?event=${ev.id}`)
          await upsertCache(`summary:${ev.id}`, summary)
          boxScoreWrites++
        } catch (e) {
          errors.push(e.message)
        }
      }
    } catch (e) {
      errors.push(e.message)
    }
  }

  console.log(`\nDone — ${scoreboardWrites} scoreboard writes, ${boxScoreWrites} box score writes, ${errors.length} errors`)
  if (errors.length) {
    console.error('Errors encountered (job still counts as successful if most writes landed):')
    errors.slice(0, 10).forEach(e => console.error(' -', e))
  }
}

main().catch(e => {
  console.error('Fatal error:', e.message)
  process.exit(1)
})
