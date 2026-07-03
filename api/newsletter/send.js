// api/newsletter/send.js
// ═══════════════════════════════════════════════════════════════════════════════
// THE FINAL WHISTLE — Newsletter Send Engine v3
//
// Send schedule (vercel.json crons):
//   Monday    08:00 ET → type=monday   ALL Sunday games (last night)
//   Tuesday   08:00 ET → type=tuesday  MNF game (last night) + waiver wire
//   Thursday  12:00 ET → type=thursday TNF preview + Start/Sit + HOF tidbit
//   Friday    08:00 ET → type=friday   TNF box score (last night) + weekend
//                                       schedule + weather flags + HOF tidbit
//
// Tiered box score display:
//   Fav team game  → FULL (scoring plays + team stats + passing/rushing/receiving)
//   All other games → CONDENSED (score + linescore + stat summary line)
//                     + "Full Box Score →" deep link to nflboxscore.com
//   All Teams selected → ALL games condensed (no fav = no full treatment)
//
// Manual trigger: POST /api/newsletter/send
//   Body: { "type": "monday", "secret": "<CRON_SECRET>" }
// ═══════════════════════════════════════════════════════════════════════════════

export const config = { runtime: 'edge' }

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY
const RESEND_KEY   = process.env.RESEND_API_KEY
const CRON_SECRET  = process.env.CRON_SECRET
const SITE_URL     = 'https://nflboxscore.com'
const FROM_EMAIL   = 'nfl@nysportsdaily.com'

// ── Team city + nickname lookup (mirrors utils/teams.js in the app) ───────────
// Used to build Google News search queries for fav team news section
const TEAM_INFO = {
  ARI:{ city:'Arizona',       nick:'Cardinals'  }, ATL:{ city:'Atlanta',        nick:'Falcons'    },
  BAL:{ city:'Baltimore',     nick:'Ravens'     }, BUF:{ city:'Buffalo',         nick:'Bills'      },
  CAR:{ city:'Carolina',      nick:'Panthers'   }, CHI:{ city:'Chicago',         nick:'Bears'      },
  CIN:{ city:'Cincinnati',    nick:'Bengals'    }, CLE:{ city:'Cleveland',       nick:'Browns'     },
  DAL:{ city:'Dallas',        nick:'Cowboys'    }, DEN:{ city:'Denver',          nick:'Broncos'    },
  DET:{ city:'Detroit',       nick:'Lions'      }, GB: { city:'Green Bay',       nick:'Packers'    },
  HOU:{ city:'Houston',       nick:'Texans'     }, IND:{ city:'Indianapolis',    nick:'Colts'      },
  JAC:{ city:'Jacksonville',  nick:'Jaguars'    }, KC: { city:'Kansas City',     nick:'Chiefs'     },
  LA: { city:'Los Angeles',   nick:'Rams'       }, LAC:{ city:'Los Angeles',     nick:'Chargers'   },
  LV: { city:'Las Vegas',     nick:'Raiders'    }, MIA:{ city:'Miami',           nick:'Dolphins'   },
  MIN:{ city:'Minnesota',     nick:'Vikings'    }, NE: { city:'New England',     nick:'Patriots'   },
  NO: { city:'New Orleans',   nick:'Saints'     }, NYG:{ city:'New York',        nick:'Giants'     },
  NYJ:{ city:'New York',      nick:'Jets'       }, PHI:{ city:'Philadelphia',    nick:'Eagles'     },
  PIT:{ city:'Pittsburgh',    nick:'Steelers'   }, SEA:{ city:'Seattle',         nick:'Seahawks'   },
  SF: { city:'San Francisco', nick:'49ers'      }, TB: { city:'Tampa Bay',       nick:'Buccaneers' },
  TEN:{ city:'Tennessee',     nick:'Titans'     }, WAS:{ city:'Washington',      nick:'Commanders' },
}

// ESPN team IDs for news API
const ESPN_NEWS_IDS = {
  ARI:22, ATL:1,  BAL:33, BUF:2,  CAR:29, CHI:3,  CIN:4,  CLE:5,
  DAL:6,  DEN:7,  DET:8,  GB:9,   HOU:34, IND:11, JAC:30, KC:12,
  LA:14,  LAC:24, LV:13,  MIA:15, MIN:16, NE:17,  NO:18,  NYG:19,
  NYJ:20, PHI:21, PIT:23, SEA:26, SF:25,  TB:27,  TEN:10, WAS:28,
}
const OUTDOOR_STADIUMS = new Set([
  'BUF','CHI','CLE','DAL','DEN','GB','KC','LV','MIA','NE',
  'NYG','NYJ','PHI','PIT','SEA','SF','TEN','WAS','BAL','CIN','JAC','NO','CAR',
])

const STADIUM_COORDS = {
  ARI:{lat:33.53,lon:-112.26}, ATL:{lat:33.76,lon:-84.40},
  BAL:{lat:39.28,lon:-76.62},  BUF:{lat:42.77,lon:-78.79},
  CAR:{lat:35.22,lon:-80.84},  CHI:{lat:41.86,lon:-87.62},
  CIN:{lat:39.10,lon:-84.52},  CLE:{lat:41.50,lon:-81.70},
  DAL:{lat:32.75,lon:-97.09},  DEN:{lat:39.74,lon:-105.02},
  DET:{lat:42.34,lon:-83.05},  GB:{lat:44.50,lon:-88.06},
  HOU:{lat:29.76,lon:-95.37},  IND:{lat:39.76,lon:-86.16},
  JAC:{lat:30.32,lon:-81.64},  KC:{lat:39.05,lon:-94.48},
  LA:{lat:33.95,lon:-118.34},  LAC:{lat:33.95,lon:-118.34},
  LV:{lat:36.09,lon:-115.18},  MIA:{lat:25.96,lon:-80.24},
  MIN:{lat:44.97,lon:-93.26},  NE:{lat:42.09,lon:-71.26},
  NO:{lat:29.95,lon:-90.08},   NYG:{lat:40.81,lon:-74.07},
  NYJ:{lat:40.81,lon:-74.07},  PHI:{lat:39.90,lon:-75.17},
  PIT:{lat:40.44,lon:-80.01},  SEA:{lat:47.59,lon:-122.33},
  SF:{lat:37.40,lon:-121.97},  TB:{lat:27.98,lon:-82.50},
  TEN:{lat:36.17,lon:-86.77},  WAS:{lat:38.91,lon:-76.86},
}

// ── Fantasy HOF data (rotating tidbit for Thu/Fri) ───────────────────────────
const FANTASY_HOF = [
  // ── All-time single game explosion performances ──
  { player:'Alvin Kamara',        team:'NO',  pos:'RB', year:2020, week:16, pts:61.8,
    line:'22 rush yds, 6 rush TD · 6 rec, 46 yds',
    note:'Six rushing TDs on Christmas Day — tied the all-time NFL single-game TD record. The greatest fantasy game ever played.' },
  { player:'Patrick Mahomes',     team:'KC',  pos:'QB', year:2018, week:6,  pts:56.7,
    line:'478 yds, 6 TD, 0 INT',
    note:'Part of a historic 50-TD season at age 23. Youngest QB MVP ever. Redefined what a fantasy QB could be.' },
  { player:'Jamaal Charles',      team:'KC',  pos:'RB', year:2013, week:14, pts:55.2,
    line:'6 rush TD, 1 rec TD · 195 scrimmage yds',
    note:'Seven touchdowns in a single game — tied the NFL single-game TD record. The most electric fantasy performance of the 2010s.' },
  { player:'Marshall Faulk',      team:'STL', pos:'RB', year:2000, week:15, pts:54.6,
    line:'5 TD, 220 scrimmage yds',
    note:'Greatest fantasy season ever — 26 TDs, 2,189 scrimmage yards. The Greatest Show on Turf at its peak.' },
  { player:'LaDainian Tomlinson', team:'SD',  pos:'RB', year:2006, week:16, pts:55.4,
    line:'28 car, 193 yds, 3 TD · 4 rec, 57 yds, 1 TD',
    note:'The greatest fantasy RB season ever — 28 TDs, 1,815 rush yards. The record still stands.' },
  { player:'Josh Allen',          team:'BUF', pos:'QB', year:2020, week:15, pts:54.1,
    line:'4 pass TD, 1 rush TD · 375 pass yds',
    note:'Redefined what a dual-threat fantasy QB could deliver. The ceiling no one had seen before.' },
  { player:'Tyreek Hill',         team:'KC',  pos:'WR', year:2020, week:12, pts:50.2,
    line:'13 rec, 269 yds, 3 TD',
    note:'269 receiving yards — one of the greatest single-game WR performances in NFL history.' },
  { player:'Priest Holmes',       team:'KC',  pos:'RB', year:2003, week:8,  pts:53.2,
    line:'6 TD, 148 yds',
    note:'27 TD season — dominated fantasy football for three straight years before injuries derailed him.' },
  { player:'Adrian Peterson',     team:'MIN', pos:'RB', year:2012, week:16, pts:50.1,
    line:'34 car, 212 yds, 2 TD',
    note:'2,097 rush yards — came within 9 yards of Eric Dickerson's all-time single-season record.' },
  { player:'Calvin Johnson',      team:'DET', pos:'WR', year:2012, week:16, pts:49.3,
    line:'11 rec, 225 yds, 1 TD',
    note:'Single-season record 1,964 receiving yards. Megatron at his absolute peak, on a team that won 4 games.' },
  { player:'Jerry Rice',          team:'SF',  pos:'WR', year:1987, week:11, pts:52.0,
    line:'3 rec TD · 12 rec, 204 yds',
    note:'22 TD season in a strike-shortened year. The greatest receiver of all time at age 25.' },
  { player:'Randy Moss',          team:'MIN', pos:'WR', year:1998, week:8,  pts:48.7,
    line:'5 TD, 190 yds, 8 rec',
    note:'Rookie record 17 TD season. The Vikings went 15-1 and nobody saw Randy coming.' },
  // ── Season-long dominance ──
  { player:'Barry Sanders',       team:'DET', pos:'RB', year:1997, week:14, pts:48.2,
    line:'23 car, 167 yds, 2 TD',
    note:'2,358 total yards in 1997. The most elusive runner in NFL history — retired at 30 with 15,269 career rush yards.' },
  { player:'Emmitt Smith',        team:'DAL', pos:'RB', year:1995, week:12, pts:46.8,
    line:'25 car, 147 yds, 3 TD',
    note:'25 TD season — part of a dynasty. All-time NFL rushing record holder at 18,355 yards.' },
  { player:'Steve Young',         team:'SF',  pos:'QB', year:1994, week:9,  pts:52.4,
    line:'6 TD, 325 yds, 0 INT',
    note:'36 TD season, 112.8 passer rating. The year he finally stepped out of Montana's shadow.' },
  { player:'Dan Marino',          team:'MIA', pos:'QB', year:1984, week:12, pts:49.6,
    line:'5 TD, 422 yds, 0 INT',
    note:'48 TD passes and 5,084 yards in 1984 — records that stood for 27 years. The greatest arm of his era.' },
  { player:'Kurt Warner',         team:'STL', pos:'QB', year:1999, week:10, pts:51.3,
    line:'5 TD, 441 yds, 1 INT',
    note:'Bagged groceries the year before. Then threw for 4,353 yards and 41 TDs and won the Super Bowl MVP.' },
  { player:'Peyton Manning',      team:'IND', pos:'QB', year:2004, week:13, pts:53.8,
    line:'6 TD, 383 yds, 0 INT',
    note:'49 TD passes in 2004 — a record that stood until Brady broke it. Fantasy QBs didn't get this good until Mahomes.' },
  { player:'Tom Brady',           team:'NE',  pos:'QB', year:2007, week:14, pts:55.1,
    line:'5 TD, 399 yds, 0 INT',
    note:'50 TD passes in 2007 — a record at the time. The Patriots went 16-0. The greatest offensive season in NFL history.' },
  { player:'Aaron Rodgers',       team:'GB',  pos:'QB', year:2011, week:6,  pts:51.4,
    line:'4 TD, 396 yds, 0 INT',
    note:'45 TDs, 6 INTs, 122.5 passer rating in 2011. The highest single-season QB rating in NFL history.' },
  // ── Unforgettable single weeks ──
  { player:'Shaun Alexander',     team:'SEA', pos:'RB', year:2005, week:10, pts:49.6,
    line:'27 car, 173 yds, 3 TD',
    note:'27 TDs and 1,880 rush yards in 2005. The last old-school workhorse RB to win MVP.' },
  { player:'Clinton Portis',      team:'DEN', pos:'RB', year:2003, week:9,  pts:50.4,
    line:'22 car, 218 yds, 5 TD',
    note:'5 rushing TDs in a game. Traded to Washington after the season for Champ Bailey — one of the most shocking deals ever.' },
  { player:'Chris Johnson',       team:'TEN', pos:'RB', year:2009, week:15, pts:47.8,
    line:'34 car, 204 yds, 1 TD',
    note:'2,006 rush yards in 2009 — only the 6th player in NFL history to reach 2,000 in a season.' },
  { player:'DeMarco Murray',      team:'DAL', pos:'RB', year:2014, week:14, pts:46.3,
    line:'24 car, 149 yds, 2 TD + 3 rec, 22 yds',
    note:'1,845 rush yards on the greatest offensive line in the NFL. Every week felt like a lock.' },
  { player:'Arian Foster',        team:'HOU', pos:'RB', year:2010, week:1,  pts:54.2,
    line:'33 car, 231 yds, 3 TD · 4 rec, 55 yds, 1 TD',
    note:'Burst onto the scene with 4 TDs in Week 1 on an undrafted contract. Owned fantasy football for 3 seasons.' },
  { player:'Terrell Owens',       team:'SF',  pos:'WR', year:2000, week:14, pts:47.1,
    line:'20 rec, 283 yds, 3 TD',
    note:'20 receptions for 283 yards in a single game — the famous "Monday Night Miracle" against the Giants.' },
  { player:'Antonio Brown',       team:'PIT', pos:'WR', year:2014, week:10, pts:48.3,
    line:'16 rec, 189 yds, 3 TD',
    note:'The most dominant WR of his era. Three straight seasons of 1,400+ yards during his Pittsburgh prime.' },
  { player:'Marvin Harrison',     team:'IND', pos:'WR', year:2002, week:13, pts:46.4,
    line:'11 rec, 172 yds, 2 TD',
    note:'143 receptions in 2002 — a record that stood for 10 years. The quietest Hall of Famer ever.' },
  { player:'Rob Gronkowski',      team:'NE',  pos:'TE', year:2011, week:7,  pts:47.6,
    line:'8 rec, 143 yds, 3 TD',
    note:'17 TD season in 2011 — the all-time TE record. Changed the position forever. The best TE in NFL history.' },
  { player:'Tony Gonzalez',       team:'KC',  pos:'TE', year:2004, week:12, pts:43.8,
    line:'10 rec, 133 yds, 3 TD',
    note:'1,258 yards and 7 TDs in 2004. The greatest TE of his era — owned the position for a decade before Gronk arrived.' },
  { player:'Jimmy Graham',        team:'NO',  pos:'TE', year:2011, week:13, pts:45.2,
    line:'9 rec, 145 yds, 4 TD',
    note:'The year Jimmy Graham made every team wish they had a receiving TE. 99 catches, 1,310 yards, 11 TDs.' },
  { player:'Travis Kelce',        team:'KC',  pos:'TE', year:2020, week:12, pts:46.1,
    line:'10 rec, 159 yds, 3 TD',
    note:'5 straight 1,000-yard seasons and counting. The most reliable TE in fantasy history.' },
  { player:'Michael Vick',        team:'ATL', pos:'QB', year:2002, week:11, pts:48.9,
    line:'2 pass TD, 3 rush TD · 173 rush yds',
    note:'The original dual-threat fantasy QB. Nobody had seen a QB run like this. Changed the position forever.' },
  { player:'Cam Newton',          team:'CAR', pos:'QB', year:2015, week:9,  pts:51.2,
    line:'3 pass TD, 2 rush TD · 271 pass yds, 48 rush yds',
    note:'35 TD passes plus 10 rushing TDs in 2015 MVP season. Every week was a fantasy bonanza.' },
  { player:'Lamar Jackson',       team:'BAL', pos:'QB', year:2019, week:12, pts:57.3,
    line:'5 pass TD, 1 rush TD · 442 total yds',
    note:'Unanimous MVP with 36 pass TDs and 7 rush TDs. Shattered every QB rushing record ever set.' },
  { player:'Davante Adams',       team:'GB',  pos:'WR', year:2020, week:14, pts:47.2,
    line:'10 rec, 173 yds, 3 TD',
    note:'18 TD season — the most by a WR in a decade. The cleanest route runner in the league.' },
  { player:'Justin Jefferson',    team:'MIN', pos:'WR', year:2022, week:15, pts:48.9,
    line:'12 rec, 223 yds, 2 TD',
    note:'Broke Calvin Johnson's receiving yards record in 2022. The new measuring stick for elite WRs.' },
  { player:'Cooper Kupp',         team:'LA',  pos:'WR', year:2021, week:15, pts:49.4,
    line:'9 rec, 108 yds, 3 TD',
    note:'Triple Crown season — most receptions (145), most yards (1,947), most TDs (16). The greatest PPR season ever.' },
  { player:'Christian McCaffrey', team:'CAR', pos:'RB', year:2019, week:12, pts:52.6,
    line:'16 car, 108 rush yds, 2 rush TD · 8 rec, 81 yds, 1 TD',
    note:'2,392 scrimmage yards in 2019 — the first player since Marshall Faulk to top 2,000 in a season.' },
  { player:'Derrick Henry',       team:'TEN', pos:'RB', year:2020, week:8,  pts:51.8,
    line:'28 car, 178 yds, 2 TD · 3 rec, 17 yds, 1 TD',
    note:'2,027 rush yards in 2020 — the 5th player ever to top 2,000. Built like a fullback, runs like a tailback.' },
  { player:'Frank Gore',          team:'SF',  pos:'RB', year:2006, week:14, pts:44.1,
    line:'24 car, 212 yds, 2 TD',
    note:'16,000 career rush yards — the third most in NFL history. Quietly one of the most consistent fantasy RBs of any era.' },
]

// ── ESPN API helpers ──────────────────────────────────────────────────────────

async function espnFetch(path) {
  try {
    const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl${path}`)
    if (!r.ok) return null
    return r.json()
  } catch { return null }
}

// Determine week context per send type
// Monday  → recapWeek = last completed week (all Sunday games)
// Tuesday → recapWeek = current week (for MNF which just finished)
// Thu/Fri → currentWeek = this week's games
async function getWeekContext(sendType) {
  const sb   = await espnFetch('/scoreboard')
  const week = sb?.week?.number || 1
  if (sendType === 'monday') {
    // Sunday games belong to the week that just completed
    return { currentWeek: week, recapWeek: Math.max(1, week - 1) }
  }
  if (sendType === 'tuesday') {
    // MNF is the last game of the current week
    return { currentWeek: week, recapWeek: week }
  }
  // Thursday/Friday: looking ahead at this week
  return { currentWeek: week, recapWeek: null }
}

// Season type helper — mirrors the app's espnSeasonType()
// ESPN: seasontype=1 (preseason Aug 7–Sep 8), seasontype=2 (regular Sep 9+)
function getSeasonType() {
  const now            = new Date()
  const preseasonStart = new Date('2026-08-07T00:00:00-04:00')
  const regularStart   = new Date('2026-09-09T00:00:00-04:00')
  if (now >= regularStart)   return 2
  if (now >= preseasonStart) return 1
  return 1  // default to preseason during off-season for testing
}

async function getWeekEvents(week) {
  const st = getSeasonType()
  const sb = await espnFetch(`/scoreboard?week=${week}&seasontype=${st}&limit=20`)
  return sb?.events || []
}

async function getGameSummary(eventId) {
  try {
    const r = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${eventId}`
    )
    if (!r.ok) return null
    return r.json()
  } catch { return null }
}

// Filter to games that completed in the last N hours
function completedWithinHours(events, hours) {
  const cutoff = Date.now() - hours * 3600 * 1000
  return events.filter(ev => {
    const completed = ev.status?.type?.completed
    const gameTime  = new Date(ev.date).getTime()
    // Game started within window AND is completed
    return completed && gameTime > cutoff
  })
}

// For Monday: all completed Sunday games (up to 48h window)
// For Tuesday: the Monday Night game specifically (up to 30h window)
// For Friday: the Thursday Night game (up to 30h window)
function getTargetEvents(events, sendType) {
  if (sendType === 'monday')  return completedWithinHours(events, 48)
  if (sendType === 'tuesday') return completedWithinHours(events, 30)
  if (sendType === 'friday')  return completedWithinHours(events, 30)
  return []
}

// ── Weather fetcher (Open-Meteo, no API key) ──────────────────────────────────
async function fetchGameWeather(homeTeam, gameDate) {
  if (!OUTDOOR_STADIUMS.has(homeTeam)) return null
  const coords = STADIUM_COORDS[homeTeam]
  if (!coords) return null

  // Get forecast for the game date
  const date = gameDate ? new Date(gameDate).toISOString().split('T')[0] : null
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}` +
    `&daily=precipitation_sum,wind_speed_10m_max,temperature_2m_min,temperature_2m_max,weather_code` +
    `&wind_speed_unit=mph&temperature_unit=fahrenheit&forecast_days=7&timezone=America%2FNew_York`

  try {
    const r    = await fetch(url)
    const data = await r.json()
    if (!data?.daily) return null

    // Find the forecast day matching the game date
    const days  = data.daily
    const idx   = date ? days.time.findIndex(t => t === date) : 0
    const i     = idx >= 0 ? idx : 0

    const wind  = Math.round(days.wind_speed_10m_max[i] || 0)
    const rain  = (days.precipitation_sum[i] || 0)
    const tMin  = Math.round(days.temperature_2m_min[i] || 50)
    const tMax  = Math.round(days.temperature_2m_max[i] || 70)
    const code  = days.weather_code[i] || 0

    const condIcon = code <= 1 ? 'sunny' : code <= 3 ? 'cloudy' : code <= 48 ? 'foggy' :
                     code <= 67 ? 'rainy' : code <= 77 ? 'snowy' : 'stormy'

    // Fantasy impact flags — what actually matters
    const flags = []
    if (wind >= 25)  flags.push({ icon:'wind', text:`${wind} mph wind — fade pass catchers, WRs/TEs at risk` })
    if (wind >= 20 && wind < 25) flags.push({ icon:'wind', text:`${wind} mph wind — monitor kickers and deep threats` })
    if (rain > 0.2)  flags.push({ icon:"rain", text:`Rain expected (${rain.toFixed(1)} in) — favor RBs, fade kickers` })
    if (tMin < 25)   flags.push({ icon:'cold', text:`Extreme cold (low ${tMin}°F) — expect run-heavy game plan` })
    if (tMin < 35 && tMin >= 25) flags.push({ icon:'snow', text:`Cold game (low ${tMin}°F) — slight RB boost` })

    return {
      wind, rain: rain.toFixed(2), tMin, tMax, condIcon,
      flags,
      isNeutral: flags.length === 0,
      summary: flags.length ? flags.map(f => f.text).join(' · ') : `${condIcon} ${tMax}°F · No weather concerns`,
    }
  } catch { return null }
}

// ── Box score parser ──────────────────────────────────────────────────────────
function parseGameSummary(summary, eventMeta) {
  if (!summary) return null

  const comps    = summary.header?.competitions?.[0]
  const homeComp = comps?.competitors?.find(c => c.homeAway === 'home')
  const awayComp = comps?.competitors?.find(c => c.homeAway === 'away')
  if (!homeComp || !awayComp) return null

  const home = {
    abbr:   homeComp.team?.abbreviation || '?',
    name:   homeComp.team?.shortDisplayName || homeComp.team?.displayName || '?',
    score:  parseInt(homeComp.score || 0),
    record: homeComp.record?.[0]?.summary || '',
  }
  const away = {
    abbr:   awayComp.team?.abbreviation || '?',
    name:   awayComp.team?.shortDisplayName || awayComp.team?.displayName || '?',
    score:  parseInt(awayComp.score || 0),
    record: awayComp.record?.[0]?.summary || '',
  }

  const winner     = home.score >= away.score ? home.abbr : away.abbr
  const isOT       = (comps?.status?.period || 4) > 4
  const venue      = summary.gameInfo?.venue?.fullName || ''
  const attendance = summary.gameInfo?.attendance
    ? summary.gameInfo.attendance.toLocaleString() : ''
  const gameDate   = eventMeta?.date || null

  // Quarter-by-quarter
  const awayQ = awayComp.linescores?.map(l => l.value ?? l.displayValue) || []
  const homeQ = homeComp.linescores?.map(l => l.value ?? l.displayValue) || []

  // Scoring plays
  const scoringPlays = (summary.scoringPlays || []).map(p => ({
    period:    p.period?.number,
    clock:     p.clock?.displayValue || '',
    team:      p.team?.abbreviation || '',
    text:      p.text || '',
    awayScore: p.awayScore ?? '',
    homeScore: p.homeScore ?? '',
  }))

  // Team stats
  const bsTeams = summary.boxscore?.teams || []
  const parseTeamStats = (abbr) => {
    const norm = a => a?.replace('LAR','LA').replace('WSH','WAS').replace('JAX','JAC') || ''
    const td   = bsTeams.find(t => norm(t.team?.abbreviation) === norm(abbr))
    const out  = {}
    td?.statistics?.forEach(s => { out[s.name] = s.displayValue })
    return out
  }

  // Player stats — structured per position category
  const bsPlayers  = summary.boxscore?.players || []
  const byPos      = { QB:[], RB:[], WR:[], K:[], DEF:[] }

  const COL_KEYS = {
    passing:   ['C/ATT','YDS','AVG','TD','INT','QBR'],
    rushing:   ['CAR','YDS','AVG','TD','LNG'],
    receiving: ['REC','TGT','YDS','AVG','TD','LNG'],
    kicking:   ['FG','FGA','LONG','XP','XPA','PTS'],
    defensive: ['TOT','SOLO','SACKS','TFL','PD','INT'],
  }
  const POS_KEY = {
    passing:'QB', rushing:'RB', receiving:'WR', kicking:'K', defensive:'DEF',
  }

  bsPlayers.forEach(teamData => {
    const team = teamData.team?.abbreviation || ''
    teamData.statistics?.forEach(statGroup => {
      const cat  = statGroup.name
      const pos  = POS_KEY[cat]
      if (!pos) return
      const cols = COL_KEYS[cat] || []

      statGroup.athletes?.forEach(a => {
        const name = a.athlete?.displayName || ''
        if (!name) return
        const vals = {}
        statGroup.labels?.forEach((lbl, i) => { vals[lbl] = a.stats?.[i] ?? '0' })

        // Skip zero-stat rows
        const yds = parseFloat(vals['YDS'] || 0)
        const td  = parseFloat(vals['TD']  || 0)
        const rec = parseFloat(vals['REC'] || 0)
        const car = parseFloat(vals['CAR'] || 0)
        const tot = parseFloat(vals['TOT'] || 0)
        const pts = parseFloat(vals['PTS'] || 0)
        if (!yds && !td && !rec && !car && !tot && !pts) return

        // Calculate both scoring formats at parse time
        // Passing and rushing are identical in PPR vs STD
        // Only receiving differs — PPR adds +1 per reception
        let fpts_base = 0
        let rec_bonus = 0
        if (cat === 'passing') {
          fpts_base = (yds / 25) + (td * 6) - (parseFloat(vals['INT'] || 0) * 2)
        } else if (cat === 'rushing') {
          fpts_base = (yds / 10) + (td * 6)
        } else if (cat === 'receiving') {
          fpts_base = (yds / 10) + (td * 6)
          rec_bonus = rec  // +1 per reception in PPR only
        }

        const fpts_std = Math.round(fpts_base * 10) / 10
        const fpts_ppr = Math.round((fpts_base + rec_bonus) * 10) / 10

        byPos[pos]?.push({
          name, team, pos, cols, vals,
          fpts_std,
          fpts_ppr,
          fpts: fpts_ppr,  // default for any legacy references
        })
      })
    })
  })

  // Best condensed stat line for each team (QB + top rusher/receiver)
  const buildStatLine = (teamAbbr) => {
    const qb  = byPos.QB?.find(p => p.team === teamAbbr)
    const rb  = byPos.RB?.filter(p => p.team === teamAbbr).sort((a,b)=>b.fpts-a.fpts)[0]
    const wr  = byPos.WR?.filter(p => p.team === teamAbbr).sort((a,b)=>b.fpts-a.fpts)[0]
    const parts = []
    if (qb) {
      const ca  = qb.vals['C/ATT'] || '—'
      const yds = qb.vals['YDS'] || '0'
      const tds = qb.vals['TD']  || '0'
      const int = qb.vals['INT'] || '0'
      parts.push(`${qb.name}: ${ca}, ${yds} yds, ${tds} TD${int !== '0' ? `, ${int} INT` : ''}`)
    }
    if (rb) {
      parts.push(`${rb.name}: ${rb.vals['CAR']||'?'} car, ${rb.vals['YDS']||'?'} yds${rb.vals['TD']&&rb.vals['TD']!=='0'?`, ${rb.vals['TD']} TD`:''}`)
    }
    if (wr) {
      parts.push(`${wr.name}: ${wr.vals['REC']||'?'} rec, ${wr.vals['YDS']||'?'} yds${wr.vals['TD']&&wr.vals['TD']!=='0'?`, ${wr.vals['TD']} TD`:''}`)
    }
    return parts
  }

  return {
    home, away, winner, isOT, venue, attendance, gameDate,
    awayQ, homeQ, scoringPlays,
    homeStats: parseTeamStats(home.abbr),
    awayStats: parseTeamStats(away.abbr),
    byPos,
    awayStatLine: buildStatLine(away.abbr),
    homeStatLine: buildStatLine(home.abbr),
    eventId: eventMeta?.id,
  }
}

// ── CSS (inlined in every email) ──────────────────────────────────────────────
const BASE_CSS = `
body{margin:0;padding:0;background:#f0ebe0;font-family:Georgia,serif}
.wrap{max-width:620px;margin:0 auto;background:#f5f0e8}
/* Masthead */
.mast{background:#1a1209;padding:20px 24px 14px;border-bottom:3px double #c8a84b}
.mast-logo{font-size:28px;font-weight:700;color:#c8a84b;letter-spacing:-.5px}
.mast-sub{font-family:monospace;font-size:8px;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.35);margin-top:3px}
.mast-date{font-family:monospace;font-size:9px;color:rgba(255,255,255,.45);margin-top:6px;letter-spacing:.08em}
/* Section labels */
.sec-label{font-family:monospace;font-size:8px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#8b1a1a;padding:12px 18px 7px;border-bottom:2px solid rgba(42,31,14,.18);display:block}
/* Full game card */
.gc{background:#1a1209;margin:8px 0;border-left:4px solid #c8a84b}
.gc-head{padding:12px 16px;display:table;width:100%;box-sizing:border-box}
.gc-team{display:table-cell;width:38%;vertical-align:middle}
.gc-team-r{display:table-cell;width:38%;vertical-align:middle;text-align:right}
.gc-mid{display:table-cell;width:24%;text-align:center;vertical-align:middle}
.gc-abbr{font-size:22px;font-weight:700;font-family:Georgia,serif}
.gc-win{color:#c8a84b}.gc-los{color:rgba(255,255,255,.38)}
.gc-name{font-family:monospace;font-size:8px;color:rgba(255,255,255,.32);text-transform:uppercase;letter-spacing:.06em;margin-top:2px}
.gc-rec{font-family:monospace;font-size:7px;color:rgba(255,255,255,.2);margin-top:1px}
.gc-score{font-size:34px;font-weight:700;color:#fff;letter-spacing:-1px}
.gc-matchup{font-family:monospace;font-size:8px;color:rgba(255,255,255,.25);letter-spacing:.08em}
.gc-final{font-family:monospace;font-size:7px;color:rgba(200,168,75,.55);letter-spacing:.14em;text-transform:uppercase;margin-top:4px}
/* Linescore */
.ls{width:100%;border-collapse:collapse;font-family:monospace;font-size:9px}
.ls td{padding:4px 8px;border:1px solid rgba(255,255,255,.06);text-align:center;color:rgba(255,255,255,.55)}
.ls td.tm{text-align:left;font-weight:700;color:#c8a84b;padding-left:14px;width:34px}
.ls td.tot{font-weight:700;color:#fff;border-left:2px solid rgba(200,168,75,.25)}
.ls td.hdr{color:rgba(255,255,255,.18);font-size:7px}
/* Scoring plays */
.sp-lbl{font-family:monospace;font-size:7px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:rgba(200,168,75,.55);padding:8px 14px 4px;display:block}
.sp{padding:0 14px 10px}
.sp-row{display:table;width:100%;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.04)}
.sp-q{display:table-cell;width:20px;color:rgba(200,168,75,.65);font-weight:700;font-family:monospace;font-size:9px;vertical-align:top;padding-top:1px}
.sp-clk{display:table-cell;width:46px;color:rgba(255,255,255,.28);font-family:monospace;font-size:9px;vertical-align:top;padding-top:1px}
.sp-tm{display:table-cell;width:30px;color:#c8a84b;font-weight:700;font-family:monospace;font-size:9px;vertical-align:top;padding-top:1px}
.sp-txt{display:table-cell;color:rgba(255,255,255,.72);font-family:monospace;font-size:9px;line-height:1.4;padding-right:6px}
.sp-sc{display:table-cell;width:38px;color:#fff;font-weight:700;font-family:monospace;font-size:9px;text-align:right;white-space:nowrap;vertical-align:top}
/* Team stats */
.ts-lbl{font-family:monospace;font-size:7px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:rgba(200,168,75,.55);padding:6px 14px 4px;display:block}
.ts{width:100%;border-collapse:collapse;font-family:monospace;font-size:10px}
.ts td{padding:5px 8px;border-bottom:1px solid rgba(42,31,14,.1)}
.ts-lc{text-align:center;color:#6b5f4e;font-size:8px;letter-spacing:.06em}
.ts-vc{font-weight:700;color:#1a1209;text-align:center}
.ts-vw{color:#1a5c1a;font-weight:700}
.ts-hdr{background:rgba(42,31,14,.09);font-size:8px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}
/* Player stat tables */
.ps-lbl{font-family:monospace;font-size:7px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:rgba(42,31,14,.45);padding:8px 18px 4px;display:block}
.ps{width:100%;border-collapse:collapse;font-family:monospace;font-size:10px}
.ps th{background:rgba(42,31,14,.08);padding:4px 6px;font-size:7px;letter-spacing:.1em;text-transform:uppercase;color:#6b5f4e;text-align:center;border-bottom:1px solid rgba(42,31,14,.14)}
.ps th.l{text-align:left}
.ps td{padding:5px 6px;border-bottom:1px solid rgba(42,31,14,.07);color:#1a1209;text-align:center}
.ps td.pn{text-align:left;font-weight:600;font-family:Georgia,serif;font-size:11px;color:#1a1209}
.ps td.tm{color:#9e9080;font-size:8px}
.ps td.fp{font-weight:700;color:#1a5c1a}
.ps td.fp-gold{font-weight:700;color:#9a7a2e}
.ps tr.sq td{background:rgba(200,168,75,.1) !important;border-left:3px solid #c8a84b}
.sq-tag{display:inline-block;background:#c8a84b;color:#1a1209;font-family:monospace;font-size:6px;font-weight:700;letter-spacing:.1em;padding:1px 4px;border-radius:2px;margin-left:4px;vertical-align:middle}
/* Condensed game card */
.cg{background:#1a1209;margin:5px 0;border-left:2px solid rgba(200,168,75,.3)}
.cg-head{display:table;width:100%;padding:9px 14px;box-sizing:border-box}
.cg-t{display:table-cell;width:35%;vertical-align:middle}
.cg-tr{display:table-cell;width:35%;vertical-align:middle;text-align:right}
.cg-m{display:table-cell;width:30%;text-align:center;vertical-align:middle}
.cg-abbr{font-size:16px;font-weight:700;font-family:Georgia,serif}
.cg-sc{font-size:22px;font-weight:700;color:#fff;letter-spacing:-1px}
.cg-fin{font-family:monospace;font-size:7px;color:rgba(200,168,75,.5);letter-spacing:.12em;text-transform:uppercase;margin-top:3px}
.cg-line{font-family:monospace;font-size:8px;color:rgba(255,255,255,.4);padding:2px 14px 6px;line-height:1.5;letter-spacing:.02em}
.cg-link{display:block;text-align:right;font-family:monospace;font-size:8px;color:#c8a84b;text-decoration:none;padding:0 14px 8px;letter-spacing:.06em}
/* Waiver wire */
.ww-item{padding:9px 18px;border-bottom:1px solid rgba(42,31,14,.1)}
.ww-name{font-family:Georgia,serif;font-size:14px;font-weight:700;color:#1a1209}
.ww-badge{display:inline-block;font-family:monospace;font-size:7px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:1px 6px;border-radius:2px;margin-right:5px}
.ww-add{background:#1a5c1a;color:#fff}
.ww-hi{color:#1a5c1a;font-family:monospace;font-size:8px;font-weight:700}
.ww-md{color:#d97706;font-family:monospace;font-size:8px;font-weight:700}
.ww-reason{font-family:monospace;font-size:9px;color:#6b5f4e;margin-top:3px;letter-spacing:.02em}
.ww-stat{font-family:monospace;font-size:8px;color:#9e9080;margin-top:2px}
/* Weather flags */
.wx-item{display:table;width:100%;padding:7px 18px;border-bottom:1px solid rgba(42,31,14,.08);box-sizing:border-box}
.wx-flag{display:table-cell;width:20px;font-size:14px;vertical-align:top}
.wx-game{display:table-cell;font-family:monospace;font-size:10px;font-weight:700;color:#1a1209;vertical-align:top;padding-right:8px;white-space:nowrap;width:80px}
.wx-text{display:table-cell;font-family:monospace;font-size:9px;color:#6b5f4e;vertical-align:top;line-height:1.45}
.wx-ok{font-family:monospace;font-size:9px;color:#9e9080;padding:6px 18px;font-style:italic}
/* HOF tidbit */
.hof{background:#1a1209;margin:8px 0;padding:14px 18px;border-left:4px solid #c8a84b}
.hof-label{font-family:monospace;font-size:7px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:rgba(200,168,75,.55);margin-bottom:8px}
.hof-player{font-family:Georgia,serif;font-size:20px;font-weight:700;color:#c8a84b}
.hof-meta{font-family:monospace;font-size:8px;color:rgba(255,255,255,.4);margin-top:3px;letter-spacing:.06em}
.hof-pts{font-family:Georgia,serif;font-size:36px;font-weight:700;color:#fff;line-height:1}
.hof-pts-lbl{font-size:13px;color:rgba(255,255,255,.4);margin-left:3px}
.hof-line{font-family:monospace;font-size:9px;color:rgba(255,255,255,.55);margin-top:5px;letter-spacing:.03em}
.hof-note{font-family:Georgia,serif;font-size:12px;color:rgba(255,255,255,.65);margin-top:8px;line-height:1.55;font-style:italic}
/* Squad summary */
.sq-sum{background:rgba(200,168,75,.07);border-left:3px solid #c8a84b;padding:10px 14px;margin:8px 0;font-family:Georgia,serif;font-size:13px;line-height:1.6;color:#1a1209;font-style:italic}
/* Callout */
.callout{background:rgba(200,168,75,.07);border-left:3px solid #c8a84b;padding:9px 14px;margin:8px 18px;font-family:Georgia,serif;font-size:12px;line-height:1.6;color:#1a1209;font-style:italic}
/* Divider */
.div{height:1px;background:rgba(42,31,14,.12);margin:4px 0}
/* CTA */
.cta-wrap{text-align:center;padding:10px 0 14px}
.cta{display:inline-block;background:#c8a84b;color:#1a1209;font-family:monospace;font-size:9px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;padding:9px 20px;text-decoration:none;border-radius:2px}
.cta-dk{background:#1a1209;color:#c8a84b;border:1px solid #c8a84b}
/* Footer */
.foot{background:#1a1209;padding:14px 20px;text-align:center}
.foot-brand{font-family:Georgia,serif;font-size:13px;font-weight:700;color:#c8a84b}
.foot-links{font-family:monospace;font-size:8px;color:rgba(255,255,255,.35);margin-top:5px;letter-spacing:.06em}
.foot-links a{color:rgba(255,255,255,.4);text-decoration:none}
.foot-unsub{font-family:monospace;font-size:7px;color:rgba(255,255,255,.2);margin-top:7px;letter-spacing:.06em}
.foot-unsub a{color:rgba(255,255,255,.25);text-decoration:none}
`

// ── Scoring mode helper ───────────────────────────────────────────────────────
// Always use this to get a player's fantasy points — never access .fpts directly
// in render functions. mode = 'ppr' | 'std'
function fp(player, mode) {
  return mode === 'std' ? (player.fpts_std ?? player.fpts) : (player.fpts_ppr ?? player.fpts)
}

function fpLabel(mode) {
  return mode === 'std' ? 'STD' : 'PPR'
}
function shell(subject, dateStr, weekNum, sendLabel, mode = 'ppr') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${subject}</title>
<style>${BASE_CSS}</style>
</head>
<body>
<div class="wrap">
<div class="mast">
  <div class="mast-logo">The Final Whistle</div>
  <div class="mast-sub">nflboxscore.com &nbsp;·&nbsp; NFL Fantasy &amp; Scores</div>
  <div class="mast-date">${dateStr} &nbsp;·&nbsp; Week ${weekNum} &nbsp;·&nbsp; ${sendLabel} &nbsp;·&nbsp; ${mode.toUpperCase()}</div>
</div>`
}

function foot(email) {
  const unsub = `${SITE_URL}/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}`
  return `
<div class="div"></div>
<div class="cta-wrap">
  <a class="cta" href="${SITE_URL}" style="margin-right:8px">nflboxscore.com &rarr;</a>
  <a class="cta cta-dk" href="https://nysportsdaily.com">NY Sports Daily &rarr;</a>
</div>
<div class="foot">
  <div class="foot-brand">The Final Whistle</div>
  <div class="foot-links">
    <a href="${SITE_URL}">nflboxscore.com</a> &nbsp;&middot;&nbsp;
    <a href="https://nysportsdaily.com">nysportsdaily.com</a> &nbsp;&middot;&nbsp;
    <a href="https://buymeacoffee.com/mhughes65v">buy me a coffee ☕</a>
  </div>
  <div class="foot-unsub">
    <a href="${unsub}">Unsubscribe</a>
    &nbsp;&middot;&nbsp; Independent &amp; ad-free &nbsp;&middot;&nbsp;
    Not affiliated with the NFL or ESPN
  </div>
</div>
</div></body></html>`
}

// ── HTML renderers ────────────────────────────────────────────────────────────

// FULL box score block — for fav team game
function renderFullGame(g, squad, mode = 'ppr') {
  if (!g) return ''

  const { home, away, winner, isOT, venue, attendance, awayQ, homeQ,
          scoringPlays, homeStats, awayStats, byPos, eventId } = g

  const aWon = away.score > home.score
  const hWon = home.score > away.score

  // Score header
  const header = `
<div class="gc">
<div class="gc-head">
  <div class="gc-team">
    <div class="gc-abbr ${aWon?'gc-win':'gc-los'}">${away.abbr}</div>
    <div class="gc-name">${away.name}</div>
    <div class="gc-rec">${away.record}</div>
  </div>
  <div class="gc-mid">
    <div class="gc-score">${away.score}&ndash;${home.score}</div>
    <div class="gc-matchup">${away.abbr} @ ${home.abbr}</div>
    <div class="gc-final">FINAL${isOT?' OT':''}</div>
  </div>
  <div class="gc-team-r">
    <div class="gc-abbr ${hWon?'gc-win':'gc-los'}">${home.abbr}</div>
    <div class="gc-name">${home.name}</div>
    <div class="gc-rec">${home.record}</div>
  </div>
</div>`

  // Linescore
  const maxQ    = Math.max(awayQ.length, homeQ.length, 4)
  const qHdrs   = Array.from({length:maxQ},(_,i)=>`<td class="hdr">Q${i+1}</td>`).join('')
  const aQcells = Array.from({length:maxQ},(_,i)=>`<td>${awayQ[i]??'&mdash;'}</td>`).join('')
  const hQcells = Array.from({length:maxQ},(_,i)=>`<td>${homeQ[i]??'&mdash;'}</td>`).join('')

  const linescore = `
<table class="ls">
  <tr><td class="tm hdr">&nbsp;</td>${qHdrs}<td class="hdr tot">T</td></tr>
  <tr><td class="tm">${away.abbr}</td>${aQcells}<td class="tot">${away.score}</td></tr>
  <tr><td class="tm">${home.abbr}</td>${hQcells}<td class="tot">${home.score}</td></tr>
</table>`

  // Scoring plays
  const spRows = scoringPlays.slice(0,20).map(p => `
<div class="sp-row">
  <span class="sp-q">Q${p.period}</span>
  <span class="sp-clk">${p.clock}</span>
  <span class="sp-tm">${p.team}</span>
  <span class="sp-txt">${p.text}</span>
  <span class="sp-sc">${p.awayScore}&ndash;${p.homeScore}</span>
</div>`).join('')

  // Team stats comparison
  const statRows = [
    ['Total Yards',   'totalYards',      true ],
    ['Passing Yards', 'netPassingYards', true ],
    ['Rushing Yards', 'rushingYards',    true ],
    ['First Downs',   'firstDowns',      true ],
    ['3rd Down Eff.', 'thirdDownEff',    null ],
    ['Turnovers',     'turnovers',       false],
    ['Sacks',         'sacks',           true ],
    ['Poss. Time',    'possessionTime',  null ],
  ].map(([lbl, key, moreBetter]) => {
    const av = awayStats[key] || '&mdash;'
    const hv = homeStats[key] || '&mdash;'
    const aN = parseFloat(av), hN = parseFloat(hv)
    const aw = moreBetter === true ? aN > hN : moreBetter === false ? aN < hN : false
    const hw = moreBetter === true ? hN > aN : moreBetter === false ? hN < aN : false
    return `<tr>
  <td class="ts-vc ${aw?'ts-vw':''}">${av}</td>
  <td class="ts-lc">${lbl}</td>
  <td class="ts-vc ${hw?'ts-vw':''}">${hv}</td>
</tr>`
  }).join('')

  // Player stat tables
  function playerTable(players, cols, label) {
    if (!players?.length) return ''
    const sortedP = [...players].sort((a,b) => fp(b,mode) - fp(a,mode))
    const rows = sortedP.map(p => {
      const pts      = fp(p, mode)
      const inSquad  = squad.some(s => p.name.toLowerCase().includes(s.toLowerCase()))
      const fpCls    = pts >= 30 ? 'fp-gold' : pts >= 10 ? 'fp' : ''
      const sqTag    = inSquad ? '<span class="sq-tag">MY SQUAD</span>' : ''
      const cells    = cols.map(c => `<td>${p.vals[c]??'&mdash;'}</td>`).join('')
      return `<tr class="${inSquad?'sq':''}">
  <td class="pn">${p.name}${sqTag}</td>
  <td class="tm">${p.team}</td>
  ${cells}
  <td class="${fpCls}">${pts > 0 ? pts : '&mdash;'}</td>
</tr>`
    }).join('')

    const hdrs = cols.map(c=>`<th>${c}</th>`).join('')
    return `
<span class="ps-lbl">${label}</span>
<div style="padding:0 18px 10px;overflow-x:auto">
<table class="ps">
  <thead><tr><th class="l">Player</th><th>TM</th>${hdrs}<th>${fpLabel(mode)}</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
</div>`
  }

  const passingTable   = playerTable(byPos.QB, ['C/ATT','YDS','TD','INT','QBR'], 'PASSING')
  const rushingTable   = playerTable(
    byPos.RB?.slice(0,6), ['CAR','YDS','AVG','TD'], 'RUSHING')
  const receivingTable = playerTable(
    byPos.WR?.slice(0,8), ['REC','TGT','YDS','TD'], 'RECEIVING')

  const metaLine = (venue || attendance)
    ? `<div style="padding:4px 14px 8px;font-family:monospace;font-size:8px;color:rgba(255,255,255,.22);letter-spacing:.05em">${venue}${attendance?` &nbsp;&middot;&nbsp; Att: ${attendance}`:''}</div>`
    : ''

  return `
${header}
${linescore}
<span class="sp-lbl">SCORING PLAYS</span>
<div class="sp">${spRows}</div>
<span class="ts-lbl">TEAM STATS</span>
<div style="padding:0 14px 10px">
  <table class="ts">
    <tr class="ts-hdr"><td class="ts-vc">${away.abbr}</td><td class="ts-lc"></td><td class="ts-vc">${home.abbr}</td></tr>
    ${statRows}
  </table>
</div>
${passingTable}
${rushingTable}
${receivingTable}
${metaLine}
</div>`  // closes .gc
}

// CONDENSED game card — for non-fav games
function renderCondensedGame(g) {
  if (!g) return ''
  const { home, away, winner, isOT, awayQ, homeQ,
          awayStatLine, homeStatLine, eventId } = g

  const aWon   = away.score > home.score
  const maxQ   = Math.max(awayQ.length, homeQ.length, 4)
  const qHdrs  = Array.from({length:maxQ},(_,i)=>`<td class="hdr">Q${i+1}</td>`).join('')
  const aQc    = Array.from({length:maxQ},(_,i)=>`<td>${awayQ[i]??'&mdash;'}</td>`).join('')
  const hQc    = Array.from({length:maxQ},(_,i)=>`<td>${homeQ[i]??'&mdash;'}</td>`).join('')

  const deepLink = `${SITE_URL}?game=${away.abbr}-${home.abbr}`

  // Stat lines
  const aLines = awayStatLine.map(l => `<div>${l}</div>`).join('')
  const hLines = homeStatLine.map(l => `<div>${l}</div>`).join('')

  return `
<div class="cg">
  <div class="cg-head">
    <div class="cg-t">
      <div class="cg-abbr ${aWon?'gc-win':'gc-los'}">${away.abbr}</div>
      <div class="gc-name">${away.name}</div>
    </div>
    <div class="cg-m">
      <div class="cg-sc">${away.score}&ndash;${home.score}</div>
      <div class="cg-fin">FINAL${isOT?' OT':''}</div>
    </div>
    <div class="cg-tr">
      <div class="cg-abbr ${!aWon?'gc-win':'gc-los'}">${home.abbr}</div>
      <div class="gc-name">${home.name}</div>
    </div>
  </div>
  <table class="ls">
    <tr><td class="tm hdr">&nbsp;</td>${qHdrs}<td class="hdr tot">T</td></tr>
    <tr><td class="tm">${away.abbr}</td>${aQc}<td class="tot">${away.score}</td></tr>
    <tr><td class="tm">${home.abbr}</td>${hQc}<td class="tot">${home.score}</td></tr>
  </table>
  <div class="cg-line">
    <strong style="color:rgba(255,255,255,.55)">${away.abbr}:</strong> ${awayStatLine.join(' &nbsp;&middot;&nbsp; ') || '—'}<br>
    <strong style="color:rgba(255,255,255,.55)">${home.abbr}:</strong> ${homeStatLine.join(' &nbsp;&middot;&nbsp; ') || '—'}
  </div>
  <a class="cg-link" href="${deepLink}">Full Box Score &rarr;</a>
</div>`
}

// WAIVER WIRE — auto-generated from real box score data
function renderWaiverSection(parsedGames, nextWeek, squad, mode = 'ppr') {
  const seen       = new Set()
  const performers = []

  parsedGames.forEach(g => {
    if (!g) return
    ;['RB','WR'].forEach(pos => {
      g.byPos[pos]?.forEach(p => {
        if (seen.has(p.name)) return
        seen.add(p.name)
        performers.push({ ...p, game: `${g.away.abbr}@${g.home.abbr}` })
      })
    })
  })

  const targets = performers
    .sort((a, b) => fp(b,mode) - fp(a,mode))
    .filter(p => fp(p,mode) >= 12)
    .slice(0, 5)

  if (!targets.length) return ''

  const rows = targets.map(p => {
    const pts     = fp(p, mode)
    const pri     = pts >= 25 ? 'HIGH' : pts >= 18 ? 'MED' : 'LOW'
    const priCls  = pri === 'HIGH' ? 'ww-hi' : 'ww-md'
    const isSquad = squad.some(s => p.name.toLowerCase().includes(s.toLowerCase()))

    const reason = p.pos === 'RB'
      ? `${p.vals['CAR']||'?'} car, ${p.vals['YDS']||'?'} yds${p.vals['TD']&&p.vals['TD']!=='0'?`, ${p.vals['TD']} TD`:''} — usage trending up`
      : `${p.vals['REC']||'?'} rec/${p.vals['TGT']||'?'} tgt, ${p.vals['YDS']||'?'} yds${p.vals['TD']&&p.vals['TD']!=='0'?`, ${p.vals['TD']} TD`:''} — target share rising`

    return `
<div class="ww-item">
  <div>
    <span class="ww-badge ww-add">ADD</span>
    <strong class="ww-name">${p.name}${isSquad?' ⚡':''}</strong>
    <span style="font-family:monospace;font-size:8px;color:#9e9080"> ${p.pos} &middot; ${p.team}</span>
    &nbsp;<span class="${priCls}">${pri} PRI</span>
  </div>
  <div class="ww-reason">${reason}</div>
  <div class="ww-stat">${pts} FPTS (${fpLabel(mode)}) &nbsp;&middot;&nbsp; ${p.game}</div>
</div>`
  }).join('')

  return `
<span class="sec-label">📋 Waiver Wire Targets — Week ${nextWeek}</span>
${rows}
<div class="callout">Claims close Wednesday in most leagues. Lead with your top priority — don't split waiver position across multiple speculative adds.</div>
<div class="cta-wrap">
  <a class="cta" href="${SITE_URL}">Full Waiver Analysis &rarr;</a>
</div>`
}

// SQUAD SUMMARY — "Your fantasy squad this week"
function renderSquadSummary(parsedGames, squad, mode = 'ppr') {
  if (!squad.length) return ''
  const seen      = new Set()
  const myPlayers = []

  parsedGames.forEach(g => {
    if (!g) return
    ;['QB','RB','WR','K','DEF'].forEach(pos => {
      g.byPos[pos]?.forEach(p => {
        if (!squad.some(s => p.name.toLowerCase().includes(s.toLowerCase()))) return
        if (seen.has(p.name)) return
        seen.add(p.name)
        myPlayers.push(p)
      })
    })
  })

  if (!myPlayers.length) return ''

  myPlayers.sort((a,b) => fp(b,mode) - fp(a,mode))
  const total = myPlayers.reduce((s,p) => s + fp(p,mode), 0)
  const lines = myPlayers.map(p =>
    `${p.name} (${p.pos}/${p.team}) — <strong>${fp(p,mode)} pts</strong>`
  ).join(' &nbsp;&middot;&nbsp; ')

  return `
<span class="sec-label">⚡ My Fantasy Squad — Week Recap</span>
<div class="sq-sum">
  Total: <strong>${Math.round(total * 10) / 10} pts (${fpLabel(mode)})</strong><br>
  ${lines}
</div>`
}

// WEATHER FLAGS — Friday send only, outdoor games with notable conditions
async function renderWeatherSection(events) {
  const outdoorGames = events.filter(ev => {
    const comps = ev.competitions?.[0]
    const home  = comps?.competitors?.find(c => c.homeAway === 'home')
    const abbr  = home?.team?.abbreviation
    return OUTDOOR_STADIUMS.has(abbr)
  })

  // Fetch weather for all outdoor games in parallel
  const weatherData = await Promise.all(
    outdoorGames.map(async ev => {
      const comps = ev.competitions?.[0]
      const home  = comps?.competitors?.find(c => c.homeAway === 'home')
      const away  = comps?.competitors?.find(c => c.homeAway === 'away')
      const abbr  = home?.team?.abbreviation
      const wx    = await fetchGameWeather(abbr, ev.date)
      return { game: `${away?.team?.abbreviation}@${abbr}`, wx, date: ev.date }
    })
  )

  // Split into flagged (notable) and clean
  const flagged = weatherData.filter(d => d.wx && d.wx.flags.length > 0)
  const clean   = weatherData.filter(d => d.wx && d.wx.flags.length === 0)

  if (!weatherData.length) return ''

  let html = `<span class="sec-label">🌤️ Weather Report — Outdoor Games</span>`

  if (flagged.length) {
    html += flagged.map(d => {
      const flagRows = d.wx.flags.map(f => `
<div class="wx-item">
  <span class="wx-flag">${f.icon}</span>
  <span class="wx-game">${d.game}</span>
  <span class="wx-text">${f.text} &nbsp;·&nbsp; ${d.wx.condIcon} ${d.wx.tMax}°F</span>
</div>`).join('')
      return flagRows
    }).join('')
  }

  if (clean.length) {
    html += `<div class="wx-ok">✅ All clear — ${clean.map(d=>d.game).join(', ')} · No weather concerns</div>`
  }

  html += `<div style="padding:4px 18px 10px;font-family:monospace;font-size:8px;color:#9e9080;letter-spacing:.04em">
  Via Open-Meteo · Forecast updates daily · Indoor stadiums excluded
</div>`

  return html
}

// TEAM NEWS — fetches 4 headlines for fav team from ESPN + Google News
// Called at build time inside buildEmail — runs server-side in the edge function
async function fetchTeamNews(favTeam) {
  if (!favTeam || favTeam === 'All') return []

  const info     = TEAM_INFO[favTeam]
  const espnId   = ESPN_NEWS_IDS[favTeam]
  const articles = []

  // Source 1: ESPN team news (most reliable)
  try {
    if (espnId) {
      const r    = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/football/nfl/news?team=${espnId}&limit=4`
      )
      const data = await r.json()
      ;(data.articles || []).slice(0, 3).forEach(a => {
        articles.push({
          title:  a.headline || '',
          source: 'ESPN',
          url:    a.links?.web?.href || `https://www.espn.com/nfl/team/_/name/${favTeam.toLowerCase()}`,
          time:   a.published
            ? new Date(a.published).toLocaleDateString('en-US',
                {month:'short', day:'numeric', hour:'numeric', minute:'2-digit'})
            : '',
        })
      })
    }
  } catch { /* silent — fall through to Google News */ }

  // Source 2: Google News RSS via the app's /api/gnews proxy
  // Builds same query as buildNewsUrl() in the app
  try {
    if (articles.length < 4 && info) {
      const q   = `${info.city} ${info.nick} NFL`
      const r   = await fetch(
        `${SITE_URL}/api/gnews?q=${encodeURIComponent(q)}`
      )
      const xml = await r.text()
      // Parse RSS items
      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
      items.slice(0, 4 - articles.length).forEach(match => {
        const item    = match[1]
        const title   = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
                         item.match(/<title>(.*?)<\/title>/))?.[1]?.trim() || ''
        const link    = item.match(/<link>(.*?)<\/link>/)?.[1]?.trim() ||
                        item.match(/<guid[^>]*>(.*?)<\/guid>/)?.[1]?.trim() || ''
        const source  = item.match(/<source[^>]*>(.*?)<\/source>/)?.[1]?.trim() || 'Google News'
        const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]?.trim() || ''
        if (title && link && !title.toLowerCase().includes('advertisement')) {
          articles.push({ title, source, url: link, time: pubDate })
        }
      })
    }
  } catch { /* silent */ }

  return articles.slice(0, 4)
}

function renderTeamNewsSection(articles, favTeam) {
  if (!articles?.length || !favTeam || favTeam === 'All') return ''
  const info = TEAM_INFO[favTeam]
  const label = info ? `${info.city} ${info.nick}` : favTeam

  const rows = articles.map(a => `
<div style="padding:8px 0;border-bottom:1px solid rgba(42,31,14,.1)">
  <a href="${a.url}" target="_blank" rel="noopener"
     style="font-family:Georgia,serif;font-size:13px;font-weight:600;color:#1a1209;text-decoration:none;line-height:1.4;display:block">
    ${a.title}
  </a>
  <div style="font-family:monospace;font-size:8px;color:#9e9080;margin-top:3px;letter-spacing:.04em">
    ${a.source}${a.time ? ` &nbsp;&middot;&nbsp; ${a.time}` : ''}
  </div>
</div>`).join('')

  return `
<span class="sec-label">📰 ${label} — Latest News</span>
<div style="padding:4px 18px 10px">
  ${rows}
</div>
<div class="cta-wrap" style="padding:6px 0 12px">
  <a class="cta" href="${SITE_URL}">More ${favTeam} News &rarr;</a>
</div>`
}

// HOF TIDBIT — varies by week AND day so Thu/Fri sends show different legends

// ── What If? Fantasy HOF — pre-fantasy era legends ───────────────────────────
const FANTASY_WHATIF = [
  {
    player:'Gale Sayers', team:'CHI', pos:'RB', year:1965,
    game:'Week 10 vs SF · Dec 12, 1965', pts_ppr:56.0, pts_std:44.0,
    line:'9 rush TD, 113 rush yds · 1 rec TD, 89 yds, 2 rec · 1 punt return TD',
    note:'Six touchdowns in a single game — Papa Bear Halas called it the greatest performance he'd ever seen. On a muddy Wrigley Field.',
    whatif:true,
  },
  {
    player:'Jim Brown', team:'CLE', pos:'RB', year:1963,
    game:'Season Average · 1963', pts_ppr:38.4, pts_std:36.4,
    line:'1,863 rush yds, 12 TD in 14 games — 133 rush yds/game',
    note:'5.2 yards per carry for his entire career. Retired at 29 at his absolute peak. Nine seasons, nine Pro Bowls, never missed a game.',
    whatif:true,
  },
  {
    player:'Joe Namath', team:'NYJ', pos:'QB', year:1967,
    game:'Best Week · 1967', pts_ppr:44.8, pts_std:44.8,
    line:'496 yds, 3 TD, 0 INT',
    note:'First QB ever to throw for 4,000 yards in a season. In 1967 alone he had 4 games with 400+ yards — 40 years before anyone was keeping score.',
    whatif:true,
  },
  {
    player:'Frank Gifford', team:'NYG', pos:'RB/WR', year:1956,
    game:'1956 NFL MVP Season · Best Game', pts_ppr:41.2, pts_std:36.2,
    line:'19 car, 123 yds, 2 rush TD · 5 rec, 76 yds, 1 rec TD',
    note:'The original flex player — ran, caught, even threw passes. In today's PPR world he'd be the most valuable hybrid back in the game.',
    whatif:true,
  },
  {
    player:'Johnny Unitas', team:'BAL', pos:'QB', year:1959,
    game:'Consecutive TD streak · Best Week', pts_ppr:51.2, pts_std:51.2,
    line:'6 TD, 374 yds, 0 INT',
    note:'TD pass in 47 consecutive games — a record that stood 52 years. Cut by the Steelers before becoming the greatest QB of his era.',
    whatif:true,
  },
  {
    player:'Walter Payton', team:'CHI', pos:'RB', year:1977,
    game:'Week 7 vs MIN · Nov 20, 1977', pts_ppr:49.4, pts_std:46.4,
    line:'40 car, 275 yds, 1 TD · 3 rec, 26 yds',
    note:'275 yards on 40 carries — the single-game rushing record at the time. On frozen ground. Against a playoff defense. Sweetness at his peak.',
    whatif:true,
  },
  {
    player:'O.J. Simpson', team:'BUF', pos:'RB', year:1973,
    game:'Season Finale vs NYJ · Dec 16, 1973', pts_ppr:47.6, pts_std:44.6,
    line:'34 car, 200 yds, 1 TD · 3 rec, 18 yds',
    note:'First player ever to break 2,000 rush yards in a season. Did it entirely on his own, on the Bills, with no supporting weapons.',
    whatif:true,
  },
  {
    player:'Don Hutson', team:'GB', pos:'WR', year:1942,
    game:'1942 Season · Best Game', pts_ppr:44.8, pts_std:36.8,
    line:'9 rec, 88 yds, 4 TD',
    note:'Scored 17 TDs in 1942 — more than his closest competitor scored in their entire career. The original dominant WR, 30 years before PPR existed.',
    whatif:true,
  },
  {
    player:'Lance Alworth', team:'SD', pos:'WR', year:1965,
    game:'1965 Season · Best Game', pts_ppr:46.3, pts_std:38.3,
    line:'9 rec, 123 yds, 3 TD',
    note:'Caught a pass in 96 consecutive games. Seven straight 1,000-yard seasons when 1,000 yards was nearly impossible. Bambi would have been a first-rounder every year.',
    whatif:true,
  },
  {
    player:'Bronko Nagurski', team:'CHI', pos:'RB', year:1934,
    game:'1934 NFL Championship Game', pts_ppr:38.0, pts_std:36.0,
    line:'25 car, 124 yds, 2 TD · 2 rec, 16 yds',
    note:'Once scored a TD by running through the end zone wall into the stands — reportedly told the ref "that last guy hit pretty hard." The original physical specimen.',
    whatif:true,
  },
  {
    player:'Paul Hornung', team:'GB', pos:'RB/K', year:1960,
    game:'1960 Season · 176 pts scored', pts_ppr:43.6, pts_std:40.6,
    line:'2 rush TD, 88 yds · 3 rec, 34 yds, 1 rec TD · 2 FG, 4 XP',
    note:'176 points in the 1960 season — a record that stood 46 years. Scored as a RB AND kicker. The original dual-position fantasy nightmare.',
    whatif:true,
  },
  {
    player:'Dick "Night Train" Lane', team:'LA', pos:'CB', year:1952,
    game:'Rookie Season 1952', pts_ppr:0, pts_std:0,
    line:'14 interceptions — the all-time single-season NFL record',
    note:'Set the all-time INT record as a ROOKIE in a 12-game season. Walked in off the street with his Army discharge papers. The record still stands 70+ years later.',
    whatif:true,
  },
]

// Merged pool: modern HOF + What If legends, tagged for rendering
const ALL_HOF = [
  ...FANTASY_HOF.map(l => ({ ...l, whatif:false })),
  ...FANTASY_WHATIF,
]

function renderHOFTidbit(weekNum, sendType) {
  const dayOffset = { thursday:0, friday:7, monday:14, tuesday:21 }[sendType] || 0
  const idx    = (weekNum - 1 + dayOffset) % ALL_HOF.length
  const legend = ALL_HOF[idx]

  if (legend.whatif) {
    // What If? card — pre-fantasy era legend
    return `
<span class="sec-label">⏰ What If? Fantasy Football — Pre-Fantasy Era Legend</span>
<div class="hof">
  <div class="hof-label" style="color:rgba(200,168,75,.6);font-size:9px;letter-spacing:.18em">PRE-FANTASY ERA · ${legend.year}</div>
  <div class="hof-player">${legend.player}</div>
  <div class="hof-meta">${legend.pos} &nbsp;&middot;&nbsp; ${legend.team} &nbsp;&middot;&nbsp; ${legend.game}</div>
  <div style="margin-top:10px">
    <span class="hof-pts">${legend.pts_ppr}</span>
    <div class="hof-pts-lbl">pts PPR &nbsp;/&nbsp; ${legend.pts_std} STD &nbsp;&middot;&nbsp; <em>estimated if played today</em></div>
  </div>
  <div class="hof-line">${legend.line}</div>
  <div class="hof-note">${legend.note}</div>
  <div style="margin-top:8px;font-family:'IBM Plex Mono',monospace;font-size:8px;color:rgba(200,168,75,.4);letter-spacing:.08em">
    What would this performance have scored in a modern PPR league?
  </div>
</div>`
  }

  // Standard modern HOF card
  return `
<span class="sec-label">⚡ Fantasy Hall of Fame — This Week in History</span>
<div class="hof">
  <div class="hof-label">Fantasy Hall of Fame</div>
  <div class="hof-player">${legend.player}</div>
  <div class="hof-meta">${legend.pos} &nbsp;&middot;&nbsp; ${legend.team} &nbsp;&middot;&nbsp; ${legend.year} · Week ${legend.week}</div>
  <div style="margin-top:10px">
    <span class="hof-pts">${legend.pts}</span>
    <div class="hof-pts-lbl">pts PPR &nbsp;/&nbsp; ${Math.round((legend.pts - (legend.pts > 20 ? 3 : 0)) * 10)/10} STD</div>
  </div>
  <div class="hof-line">${legend.line}</div>
  <div class="hof-note">${legend.note}</div>
</div>`
}

// ── Full email assembler per send type ────────────────────────────────────────
async function buildEmail(sendType, weekCtx, parsedGames, allEvents, sub) {
  const { currentWeek, recapWeek } = weekCtx
  const { email, fav_team: favTeam, squad_players: squadStr, scoring_mode: scoringMode } = sub
  const mode    = scoringMode === 'std' ? 'std' : 'ppr'   // default to PPR if unset
  const squad   = (squadStr || '').split(',').map(s => s.trim()).filter(Boolean)
  const hasFav  = favTeam && favTeam !== 'All'
  const dispWeek = recapWeek || currentWeek

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday:'long', year:'numeric', month:'long', day:'numeric'
  })

  const LABELS = {
    monday:   'Monday Recap',
    tuesday:  'Tuesday MNF Recap',
    thursday: 'Thursday Preview',
    friday:   'Friday Game Day',
  }

  const SUBJECTS = {
    monday:   `⚡ Week ${recapWeek} Recap — Box Scores, Stats & Waiver Targets`,
    tuesday:  `📋 MNF Final — Week ${recapWeek} Complete + Waiver Wire`,
    thursday: `⚖️ TNF Tonight — Start/Sit + Week ${currentWeek} Preview`,
    friday:   `🏈 Week ${currentWeek} Prep — TNF Recap, Weather & Full Slate`,
  }

  let html = shell(SUBJECTS[sendType], dateStr, dispWeek, LABELS[sendType], mode)

  // Fetch team news once — used in all four send types
  const teamNews     = await fetchTeamNews(favTeam)
  const teamNewsHTML = renderTeamNewsSection(teamNews, favTeam)

  // ── MONDAY: All Sunday games ──────────────────────────────────────────────
  if (sendType === 'monday') {
    // Squad summary first if applicable
    html += renderSquadSummary(parsedGames, squad, mode)

    if (hasFav) {
      const favGame = parsedGames.find(g =>
        g && (g.home.abbr === favTeam || g.away.abbr === favTeam))

      if (favGame) {
        const won = favGame.winner === favTeam
        html += `<span class="sec-label">⚡ ${favTeam} — ${won ? '✅ WIN' : '❌ LOSS'}</span>`
        html += renderFullGame(favGame, squad, mode)
      }

      // All other games condensed
      const others = parsedGames.filter(g =>
        g && g.home.abbr !== favTeam && g.away.abbr !== favTeam)
      if (others.length) {
        html += `<span class="sec-label">🏈 Sunday Results — Week ${recapWeek}</span>`
        others.forEach(g => { html += renderCondensedGame(g) })
      }
    } else {
      // All Teams: every game condensed
      html += `<span class="sec-label">🏈 Sunday Results — Week ${recapWeek} — All Games</span>`
      parsedGames.forEach(g => { html += renderCondensedGame(g) })
    }

    html += teamNewsHTML
    html += renderWaiverSection(parsedGames, currentWeek, squad, mode)
  }

  // ── TUESDAY: MNF game only ────────────────────────────────────────────────
  else if (sendType === 'tuesday') {
    if (!parsedGames.length) {
      html += `<div style="padding:20px 18px;font-family:monospace;font-size:10px;color:#6b5f4e">No completed Monday Night game found yet — check nflboxscore.com for live scores.</div>`
    } else {
      const mnfGame = parsedGames[0]
      const isFavGame = hasFav &&
        (mnfGame?.home.abbr === favTeam || mnfGame?.away.abbr === favTeam)

      html += `<span class="sec-label">🌙 Monday Night Football — Week ${recapWeek} Final</span>`
      html += isFavGame
        ? renderFullGame(mnfGame, squad, mode)
        : renderCondensedGame(mnfGame)
    }

    html += renderSquadSummary(parsedGames, squad, mode)
    html += teamNewsHTML
    html += renderWaiverSection(parsedGames, currentWeek, squad, mode)
  }

  // ── THURSDAY: No recap — preview + HOF ───────────────────────────────────
  else if (sendType === 'thursday') {
    // TNF game preview
    const tnf = allEvents.find(ev => new Date(ev.date).getDay() === 4)
    if (tnf) {
      const comps    = tnf.competitions?.[0]
      const home     = comps?.competitors?.find(c => c.homeAway === 'home')
      const away     = comps?.competitors?.find(c => c.homeAway === 'away')
      const homeAbbr = home?.team?.abbreviation || '?'
      const awayAbbr = away?.team?.abbreviation || '?'
      const kickoff  = new Date(tnf.date).toLocaleTimeString('en-US',
        {hour:'numeric', minute:'2-digit', timeZoneName:'short'})
      const venue    = comps?.venue?.fullName || ''
      const isFavTNF = hasFav && [homeAbbr, awayAbbr].includes(favTeam)

      html += `<span class="sec-label">📺 Tonight — Thursday Night Football</span>
<div class="hof" style="padding:16px 18px">
  <div style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:#c8a84b">${awayAbbr} @ ${homeAbbr}${isFavTNF?' ⚡':''}</div>
  <div style="font-family:monospace;font-size:9px;color:rgba(255,255,255,.4);margin-top:5px;letter-spacing:.08em">${kickoff}${venue?` &nbsp;&middot;&nbsp; ${venue}`:''}</div>
  <div style="margin-top:10px;font-family:monospace;font-size:9px;color:rgba(255,255,255,.55);line-height:1.6">Start your players before kickoff. Check nflboxscore.com for FW Formula scores &amp; injury updates.</div>
  <div style="text-align:center;margin-top:12px">
    <a class="cta" href="${SITE_URL}" style="font-size:8px">Live Scores Tonight &rarr;</a>
  </div>
</div>`
    }

    // Start/Sit callout
    html += `
<span class="sec-label">⚖️ Start / Sit — Week ${currentWeek}</span>
<div class="callout">
  The FW Formula on nflboxscore.com scores every rostered player 0–10 using recent trend,
  opponent difficulty, usage data, weather, and momentum. Auto-updated every page load — no manual work.
</div>
<div class="cta-wrap">
  <a class="cta" href="${SITE_URL}">FW Formula Scores &rarr;</a>
</div>`

    html += renderHOFTidbit(currentWeek, sendType)
    html += teamNewsHTML
  }

  // ── FRIDAY: TNF box score + schedule + weather + HOF ─────────────────────
  else if (sendType === 'friday') {
    // TNF box score from last night
    if (parsedGames.length) {
      const tnfGame  = parsedGames[0]
      const isFavTNF = hasFav &&
        (tnfGame?.home.abbr === favTeam || tnfGame?.away.abbr === favTeam)

      html += `<span class="sec-label">📺 Thursday Night Football — Final</span>`
      html += isFavTNF
        ? renderFullGame(tnfGame, squad, mode)
        : renderCondensedGame(tnfGame)
    }

    // Weekend schedule
    const upcoming = allEvents.filter(ev => !ev.status?.type?.completed)
    if (upcoming.length) {
      html += `<span class="sec-label">🏈 This Weekend — Week ${currentWeek} Schedule</span>`
      html += `<div style="padding:4px 0 6px">`
      upcoming.slice(0, 14).forEach(ev => {
        const comps    = ev.competitions?.[0]
        const home     = comps?.competitors?.find(c => c.homeAway === 'home')
        const away     = comps?.competitors?.find(c => c.homeAway === 'away')
        const homeAbbr = home?.team?.abbreviation || '?'
        const awayAbbr = away?.team?.abbreviation || '?'
        const tv       = comps?.broadcasts?.[0]?.names?.[0] || ''
        const kickoff  = ev.date
          ? new Date(ev.date).toLocaleString('en-US',
              {weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit'})
          : ''
        const isFavGame = hasFav && [homeAbbr, awayAbbr].includes(favTeam)
        const hl = isFavGame ? 'background:rgba(200,168,75,.05);' : ''
        html += `
<div style="display:table;width:100%;padding:6px 18px;border-bottom:1px solid rgba(42,31,14,.08);box-sizing:border-box;${hl}">
  <span style="display:table-cell;font-family:monospace;font-size:10px;font-weight:700;color:#1a1209">${awayAbbr} @ ${homeAbbr}${isFavGame?' ⚡':''}</span>
  <span style="display:table-cell;text-align:right;font-family:monospace;font-size:9px;color:#9e9080">${kickoff}${tv?` &nbsp;&middot;&nbsp; <span style="color:#c8a84b">${tv}</span>`:''}</span>
</div>`
      })
      html += `</div>
<div class="cta-wrap">
  <a class="cta" href="${SITE_URL}">Full TV Guide &rarr;</a>
</div>`
    }

    // Weather flags
    html += await renderWeatherSection(upcoming)

    // Start/Sit tease
    html += `
<span class="sec-label">⚖️ Start / Sit — Week ${currentWeek}</span>
<div class="callout">Lineups lock Sunday morning. Check the FW Formula for updated Start/Sit scores — injury news and weather are baked in automatically.</div>
<div class="cta-wrap">
  <a class="cta" href="${SITE_URL}">FW Formula Scores &rarr;</a>
</div>`

    html += renderHOFTidbit(currentWeek, sendType)
    html += teamNewsHTML
  }

  html += foot(email)
  return { subject: SUBJECTS[sendType], html }
}

// ── Supabase helpers ──────────────────────────────────────────────────────────
async function getSubscribers(sendType) {
  try {
    const r   = await fetch(
      `${SUPABASE_URL}/rest/v1/fw_subscribers?confirmed=eq.true&select=*`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    )
    const all = await r.json()
    return Array.isArray(all)
      ? all.filter(s => !s.sends || s.sends.includes(sendType))
      : []
  } catch { return [] }
}

async function logSend(type, week, count, status = 'ok', notes = '') {
  await fetch(`${SUPABASE_URL}/rest/v1/fw_send_log`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({
      send_type: type, week_number: week,
      recipient_count: count, status, notes,
    }),
  }).catch(() => {})
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req) {
  // Auth — Vercel cron sends secret via Authorization header
  const url      = new URL(req.url)
  const authHdr  = req.headers.get('authorization')?.replace('Bearer ','')
  const qSecret  = url.searchParams.get('secret')
  const body     = req.method === 'POST'
    ? await req.clone().json().catch(() => ({})) : {}
  const provided = authHdr || qSecret || body.secret

  if (provided !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const sendType = url.searchParams.get('type') || body.type
  if (!['monday','tuesday','thursday','friday'].includes(sendType)) {
    return new Response(
      JSON.stringify({ error: 'Invalid type. Use: monday, tuesday, thursday, friday' }),
      { status: 400 }
    )
  }

  try {
    // 1. Determine week context
    const weekCtx = await getWeekContext(sendType)
    const { currentWeek, recapWeek } = weekCtx

    // 2. Fetch events
    const recapEvents   = recapWeek ? await getWeekEvents(recapWeek) : []
    const currentEvents = await getWeekEvents(currentWeek)

    // 3. Identify which games to deep-fetch (completed since last night)
    const targetEvents  = getTargetEvents(
      sendType === 'tuesday' ? recapEvents :  // MNF = current week's final game
      sendType === 'friday'  ? currentEvents : // TNF = current week Thursday game
      recapEvents,
      sendType
    )

    // 4. Fetch full box scores in parallel (cap at 16)
    const summaries  = await Promise.all(
      targetEvents.slice(0, 16).map(ev => getGameSummary(ev.id))
    )

    // 5. Parse all games
    const parsedGames = summaries
      .map((s, i) => parseGameSummary(s, targetEvents[i]))
      .filter(Boolean)

    // 6. Get subscribers
    const subscribers = await getSubscribers(sendType)
    if (!subscribers.length) {
      await logSend(sendType, currentWeek, 0, 'ok', 'No confirmed subscribers')
      return new Response(JSON.stringify({ ok: true, sent: 0, message: 'No subscribers' }))
    }

    // 7. Send emails in batches of 10
    let sent = 0, errors = 0

    for (let i = 0; i < subscribers.length; i += 10) {
      const batch = subscribers.slice(i, i + 10)
      await Promise.all(batch.map(async sub => {
        try {
          const { subject, html } = await buildEmail(
            sendType, weekCtx, parsedGames, currentEvents, sub
          )
          const r = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${RESEND_KEY}`,
            },
            body: JSON.stringify({
              from:    `The Final Whistle <${FROM_EMAIL}>`,
              to:      [sub.email],
              subject, html,
            }),
          })
          if (r.ok) {
            sent++
            // Fire-and-forget last_sent_at update
            fetch(`${SUPABASE_URL}/rest/v1/fw_subscribers?id=eq.${sub.id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
              },
              body: JSON.stringify({ last_sent_at: new Date().toISOString() }),
            }).catch(() => {})
          } else {
            errors++
            console.error(`Resend error for ${sub.email}:`, await r.text())
          }
        } catch (e) {
          errors++
          console.error(`Exception sending to ${sub.email}:`, e)
        }
      }))
      // Brief pause between batches — respect Resend rate limits
      if (i + 10 < subscribers.length) {
        await new Promise(r => setTimeout(r, 400))
      }
    }

    // 8. Log the send
    await logSend(
      sendType, currentWeek, sent,
      errors > 0 ? 'partial' : 'ok',
      `Games: ${parsedGames.length} | Sent: ${sent} | Errors: ${errors}`
    )

    return new Response(JSON.stringify({
      ok: true, type: sendType, week: currentWeek,
      gamesProcessed: parsedGames.length, sent, errors,
    }), { headers: { 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('send engine fatal error:', err)
    await logSend(sendType, 0, 0, 'error', err.message).catch(() => {})
    return new Response(
      JSON.stringify({ error: 'Send failed', detail: err.message }),
      { status: 500 }
    )
  }
}
