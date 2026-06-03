import { useState, useEffect } from 'react'
import { useScoreboard, useBoxScore, useTeamSchedule, useWeekSchedule, parseESPNGame } from './hooks/useESPN'
import { SCHEDULE_2026, WEEK_META, ALL_TEAMS } from './data/schedule2026'
import { ti, networkColor, fmt } from './utils/teams'

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const ROUND_ORDER = ['Super Bowl','Conf Champs','Divisional','Wild Card']
const ALL_WEEKS   = [...Array(18)].map((_,i) => i + 1)

// Auto-detect current NFL week from the calendar
// Season starts Sep 9, 2026 — each week is 7 days
function getAutoWeek() {
  const now = new Date()
  const seasonStart = new Date('2026-09-09T00:00:00')
  const offseasonEnd = new Date('2026-09-08T23:59:59')

  // Before season starts — show Week 1 preview
  if (now <= offseasonEnd) return 1

  // After season starts — calculate week number
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const weekNum = Math.floor((now - seasonStart) / msPerWeek) + 1

  // Cap at 18 regular season weeks
  return Math.min(Math.max(weekNum, 1), 18)
}

// ── TOP-LEVEL NAV VIEWS ───────────────────────────────────────────────────────
const VIEWS = ['Scores', 'Schedule', 'Standings', 'TV Guide', 'News', 'Injuries', 'Leaders', 'Fantasy', 'Draft', 'History']

export default function App() {
  const [activeView,    setActiveView]    = useState('Scores')
  const [activeWeek,    setActiveWeek]    = useState(getAutoWeek)
  const [openCardId,    setOpenCardId]    = useState(null)
  const [teamFilter,    setTeamFilter]    = useState('All')
  const [weekFilter,    setWeekFilter]    = useState('All')
  const [fantMode,      setFantMode]      = useState('std') // 'std' | 'ppr'
  const [leadersTab,    setLeadersTab]    = useState('offense')
  const [trendsMode,    setTrendsMode]    = useState('std') // 'std' | 'ppr'
  const [trendsRange,   setTrendsRange]   = useState(3)     // 1 | 3 | 5 | 'season'
  const [trendsPos,     setTrendsPos]     = useState('ALL') // ALL QB RB WR TE K DEF

  const [newsTeam,      setNewsTeam]      = useState('All')

  const [fontTheme,     setFontTheme]     = useState(() => localStorage.getItem('fw-font') || 'classic')

  // Apply font theme to body
  useEffect(() => {
    document.body.setAttribute('data-font', fontTheme)
    localStorage.setItem('fw-font', fontTheme)
  }, [fontTheme])

  // Season gate — no ESPN calls before Sep 9 2026
  const seasonStarted = new Date() >= new Date('2026-09-09T00:00:00-04:00')

  // Also ask ESPN what the current week is and sync if different
  useEffect(() => {
    if (!seasonStarted) return
    fetch('/api/espn/scoreboard')
      .then(r => r.json())
      .then(data => {
        const espnWeek = data?.week?.number
        if (espnWeek && espnWeek >= 1 && espnWeek <= 18) {
          setActiveWeek(espnWeek)
        }
      })
      .catch(() => {
        // No ESPN data — stick with calendar-calculated week
      })
  }, [])

  // Live ESPN scoreboard for current week — only during season
  const { data: espnData, loading, error, lastUpdated, refresh } = useScoreboard(
    seasonStarted ? activeWeek : null
  )

  // Parse ESPN games — empty before season
  const liveGames = seasonStarted
    ? (espnData?.events?.map(parseESPNGame).filter(Boolean) || [])
    : []

  // Merge live scores into schedule — only during season
  const mergedGames = SCHEDULE_2026.filter(g => g.week === activeWeek).map(g => {
    if (!seasonStarted) return { ...g, status: 'upcoming', homeScore: null, awayScore: null }
    const live = liveGames.find(lg =>
      lg.home === g.home && lg.away === g.away
    )
    if (live) return { ...g, ...live }
    return g
  })

  // Detect if any game is live (for auto-refresh indicator)
  const hasLiveGame = seasonStarted && liveGames.some(g => g.status === 'live')

  return (
    <div className="app">
      {/* ── MASTHEAD ── */}
      <Masthead lastUpdated={lastUpdated} hasLiveGame={hasLiveGame} onRefresh={refresh} fontTheme={fontTheme} setFontTheme={setFontTheme} />

      {/* ── TOP NAV ── */}
      <nav className="top-nav">
        {VIEWS.map(v => (
          <button
            key={v}
            className={`tnav-btn ${activeView === v ? 'on' : ''} ${v === 'Fantasy' ? 'tnav-fantasy' : ''}`}
            onClick={() => setActiveView(v)}
          >{v}</button>
        ))}
      </nav>

      {/* ── CONTENT ── */}
      <main>
        {activeView === 'Scores'    && (
          <ScoresView
            week={activeWeek}
            games={mergedGames}
            loading={loading}
            error={error}
            openCardId={openCardId}
            setOpenCardId={setOpenCardId}
            activeWeek={activeWeek}
            setActiveWeek={setActiveWeek}
          />
        )}
        {activeView === 'Schedule'  && (
          <ScheduleView
            teamFilter={teamFilter}
            setTeamFilter={setTeamFilter}
            weekFilter={weekFilter}
            setWeekFilter={setWeekFilter}
            onJumpToScore={(week, gameKey) => {
              setActiveWeek(week)
              setActiveView('Scores')
              setOpenCardId(gameKey)
            }}
          />
        )}
        {activeView === 'Standings' && <StandingsView />}
        {activeView === 'TV Guide'  && <TVGuideView currentWeek={activeWeek} />}
        {activeView === 'News'      && <NewsView teamFilter={newsTeam} setTeamFilter={setNewsTeam} />}
        {activeView === 'Injuries'  && <InjuriesView />}
        {activeView === 'Leaders'   && (
          <LeadersView tab={leadersTab} setTab={setLeadersTab} />
        )}
        {activeView === 'Fantasy'   && (
          <FantasyView
            mode={fantMode} setMode={setFantMode}
            currentWeek={activeWeek}
            trendsMode={trendsMode} setTrendsMode={setTrendsMode}
            trendsRange={trendsRange} setTrendsRange={setTrendsRange}
            trendsPos={trendsPos} setTrendsPos={setTrendsPos}
          />
        )}
        {activeView === 'Draft'     && <DraftView />}
        {activeView === 'History'   && <HistoryView />}
        {activeView === 'TV Guide'  && <TVGuideView currentWeek={activeWeek} />}
      </main>

      <Footer />
    </div>
  )
}

// ── AMAZON ASSOCIATES ─────────────────────────────────────────────────────────
const AMAZON_TAG = 'nysportsdaily-20'
const AMAZON_URL = `https://www.amazon.com?tag=${AMAZON_TAG}`

// ── ROSTER LINKS ──────────────────────────────────────────────────────────────
const ROSTER_LINKS = {
  ARI:'https://www.azcardinals.com/team/players-roster/', ATL:'https://www.atlantafalcons.com/team/players-roster/',
  BAL:'https://www.baltimoreravens.com/team/players-roster/', BUF:'https://www.buffalobills.com/team/players-roster/',
  CAR:'https://www.panthers.com/team/players-roster/', CHI:'https://www.chicagobears.com/team/players-roster/',
  CIN:'https://www.bengals.com/team/players-roster/', CLE:'https://www.clevelandbrowns.com/team/players-roster/',
  DAL:'https://www.dallascowboys.com/team/players-roster/', DEN:'https://www.denverbroncos.com/team/players-roster/',
  DET:'https://www.detroitlions.com/team/players-roster/', GB:'https://www.packers.com/team/players-roster/',
  HOU:'https://www.houstontexans.com/team/players-roster/', IND:'https://www.colts.com/team/players-roster/',
  JAC:'https://www.jaguars.com/team/players-roster/', KC:'https://www.chiefs.com/team/players-roster/',
  LA:'https://www.therams.com/team/players-roster/', LAC:'https://www.chargers.com/team/players-roster/',
  LV:'https://www.raiders.com/team/players-roster/', MIA:'https://www.miamidolphins.com/team/players-roster/',
  MIN:'https://www.vikings.com/team/players-roster/', NE:'https://www.patriots.com/team/players-roster/',
  NO:'https://www.neworleanssaints.com/team/players-roster/', NYG:'https://www.giants.com/team/players-roster/',
  NYJ:'https://www.newyorkjets.com/team/players-roster/', PHI:'https://www.philadelphiaeagles.com/team/players-roster/',
  PIT:'https://www.steelers.com/team/players-roster/', SEA:'https://www.seahawks.com/team/players-roster/',
  SF:'https://www.49ers.com/team/players-roster/', TB:'https://www.buccaneers.com/team/players-roster/',
  TEN:'https://www.titansonline.com/team/players-roster/', WAS:'https://www.commanders.com/team/players-roster/',
}

// ── STREAMING LINKS ───────────────────────────────────────────────────────────
const NETWORK_LINKS = {
  'NBC':           'https://www.peacocktv.com',
  'NBC/SNF':       'https://www.peacocktv.com',
  'NBC/Peacock':   'https://www.peacocktv.com',
  'Peacock':       'https://www.peacocktv.com',
  'CBS':           'https://www.paramountplus.com',
  'Fox':           'https://www.foxsports.com',
  'ESPN':          'https://www.espn.com/watch',
  'ESPN/MNF':      'https://www.espn.com/watch',
  'ABC':           'https://www.espn.com/watch',
  'Amazon/TNF':    `https://www.amazon.com/primevideo?tag=${AMAZON_TAG}`,
  'Amazon':        `https://www.amazon.com/primevideo?tag=${AMAZON_TAG}`,
  'Netflix':       'https://www.netflix.com',
  'NFL Network':   'https://www.nfl.com/network',
  'NFL+':          'https://www.nfl.com/plus',
}

// ── NEWS TICKER HOOK ──────────────────────────────────────────────────────────
function useNFLNews() {
  const [headlines, setHeadlines] = useState([])

  useEffect(() => {
    fetch('/api/espn/news?limit=20')
      .then(r => r.json())
      .then(data => {
        const items = (data.articles || []).map(a => ({
          headline: a.headline,
          link:     a.links?.web?.href || 'https://www.espn.com/nfl',
          time:     a.published ? new Date(a.published).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '',
        }))
        setHeadlines(items)
      })
      .catch(() => {})
  }, [])

  return headlines
}

// ── MASTHEAD ──────────────────────────────────────────────────────────────────
function Masthead({ lastUpdated, hasLiveGame, onRefresh, fontTheme, setFontTheme }) {
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })
  const vol = `Vol. ${now.getFullYear()} · No. ${Math.ceil((now - new Date(now.getFullYear(),0,1))/(7*86400000))}`
  const headlines = useNFLNews()

  const [logoFont, setLogoFont] = useState(() => localStorage.getItem('fw-logo') || 'gothic')

  useEffect(() => {
    localStorage.setItem('fw-logo', logoFont)
    document.body.style.setProperty('--font-logo', LOGO_FONTS[logoFont]?.family)
  }, [logoFont])

  const LOGO_FONTS = {
    gothic:   { family: "'UnifrakturMaguntia', serif",     label: 'Gothic' },
    playfair: { family: "'Playfair Display', serif",        label: 'Serif' },
    oswald:   { family: "'Oswald', sans-serif",             label: 'Bold' },
    crimson:  { family: "'Crimson Text', serif",            label: 'Elegant' },
  }

  const FONTS = [
    { id:'classic',  label:'Classic' },
    { id:'modern',   label:'Modern' },
    { id:'elegant',  label:'Elegant' },
    { id:'bold',     label:'Bold' },
  ]

  return (
    <header className="masthead">
      <div className="edition-line">
        <span>{vol}</span>
        <div className="font-switcher">
          <span className="font-switcher-label">Type:</span>
          {FONTS.map(f => (
            <button key={f.id} className={`font-btn ${fontTheme === f.id ? 'on' : ''}`}
              onClick={() => setFontTheme(f.id)}>{f.label}</button>
          ))}
          <span className="font-switcher-label" style={{marginLeft:6}}>Title:</span>
          {Object.entries(LOGO_FONTS).map(([id, f]) => (
            <button key={id} className={`font-btn ${logoFont === id ? 'on' : ''}`}
              onClick={() => setLogoFont(id)}>{f.label}</button>
          ))}
        </div>
        <span>{dateStr}</span>
      </div>
      <div className="logo">The Final Whistle</div>
      <div className="tagline">NFL · Scores · Box Scores · Fantasy · Schedule · nflboxscore.com</div>
      <div className="support-bar">
        <span className="support-text">Independent &amp; ad-free. If it's useful,</span>
        <span className="support-div">—</span>
        <a className="support-link" href="https://buymeacoffee.com/mhughes65v" target="_blank" rel="noopener">
          buy me a coffee ☕
        </a>
        <span className="support-div">·</span>
        <a className="support-link amazon" href={AMAZON_URL} target="_blank" rel="noopener">
          shop amazon 🛒
        </a>
        {lastUpdated && (
          <span className="live-badge" onClick={onRefresh} title="Click to refresh">
            {hasLiveGame && <span className="live-dot" />}
            {hasLiveGame ? 'LIVE' : `Updated ${lastUpdated.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`}
          </span>
        )}
      </div>
      {headlines.length > 0 && (
        <div className="news-ticker-wrap">
          <span className="ticker-label">NFL NEWS</span>
          <div className="ticker-track">
            <div className="ticker-inner">
              {[...headlines, ...headlines].map((h, i) => (
                <a key={i} href={h.link} target="_blank" rel="noopener" className="ticker-item">
                  {h.headline}
                  <span className="ticker-sep">·</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

// ── WEEK SELECTOR ─────────────────────────────────────────────────────────────
function WeekSelector({ active, onChange }) {
  return (
    <div className="week-selector">
      <div className="week-label-row">
        <span className="ws-label">Week</span>
        <div className="ws-pills">
          {ALL_WEEKS.map(w => (
            <button
              key={w}
              className={`ws-btn ${active === w ? 'on' : ''}`}
              onClick={() => onChange(w)}
            >{w}</button>
          ))}
        </div>
      </div>
      {WEEK_META[active] && (
        <div className="week-meta-bar">
          <span className="wm-label">{WEEK_META[active].label}</span>
          <span className="wm-dates">{WEEK_META[active].dates}</span>
          {WEEK_META[active].note && <span className="wm-note">{WEEK_META[active].note}</span>}
        </div>
      )}
    </div>
  )
}

// ── SCORES VIEW ───────────────────────────────────────────────────────────────
function ScoresView({ week, games, loading, error, openCardId, setOpenCardId, activeWeek, setActiveWeek }) {
  return (
    <div>
      <WeekSelector active={activeWeek} onChange={setActiveWeek} />
      <div className="section-bar">
        <h2>Week {week} Scores</h2>
        <div className="sb-rule" />
        <span className="sb-ct">
          {loading ? 'Loading…' : `${games.length} game${games.length !== 1 ? 's' : ''}`}
        </span>
      </div>
      {error && <div className="error-bar">⚠ Could not reach ESPN — showing scheduled games. <button onClick={() => window.location.reload()}>Retry</button></div>}
      <div className="games-grid">
        {games.map((g, i) => (
          <GameCard
            key={`${g.home}-${g.away}-${g.date}`}
            game={g}
            isOpen={openCardId === `${g.home}-${g.away}`}
            onToggle={() => setOpenCardId(
              openCardId === `${g.home}-${g.away}` ? null : `${g.home}-${g.away}`
            )}
            index={i}
          />
        ))}
      </div>
    </div>
  )
}

// ── GAME CARD ─────────────────────────────────────────────────────────────────
function GameCard({ game: g, isOpen, onToggle, index }) {
  const { data: boxData, loading: boxLoading } = useBoxScore(isOpen ? g.espnId : null)

  const isFinal    = g.status === 'final'
  const isLive     = g.status === 'live'
  const isUpcoming = g.status === 'upcoming'
  const isFeat     = g.note?.includes('Rematch') || g.note?.includes('Opener') || g.note?.includes('Super Bowl')

  const homeWin = isFinal && g.homeScore > g.awayScore
  const awayWin = isFinal && g.awayScore > g.homeScore

  const statusLabel = isLive
    ? `Q${g.period} · ${g.displayClock}`
    : isFinal ? 'Final'
    : g.time

  const netColor = networkColor(g.network)

  return (
    <div
      className={`game-card ${isOpen ? 'open' : ''} ${isFeat ? 'featured' : ''}`}
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      {/* HEADER — always visible, click to toggle */}
      <div className="card-head" onClick={onToggle}>
        {g.note && <div className="card-note">{g.note}</div>}
        {g.intl  && <div className="card-intl">🌍 {g.intlCity}</div>}
        <div className="card-status-row">
          <span className={`card-status ${isLive ? 'live' : isFinal ? 'final' : 'upcoming'}`}>
            {isLive && <span className="status-dot" />}
            {statusLabel}
          </span>
          {g.network && (
            <a
              href={NETWORK_LINKS[g.network] || NETWORK_LINKS[g.network?.split('/')?.[0]] || NETWORK_LINKS[g.network?.split('/')?.[1]] || 'https://www.nfl.com'}
              target="_blank"
              rel="noopener"
              className="network-badge"
              style={{ background: netColor.bg, color: netColor.text }}
              onClick={e => e.stopPropagation()}
            >
              {g.network.replace('/SNF','').replace('/MNF','').replace('/TNF','').replace('/Peacock','')}
            </a>
          )}
        </div>

        <div className="matchup">
          <TeamRow abbr={g.away} score={g.awayScore} isWin={awayWin} isLose={homeWin} isHome={false} />
          <div className="match-divider" />
          <TeamRow abbr={g.home} score={g.homeScore} isWin={homeWin} isLose={awayWin} isHome={true} />
        </div>

        {/* Linescore */}
        {(isFinal || isLive) && g.periods && Object.keys(g.periods).length > 0 && (
          <Linescore game={g} />
        )}

        <div className="card-toggle-hint">
          <span className="tog-arr">{isOpen ? '▲' : '▼'}</span>
          {isFinal ? 'Box Score & Stats' : 'Game Info'}
        </div>
      </div>

      {/* DRAWER */}
      {isOpen && (
        <div className="drawer">
          {isFinal && (
            <BoxScoreDrawer espnData={boxData} loading={boxLoading} game={g} />
          )}
          {isUpcoming && <GameInfoDrawer game={g} />}
          {isLive && <LiveDrawer game={g} espnData={boxData} loading={boxLoading} />}
        </div>
      )}
    </div>
  )
}

function TeamRow({ abbr, score, isWin, isLose, isHome }) {
  const info = ti(abbr)
  return (
    <div className={`team-row ${isWin ? 'winner' : ''} ${isLose ? 'loser' : ''}`}>
      <div className="team-left">
        <span className="team-abv">{abbr}</span>
        <span className="team-city">{info.city} · {isHome ? 'Home' : 'Away'}</span>
      </div>
      <span className="team-score">{score != null ? score : '—'}</span>
    </div>
  )
}

function Linescore({ game: g }) {
  const qs = Object.keys(g.periods || {})
  if (!qs.length) return null
  const teams = [g.away, g.home]
  return (
    <div className="linescore-wrap">
      <table className="ls-table">
        <thead>
          <tr>
            <th className="lt-team"></th>
            {qs.map(q => <th key={q}>{q}</th>)}
            <th className="lt-total">F</th>
          </tr>
        </thead>
        <tbody>
          {teams.map(tm => {
            const isW = tm === (g.homeScore > g.awayScore ? g.home : g.away)
            return (
              <tr key={tm} className={isW ? 'lwin' : ''}>
                <td className="lt-team">{tm}</td>
                {qs.map(q => <td key={q}>{g.periods[q]?.[tm] ?? 0}</td>)}
                <td className="lt-total">{g.score?.[tm] ?? (tm === g.home ? g.homeScore : g.awayScore)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── BOX SCORE DRAWER ──────────────────────────────────────────────────────────
function BoxScoreDrawer({ espnData, loading, game }) {
  const [drawerTab, setDrawerTab] = useState('scoring')

  if (loading) return <div className="drawer-loading">Loading box score…</div>
  if (!espnData) return <div className="drawer-loading">Box score not available</div>

  const tabs = ['Scoring', 'Team Stats', 'Passing', 'Rushing', 'Receiving', 'Defense']

  return (
    <div className="box-drawer">
      <div className="drawer-tabs">
        {tabs.map(t => (
          <button
            key={t}
            className={`dtab ${drawerTab === t.toLowerCase().replace(' ', '_') ? 'on' : ''}`}
            onClick={() => setDrawerTab(t.toLowerCase().replace(' ', '_'))}
          >{t}</button>
        ))}
      </div>
      <div className="drawer-panel">
        {drawerTab === 'scoring'     && <ScoringPlays espnData={espnData} />}
        {drawerTab === 'team_stats'  && <TeamStats espnData={espnData} game={game} />}
        {drawerTab === 'passing'     && <PlayerStats espnData={espnData} cat="passing" />}
        {drawerTab === 'rushing'     && <PlayerStats espnData={espnData} cat="rushing" />}
        {drawerTab === 'receiving'   && <PlayerStats espnData={espnData} cat="receiving" />}
        {drawerTab === 'defense'     && <PlayerStats espnData={espnData} cat="defensive" />}
      </div>
    </div>
  )
}

function ScoringPlays({ espnData }) {
  const plays = espnData?.scoringPlays || []
  if (!plays.length) return <div className="no-data">No scoring plays available</div>
  return (
    <div className="scoring-plays">
      {plays.map((p, i) => (
        <div key={i} className="play-row">
          <span className="play-q">Q{p.period?.number}</span>
          <span className="play-clock">{p.clock?.displayValue}</span>
          <span className="play-team">{p.team?.abbreviation}</span>
          <span className="play-text">{p.text}</span>
          <span className="play-score">{p.awayScore}–{p.homeScore}</span>
        </div>
      ))}
    </div>
  )
}

function TeamStats({ espnData, game: g }) {
  const teams = espnData?.boxscore?.teams || []
  if (!teams.length) return <div className="no-data">Team stats not available</div>

  const getStats = (tm) => {
    const teamData = teams.find(t => t.team?.abbreviation === tm ||
      t.team?.abbreviation?.replace('LAR','LA').replace('WSH','WAS').replace('JAX','JAC') === tm)
    const stats = {}
    teamData?.statistics?.forEach(s => { stats[s.name] = s.displayValue })
    return stats
  }

  const awayStats = getStats(g.away)
  const homeStats = getStats(g.home)

  const rows = [
    ['Total Yards',       'totalYards',       true ],
    ['Passing Yards',     'netPassingYards',   true ],
    ['Rushing Yards',     'rushingYards',      true ],
    ['First Downs',       'firstDowns',        true ],
    ['Turnovers',         'turnovers',         false],
    ['Sacks',             'sacks',             true ],
    ['Penalty Yards',     'penaltyYards',      false],
    ['Time of Poss.',     'possessionTime',    null ],
  ]

  return (
    <div className="team-stats">
      <div className="ts-header">
        <span className="ts-team">{g.away}</span>
        <span className="ts-mid"></span>
        <span className="ts-team">{g.home}</span>
      </div>
      {rows.map(([label, key, moreIsBetter]) => {
        const av = awayStats[key] || '—'
        const hv = homeStats[key] || '—'
        return (
          <div key={key} className="ts-row">
            <span className="ts-val">{av}</span>
            <span className="ts-label">{label}</span>
            <span className="ts-val right">{hv}</span>
          </div>
        )
      })}
    </div>
  )
}

function PlayerStats({ espnData, cat }) {
  const teams = espnData?.boxscore?.players || []

  const allPlayers = []
  teams.forEach(teamData => {
    const tm = teamData.team?.abbreviation || ''
    const statGroup = teamData.statistics?.find(s => s.name === cat)
    if (!statGroup) return
    statGroup.athletes?.forEach(a => {
      const vals = {}
      statGroup.labels?.forEach((lbl, i) => { vals[lbl] = a.stats?.[i] || '0' })
      allPlayers.push({ name: a.athlete?.displayName || '—', team: tm, ...vals })
    })
  })

  if (!allPlayers.length) return <div className="no-data">No {cat} stats available</div>

  // Determine columns based on category
  const colMap = {
    passing:   ['C/ATT', 'YDS', 'AVG', 'TD', 'INT', 'QBR'],
    rushing:   ['CAR',   'YDS', 'AVG', 'TD', 'LNG'],
    receiving: ['REC',   'YDS', 'AVG', 'TD', 'LNG', 'TGT'],
    defensive: ['TOT',   'SOLO','SACKS','TFL','PD',  'INT'],
  }
  const cols = colMap[cat] || Object.keys(allPlayers[0]).filter(k => k !== 'name' && k !== 'team')

  return (
    <table className="player-table">
      <thead>
        <tr>
          <th className="pt-name">Player</th>
          <th className="pt-team">TM</th>
          {cols.map(c => <th key={c}>{c}</th>)}
        </tr>
      </thead>
      <tbody>
        {allPlayers.map((p, i) => (
          <tr key={i}>
            <td className="pt-name">{p.name}</td>
            <td className="pt-team">{p.team}</td>
            {cols.map(c => <td key={c}>{p[c] || '—'}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function LiveDrawer({ game: g, espnData, loading }) {
  return (
    <div className="live-drawer">
      <div className="live-header">
        <span className="live-dot large" />
        <span>Live · Q{g.period} {g.displayClock}</span>
      </div>
      {loading ? <div className="drawer-loading">Loading live data…</div>
               : <ScoringPlays espnData={espnData} />}
    </div>
  )
}

function GameInfoDrawer({ game: g }) {
  // Season gate defined locally for this component
  const seasonStarted = new Date() >= new Date('2026-09-09T00:00:00-04:00')
  // Weather for outdoor stadiums during season
  const homeTeam = g.home
  const isOutdoor = OUTDOOR_STADIUMS.includes(homeTeam)
  const weatherCity = isOutdoor ? STADIUM_CITIES[homeTeam] : null
  const weather = useWeather(seasonStarted && weatherCity ? weatherCity : null)

  // Parse odds for display
  const parseOdds = (oddsStr) => {
    if (!oddsStr) return null
    // Format: "KC -3.5" or "Over/Under 47.5"
    const parts = oddsStr.split(' ')
    return oddsStr
  }

  return (
    <div className="game-info-drawer">
      <div className="gi-row"><span>Date</span><span>{g.date} · {g.day}</span></div>
      <div className="gi-row"><span>Kickoff</span><span>{g.time} ET</span></div>
      <div className="gi-row">
        <span>Network</span>
        <span>
          {g.network && NETWORK_LINKS[g.network] ? (
            <a href={NETWORK_LINKS[g.network] || NETWORK_LINKS[g.network?.split('/')?.[0]]} target="_blank" rel="noopener" className="sb-google-link">
              {g.network} ↗
            </a>
          ) : g.network}
        </span>
      </div>
      {g.venue && (
        <div className="gi-row">
          <span>Venue</span>
          <a href={`https://www.google.com/search?q=${encodeURIComponent(g.venue)}`} target="_blank" rel="noopener" className="sb-google-link">
            {g.venue}
          </a>
        </div>
      )}
      {g.intl  && <div className="gi-row"><span>Location</span><span>🌍 {g.intlCity}</span></div>}
      {/* Roster links */}
      <div className="gi-row">
        <span>Rosters</span>
        <span style={{display:'flex',gap:8}}>
          <a href={ROSTER_LINKS[g.away]} target="_blank" rel="noopener" className="sb-google-link">{g.away} Roster ↗</a>
          <span>·</span>
          <a href={ROSTER_LINKS[g.home]} target="_blank" rel="noopener" className="sb-google-link">{g.home} Roster ↗</a>
        </span>
      </div>
      {g.odds  && (
        <div className="gi-row gi-odds">
          <span>Spread</span>
          <span className="gi-odds-val">{g.odds}</span>
        </div>
      )}
      {/* Weather widget for outdoor games */}
      {isOutdoor && (
        <div className="gi-row gi-weather">
          <span>Weather</span>
          {weather ? (
            <span className="gi-weather-val">
              {weather.icon} {weather.temp}°F · {weather.wind}mph wind
              {weather.rain ? ' · Rain' : ''}
              {weather.fantasy && <span className="gi-weather-warning"> {weather.fantasy}</span>}
            </span>
          ) : (
            <span className="gi-weather-val">☀️ Check closer to game</span>
          )}
        </div>
      )}
      {!isOutdoor && <div className="gi-row"><span>Stadium</span><span>🏟️ Indoor / Dome</span></div>}
      {g.note  && <div className="gi-note">{g.note}</div>}
    </div>
  )
}

// ── SCHEDULE VIEW ─────────────────────────────────────────────────────────────
function ScheduleView({ teamFilter, setTeamFilter, weekFilter, setWeekFilter }) {
  const isTeamView = teamFilter !== 'All'
  const isWeekView = !isTeamView && weekFilter !== 'All'
  const isAllView  = !isTeamView && weekFilter === 'All'

  // Only fetch from ESPN after season starts
  const seasonStarted = new Date() >= new Date('2026-09-09T00:00:00-04:00')

  // Team view — fetch from ESPN only during season, otherwise use static immediately
  const { games: espnTeamGames, loading: teamLoading } = useTeamSchedule(
    isTeamView && seasonStarted ? teamFilter : null
  )

  // During off-season, always use static data for team view
  const teamGames = (isTeamView && seasonStarted) ? espnTeamGames : []
  const loading = seasonStarted ? teamLoading : false

  // Week view — fetch from ESPN scoreboard only during season
  const { games: weekGames } = useWeekSchedule(
    isWeekView && seasonStarted ? weekFilter : null
  )

  // Group team games by week
  const teamByWeek = {}
  teamGames.forEach(g => {
    const w = g.week || 'TBD'
    if (!teamByWeek[w]) teamByWeek[w] = []
    teamByWeek[w].push(g)
  })

  // Team record from ESPN data
  let record = null
  if (isTeamView && teamGames.length) {
    const played = teamGames.filter(g => g.status === 'final')
    const wins   = played.filter(g =>
      (g.home === teamFilter && g.homeScore > g.awayScore) ||
      (g.away === teamFilter && g.awayScore > g.homeScore)
    ).length
    let pf = 0, pa = 0
    played.forEach(g => {
      if (g.home === teamFilter) { pf += g.homeScore||0; pa += g.awayScore||0 }
      else { pf += g.awayScore||0; pa += g.homeScore||0 }
    })
    record = { w: wins, l: played.length - wins, gp: played.length, pf, pa }
  }

  const subtitle = isTeamView
    ? `${ti(teamFilter).city} ${ti(teamFilter).nick} — 2026 Schedule`
    : isWeekView ? `Week ${weekFilter} — All Games`
    : '2026 Complete Season · Sep 9 – Jan 10'

  return (
    <div>
      <div className="section-bar">
        <h2>Schedule</h2>
        <div className="sb-rule" />
        <span className="sb-ct">{subtitle}</span>
      </div>

      {/* Filters */}
      <div className="sch-filters">
        <div className="filter-group">
          <span className="filter-label">Team</span>
          <div className="filter-pills">
            {['All', ...ALL_TEAMS].map(t => (
              <button key={t} className={`fpill ${teamFilter === t ? 'on' : ''}`}
                onClick={() => { setTeamFilter(t); setWeekFilter('All') }}
              >{t}</button>
            ))}
          </div>
        </div>
        {!isTeamView && (
          <div className="filter-group">
            <span className="filter-label">Week</span>
            <div className="filter-pills">
              <button className={`fpill ${weekFilter === 'All' ? 'on' : ''}`} onClick={() => setWeekFilter('All')}>All</button>
              {ALL_WEEKS.map(w => (
                <button key={w} className={`fpill ${weekFilter === w ? 'on' : ''}`}
                  onClick={() => setWeekFilter(w)}>Wk {w}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Team record bar */}
      {record && (
        <div className="team-summary-bar">
          <div className="ts-left">
            <span className="ts-name">{teamFilter} · {ti(teamFilter).city} {ti(teamFilter).nick}</span>
            <span className="ts-rec">{record.w}–{record.l}</span>
          </div>
          <div className="ts-right">
            {record.gp > 0 && <>
              <span className="ts-stat">PF <strong>{record.pf}</strong></span>
              <span className="ts-stat">PA <strong>{record.pa}</strong></span>
              <span className="ts-stat">Diff <strong>{record.pf-record.pa > 0 ? '+':''}{record.pf-record.pa}</strong></span>
            </>}
            <button className="ts-clear" onClick={() => setTeamFilter('All')}>All teams ×</button>
          </div>
        </div>
      )}

      {loading && <div className="sch-loading">Loading from ESPN…</div>}

      {/* TEAM VIEW — ESPN live data during season, static fallback off-season */}
      {isTeamView && (
        loading
          ? <div className="sch-loading">Loading {ti(teamFilter).city} schedule…</div>
          : teamGames.length > 0
            ? Object.keys(teamByWeek).sort((a,b) => Number(a)-Number(b)).map(w => {
                const meta = WEEK_META[Number(w)] || { label: `Week ${w}`, dates: '' }
                return (
                  <div key={w} className="sch-week-block">
                    <div className="sch-week-header">
                      <span className="swh-title">{meta.label}</span>
                      <span className="swh-dates">{meta.dates}</span>
                    </div>
                    <div className="sch-games-list">
                      {teamByWeek[w].map((g,i) => <ScheduleGame key={i} game={g} onTeamClick={setTeamFilter} />)}
                    </div>
                  </div>
                )
              })
            : /* Off-season — always show static schedule */
              (() => {
                const teamGamesStatic = SCHEDULE_2026.filter(g =>
                  g.home === teamFilter || g.away === teamFilter
                )
                if (!teamGamesStatic.length) return (
                  <div className="leaders-coming-soon">
                    <div className="cs-icon">📅</div>
                    <div className="cs-title">No schedule found for {teamFilter}</div>
                  </div>
                )
                const byW = {}
                teamGamesStatic.forEach(g => {
                  if (!byW[g.week]) byW[g.week] = []
                  byW[g.week].push(g)
                })
                return ALL_WEEKS.map(w => {
                  if (!byW[w]) return null
                  const meta = WEEK_META[w] || { label: `Week ${w}`, dates: '' }
                  return (
                    <div key={w} className="sch-week-block">
                      <div className="sch-week-header">
                        <span className="swh-title">{meta.label}{meta.note ? ` · ${meta.note}` : ''}</span>
                        <span className="swh-dates">{meta.dates}</span>
                      </div>
                      <div className="sch-games-list">
                        {byW[w].map((g,i) => <ScheduleGame key={i} game={g} onTeamClick={setTeamFilter} />)}
                      </div>
                    </div>
                  )
                })
              })()
      )}

      {/* WEEK VIEW — ESPN scoreboard */}
      {isWeekView && !loading && (
        <div className="sch-week-block">
          <div className="sch-week-header">
            <span className="swh-title">{WEEK_META[weekFilter]?.label || `Week ${weekFilter}`}</span>
            <span className="swh-dates">{WEEK_META[weekFilter]?.dates || ''}</span>
          </div>
          <div className="sch-games-list">
            {(weekGames.length ? weekGames : SCHEDULE_2026.filter(g => g.week === weekFilter))
              .map((g,i) => <ScheduleGame key={i} game={g} onTeamClick={setTeamFilter} />)}
          </div>
        </div>
      )}

      {/* ALL VIEW — season overview, no individual game matchups */}
      {isAllView && !loading && (
        <div>
          <div className="sch-overview-prompt">
            <div className="sop-icon">🏈</div>
            <div className="sop-title">Select a team to see their full schedule</div>
            <div className="sop-text">Tap any team above for their confirmed ESPN schedule — correct bye weeks, kickoff times, and results as the season progresses.</div>
          </div>
          <div className="sch-season-grid">
            {ALL_WEEKS.map(w => {
              const meta = WEEK_META[w] || { label: `Week ${w}`, dates: '' }
              // Collect notable games/events for this week from our confirmed data
              const notables = SCHEDULE_2026.filter(g =>
                g.week === w && (g.note || g.intl)
              )
              return (
                <div key={w} className="sch-season-card">
                  <div className="ssc-week">{meta.label}</div>
                  <div className="ssc-dates">{meta.dates}</div>
                  {meta.note && <div className="ssc-note">{meta.note}</div>}
                  {notables.map((g, i) => (
                    <div key={i} className="ssc-highlight">
                      {g.intl && <span className="ssc-intl">🌍 {g.intlCity}</span>}
                      {g.note && !g.intl && <span className="ssc-event">{g.note}</span>}
                    </div>
                  ))}
                  <button
                    className="ssc-pick-team"
                    onClick={() => {
                      setWeekFilter(w)
                    }}
                  >View Week {w} →</button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function ScheduleGame({ game: g, onTeamClick }) {
  const isFinal    = g.status === 'final'
  const isLive     = g.status === 'live'
  const homeWin    = isFinal && g.homeScore > g.awayScore
  const awayWin    = isFinal && g.awayScore > g.homeScore
  const netColor   = networkColor(g.network)
  const netLink    = NETWORK_LINKS[g.network] || NETWORK_LINKS[g.network?.split('/')?.[0]] || null

  return (
    <div className={`sch-game ${isFinal ? 'sg-final' : isLive ? 'sg-live' : ''}`}>
      <div className="sg-meta">
        <span className="sg-day">{g.day}</span>
        <span className={`sg-status ${isFinal ? 'final' : isLive ? 'live' : ''}`}>
          {isFinal ? 'Final' : isLive ? `Q${g.period} ${g.displayClock}` : g.date}
        </span>
        {g.intl && <span className="sg-intl">🌍 {g.intlCity}</span>}
        {g.network && netLink ? (
          <a href={netLink} target="_blank" rel="noopener" className="sg-net sg-net-link" style={{ background: netColor.bg, color: netColor.text }}
             onClick={e => e.stopPropagation()}>
            {g.network.split('/')[0]}
          </a>
        ) : g.network ? (
          <span className="sg-net" style={{ background: netColor.bg, color: netColor.text }}>
            {g.network.split('/')[0]}
          </span>
        ) : null}
      </div>
      <div className="sg-teams">
        <div className={`sg-team ${awayWin ? 'win' : homeWin ? 'lose' : ''}`}>
          <span className="sg-abv" onClick={() => onTeamClick(g.away)} style={{cursor:'pointer'}}>{g.away}</span>
          <a href={ti(g.away).url} target="_blank" rel="noopener" className="sg-city sg-team-link" onClick={e => e.stopPropagation()}>{ti(g.away).city}</a>
          <span className="sg-ha">Away</span>
        </div>
        <div className="sg-vs">at</div>
        <div className={`sg-team ${homeWin ? 'win' : awayWin ? 'lose' : ''}`}>
          <span className="sg-abv" onClick={() => onTeamClick(g.home)} style={{cursor:'pointer'}}>{g.home}</span>
          <a href={ti(g.home).url} target="_blank" rel="noopener" className="sg-city sg-team-link" onClick={e => e.stopPropagation()}>{ti(g.home).city}</a>
          <span className="sg-ha">Home</span>
        </div>
      </div>
      {isFinal || isLive ? (
        <div className="sg-scores">
          <span className={awayWin ? 'sg-score-win' : ''}>{g.awayScore}</span>
          <span className="sg-dash">–</span>
          <span className={homeWin ? 'sg-score-win' : ''}>{g.homeScore}</span>
        </div>
      ) : (
        <div className="sg-time">{g.time}</div>
      )}
      {g.note && <div className="sg-note">{g.note}</div>}
    </div>
  )
}

// ── STANDINGS ─────────────────────────────────────────────────────────────────
// Placeholder — will be replaced with ESPN live standings data
function StandingsView() {
  const { data, loading } = (() => {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    useEffect(() => {
      fetch('/api/espn/standings')
        .then(r => r.json())
        .then(d => { setData(d); setLoading(false) })
        .catch(() => setLoading(false))
    }, [])
    return { data, loading }
  })()

  const DIVISIONS = [
    ['AFC East', ['BUF','MIA','NE','NYJ']],
    ['AFC North',['BAL','CIN','CLE','PIT']],
    ['AFC South',['HOU','IND','JAC','TEN']],
    ['AFC West', ['DEN','KC','LAC','LV']],
    ['NFC East', ['DAL','NYG','PHI','WAS']],
    ['NFC North',['CHI','DET','GB','MIN']],
    ['NFC South',['ATL','CAR','NO','TB']],
    ['NFC West', ['ARI','LA','SEA','SF']],
  ]

  return (
    <div>
      <div className="section-bar">
        <h2>2026 Standings</h2>
        <div className="sb-rule" />
        <span className="sb-ct">{loading ? 'Loading…' : 'Regular Season'}</span>
      </div>
      <div className="standings-grid">
        {DIVISIONS.map(([divName, teams]) => (
          <div key={divName} className="div-block">
            <div className="div-name">{divName}</div>
            <table className="std-table">
              <thead>
                <tr>
                  <th className="std-team"></th>
                  <th>W</th><th>L</th><th>T</th><th>PCT</th><th>PF</th><th>PA</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((tm, i) => {
                  // Try to find from ESPN data, fallback to 0-0
                  const espnTeam = data?.children
                    ?.flatMap(c => c.standings?.entries || [])
                    ?.find(e => e.team?.abbreviation === tm ||
                      e.team?.abbreviation?.replace('LAR','LA').replace('WSH','WAS').replace('JAX','JAC') === tm)
                  const stats = espnTeam?.stats || []
                  const getStat = (n) => stats.find(s => s.name === n)?.value ?? 0
                  const w   = getStat('wins')
                  const l   = getStat('losses')
                  const t   = getStat('ties')
                  const pct = (w + l + t) > 0 ? fmt(w/(w+l+t), 3).replace('0.', '.') : '.000'
                  const pf  = getStat('pointsFor')
                  const pa  = getStat('pointsAgainst')
                  return (
                    <tr key={tm} className={i === 0 ? 'div-leader' : ''}>
                      <td className="std-team">
                        <span className="std-abv">{tm}</span>
                        <span className="std-nick">{ti(tm).nick}</span>
                      </td>
                      <td className="std-w">{w}</td>
                      <td>{l}</td>
                      <td>{t}</td>
                      <td>{pct}</td>
                      <td>{pf}</td>
                      <td>{pa}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="div-key">
              <span className="dk-div">■ Division leader</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── LEADERS ───────────────────────────────────────────────────────────────────
function LeadersView({ tab, setTab }) {
  return (
    <div>
      <div className="section-bar">
        <h2>2026 NFL Leaders</h2>
        <div className="sb-rule" />
        <span className="sb-ct">Season Stats</span>
      </div>
      <div className="leaders-tabs">
        {['Offense', 'Defense'].map(t => (
          <button
            key={t}
            className={`ltab ${tab === t.toLowerCase() ? 'on' : ''}`}
            onClick={() => setTab(t.toLowerCase())}
          >{t}</button>
        ))}
      </div>
      <div className="leaders-coming-soon">
        <div className="cs-icon">📊</div>
        <div className="cs-title">Season Stats Available Week 1</div>
        <div className="cs-text">
          Individual player leaderboards will populate automatically as the 2026 season kicks off September 9.
          Stats pull live from ESPN after each game.
        </div>
        <div className="cs-date">Kickoff: Sep 9, 2026 · SEA vs NE · 8:20 PM ET</div>
      </div>
    </div>
  )
}

// ── FANTASY VIEW ──────────────────────────────────────────────────────────────
// ── START/SIT PLAYER DATABASE ─────────────────────────────────────────────────
// Static player pool for Start/Sit analysis (updates with real data during season)
const PLAYER_POOL = [
  // QBs
  { name:'Patrick Mahomes',  team:'KC',  pos:'QB', proj:28.4, matchup:'vs DEN', matchupRating:8, lastWk:34.2, avgPts:27.1 },
  { name:'Josh Allen',       team:'BUF', pos:'QB', proj:26.8, matchup:'vs NE',  matchupRating:9, lastWk:31.5, avgPts:25.9 },
  { name:'Lamar Jackson',    team:'BAL', pos:'QB', proj:25.2, matchup:'vs CLE', matchupRating:7, lastWk:22.1, avgPts:24.8 },
  { name:'Jalen Hurts',      team:'PHI', pos:'QB', proj:24.6, matchup:'vs DAL', matchupRating:6, lastWk:28.4, avgPts:23.9 },
  { name:'Joe Burrow',       team:'CIN', pos:'QB', proj:23.8, matchup:'vs PIT', matchupRating:7, lastWk:19.2, avgPts:22.6 },
  { name:'Dak Prescott',     team:'DAL', pos:'QB', proj:22.4, matchup:'vs PHI', matchupRating:5, lastWk:24.1, avgPts:21.8 },
  { name:'Jordan Love',      team:'GB',  pos:'QB', proj:21.9, matchup:'vs MIN', matchupRating:6, lastWk:18.7, avgPts:20.4 },
  { name:'Tua Tagovailoa',   team:'MIA', pos:'QB', proj:21.2, matchup:'vs NYJ', matchupRating:8, lastWk:25.6, avgPts:21.0 },
  { name:'CJ Stroud',        team:'HOU', pos:'QB', proj:20.8, matchup:'vs IND', matchupRating:9, lastWk:22.3, avgPts:20.1 },
  { name:'Sam Darnold',      team:'SEA', pos:'QB', proj:20.1, matchup:'vs SF',  matchupRating:4, lastWk:17.4, avgPts:19.2 },
  { name:'Fernando Mendoza', team:'LV',  pos:'QB', proj:18.4, matchup:'vs KC',  matchupRating:3, lastWk:null, avgPts:null },
  // RBs
  { name:'Bijan Robinson',   team:'ATL', pos:'RB', proj:18.6, matchup:'vs NO',  matchupRating:8, lastWk:22.4, avgPts:17.8 },
  { name:'Breece Hall',      team:'NYJ', pos:'RB', proj:17.2, matchup:'vs MIA', matchupRating:6, lastWk:14.8, avgPts:16.4 },
  { name:'Jahmyr Gibbs',     team:'DET', pos:'RB', proj:16.9, matchup:'vs GB',  matchupRating:7, lastWk:19.2, avgPts:16.1 },
  { name:'De\'Von Achane',   team:'MIA', pos:'RB', proj:16.4, matchup:'vs NYJ', matchupRating:8, lastWk:12.1, avgPts:15.8 },
  { name:'Saquon Barkley',   team:'PHI', pos:'RB', proj:15.8, matchup:'vs DAL', matchupRating:6, lastWk:18.4, avgPts:15.2 },
  { name:'Tony Pollard',     team:'TEN', pos:'RB', proj:14.2, matchup:'vs JAC', matchupRating:7, lastWk:11.6, avgPts:13.8 },
  { name:'Kenneth Walker',   team:'SEA', pos:'RB', proj:13.8, matchup:'vs SF',  matchupRating:4, lastWk:16.2, avgPts:14.1 },
  { name:'Jeremiyah Love',   team:'ARI', pos:'RB', proj:13.2, matchup:'vs LAR', matchupRating:6, lastWk:null, avgPts:null },
  // WRs
  { name:'Tyreek Hill',      team:'MIA', pos:'WR', proj:18.4, matchup:'vs NYJ', matchupRating:8, lastWk:24.6, avgPts:17.2 },
  { name:'CeeDee Lamb',      team:'DAL', pos:'WR', proj:17.8, matchup:'vs PHI', matchupRating:5, lastWk:21.2, avgPts:17.0 },
  { name:'Stefon Diggs',     team:'HOU', pos:'WR', proj:16.2, matchup:'vs IND', matchupRating:9, lastWk:14.8, avgPts:15.6 },
  { name:'Ja\'Marr Chase',   team:'CIN', pos:'WR', proj:16.0, matchup:'vs PIT', matchupRating:7, lastWk:18.4, avgPts:15.4 },
  { name:'A.J. Brown',       team:'PHI', pos:'WR', proj:15.6, matchup:'vs DAL', matchupRating:5, lastWk:17.2, avgPts:15.0 },
  { name:'Malik Nabers',     team:'NYG', pos:'WR', proj:14.8, matchup:'vs WAS', matchupRating:6, lastWk:12.4, avgPts:14.2 },
  { name:'Davante Adams',    team:'NYJ', pos:'WR', proj:14.2, matchup:'vs MIA', matchupRating:6, lastWk:16.8, avgPts:13.8 },
  { name:'Carnell Tate',     team:'TEN', pos:'WR', proj:12.4, matchup:'vs JAC', matchupRating:7, lastWk:null, avgPts:null },
  // TEs
  { name:'Sam LaPorta',      team:'DET', pos:'TE', proj:14.2, matchup:'vs GB',  matchupRating:7, lastWk:16.8, avgPts:13.4 },
  { name:'Mark Andrews',     team:'BAL', pos:'TE', proj:13.6, matchup:'vs CLE', matchupRating:7, lastWk:11.2, avgPts:12.8 },
  { name:'Travis Kelce',     team:'KC',  pos:'TE', proj:12.8, matchup:'vs DEN', matchupRating:8, lastWk:14.6, avgPts:12.2 },
  { name:'Kyle Pitts',       team:'ATL', pos:'TE', proj:11.4, matchup:'vs NO',  matchupRating:8, lastWk:8.4,  avgPts:10.8 },
  { name:'Trey McBride',     team:'ARI', pos:'TE', proj:10.8, matchup:'vs LAR', matchupRating:6, lastWk:12.2, avgPts:10.4 },
]

const MATCHUP_RATINGS = {
  1:'🔴 Nightmare', 2:'🔴 Very Hard', 3:'🔴 Hard',
  4:'🟠 Below Avg', 5:'🟡 Average', 6:'🟡 Slight Edge',
  7:'🟢 Good', 8:'🟢 Great', 9:'🟢 Excellent', 10:'🟢 Dream'
}

function StartSitView({ mode }) {
  const [playerA, setPlayerA] = useState(null)
  const [playerB, setPlayerB] = useState(null)
  const [searchA, setSearchA] = useState('')
  const [searchB, setSearchB] = useState('')
  const [showA,   setShowA]   = useState(false)
  const [showB,   setShowB]   = useState(false)

  const filteredA = searchA.length > 1
    ? PLAYER_POOL.filter(p => p.name.toLowerCase().includes(searchA.toLowerCase())).slice(0,8)
    : []
  const filteredB = searchB.length > 1
    ? PLAYER_POOL.filter(p => p.name.toLowerCase().includes(searchB.toLowerCase())).slice(0,8)
    : []

  const scorePlayer = (p) => {
    if (!p) return 0
    let score = 0
    score += (p.proj || 0) * 3
    score += (p.matchupRating || 5) * 2
    score += (p.lastWk || p.avgPts || 0) * 0.5
    return score
  }

  const scoreA = scorePlayer(playerA)
  const scoreB = scorePlayer(playerB)
  const recommendation = playerA && playerB
    ? scoreA > scoreB ? { start: playerA, sit: playerB } : { start: playerB, sit: playerA }
    : null

  const gradeColor = (rating) => {
    if (rating >= 8) return '#1a4a1a'
    if (rating >= 6) return '#c8a84b'
    return '#8b1a1a'
  }

  return (
    <div>
      <div className="section-bar">
        <h2>Start / Sit Analyzer</h2>
        <div className="sb-rule" />
        <span className="sb-ct">Compare two players · Get a recommendation</span>
      </div>

      <div className="startsit-wrap">
        {/* Search row */}
        <div className="startsit-search">
          {/* Player A */}
          <div className="ss-input-wrap">
            <input className="ss-input" placeholder="Search Player 1…"
              value={playerA ? playerA.name : searchA}
              onChange={e => { setSearchA(e.target.value); setPlayerA(null); setShowA(true) }}
              onFocus={() => setShowA(true)}
            />
            {showA && filteredA.length > 0 && !playerA && (
              <div className="ss-dropdown">
                {filteredA.map((p, i) => (
                  <div key={i} className="ss-option"
                    onMouseDown={() => { setPlayerA(p); setSearchA(''); setShowA(false) }}>
                    <span className="ss-opt-pos">{p.pos}</span>
                    <span>{p.name}</span>
                    <span className="ss-opt-team">{p.team}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="ss-vs">vs</div>

          {/* Player B */}
          <div className="ss-input-wrap">
            <input className="ss-input" placeholder="Search Player 2…"
              value={playerB ? playerB.name : searchB}
              onChange={e => { setSearchB(e.target.value); setPlayerB(null); setShowB(true) }}
              onFocus={() => setShowB(true)}
            />
            {showB && filteredB.length > 0 && !playerB && (
              <div className="ss-dropdown">
                {filteredB.map((p, i) => (
                  <div key={i} className="ss-option"
                    onMouseDown={() => { setPlayerB(p); setSearchB(''); setShowB(false) }}>
                    <span className="ss-opt-pos">{p.pos}</span>
                    <span>{p.name}</span>
                    <span className="ss-opt-team">{p.team}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Comparison */}
        {(!playerA || !playerB) && (
          <div className="ss-placeholder">
            Search two players above to compare
          </div>
        )}

        {playerA && playerB && recommendation && (
          <div className="ss-comparison">
            {/* Player A card */}
            <div className={`ss-player-card ${recommendation.start === playerA ? 'winner' : 'loser'}`}>
              <div className="ss-card-header">
                <div className="ss-card-name">{playerA.name}</div>
                <div className="ss-card-meta">{playerA.team} · {playerA.pos} · {playerA.matchup}</div>
              </div>
              <div className="ss-card-body">
                <div className="ss-stat">
                  <span className="ss-stat-label">Projected Pts</span>
                  <span className="ss-stat-val">{mode === 'ppr' && playerA.pos !== 'QB' ? (playerA.proj + 2).toFixed(1) : playerA.proj}</span>
                </div>
                <div className="ss-stat">
                  <span className="ss-stat-label">Matchup</span>
                  <span className="ss-stat-val" style={{color: gradeColor(playerA.matchupRating), fontSize:10}}>
                    {MATCHUP_RATINGS[playerA.matchupRating]}
                  </span>
                </div>
                <div className="ss-stat">
                  <span className="ss-stat-label">Last Week</span>
                  <span className="ss-stat-val">{playerA.lastWk || 'Rookie'}</span>
                </div>
                <div className="ss-stat">
                  <span className="ss-stat-label">Season Avg</span>
                  <span className="ss-stat-val">{playerA.avgPts || 'Rookie'}</span>
                </div>
                <div style={{textAlign:'center', paddingTop:8}}>
                  <span className={`ss-rec-badge ${recommendation.start === playerA ? 'start' : 'sit'}`}>
                    {recommendation.start === playerA ? '✓ START' : '✗ SIT'}
                  </span>
                </div>
              </div>
            </div>

            {/* Verdict */}
            <div className="ss-verdict">
              <div className="ss-verdict-label">Recommendation</div>
              <div className={`ss-verdict-val ${recommendation.start === playerA ? 'start' : 'sit'}`}>
                {recommendation.start.name.split(' ').pop()}
              </div>
              <div style={{fontSize:9, fontFamily:'var(--font-mono)', color:'var(--muted-lt)', marginTop:8, lineHeight:1.4}}>
                Based on projections, matchup rating, and recent form
              </div>
            </div>

            {/* Player B card */}
            <div className={`ss-player-card ${recommendation.start === playerB ? 'winner' : 'loser'}`}>
              <div className="ss-card-header">
                <div className="ss-card-name">{playerB.name}</div>
                <div className="ss-card-meta">{playerB.team} · {playerB.pos} · {playerB.matchup}</div>
              </div>
              <div className="ss-card-body">
                <div className="ss-stat">
                  <span className="ss-stat-label">Projected Pts</span>
                  <span className="ss-stat-val">{mode === 'ppr' && playerB.pos !== 'QB' ? (playerB.proj + 2).toFixed(1) : playerB.proj}</span>
                </div>
                <div className="ss-stat">
                  <span className="ss-stat-label">Matchup</span>
                  <span className="ss-stat-val" style={{color: gradeColor(playerB.matchupRating), fontSize:10}}>
                    {MATCHUP_RATINGS[playerB.matchupRating]}
                  </span>
                </div>
                <div className="ss-stat">
                  <span className="ss-stat-label">Last Week</span>
                  <span className="ss-stat-val">{playerB.lastWk || 'Rookie'}</span>
                </div>
                <div className="ss-stat">
                  <span className="ss-stat-label">Season Avg</span>
                  <span className="ss-stat-val">{playerB.avgPts || 'Rookie'}</span>
                </div>
                <div style={{textAlign:'center', paddingTop:8}}>
                  <span className={`ss-rec-badge ${recommendation.start === playerB ? 'start' : 'sit'}`}>
                    {recommendation.start === playerB ? '✓ START' : '✗ SIT'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Off-season note */}
        <div className="atl-note">
          Projections and matchup ratings update weekly during the season based on live ESPN data.
          Pre-season figures are estimates based on 2025 averages. {mode === 'ppr' ? 'PPR' : 'Standard'} scoring.
        </div>
      </div>
    </div>
  )
}

// ── FANTASY NEWS ──────────────────────────────────────────────────────────────
function FantasyNewsView({ mode }) {
  const [articles,   setArticles]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [source,     setSource]     = useState('espn') // 'espn' | 'google'
  const [posFilter,  setPosFilter]  = useState('All')
  const [teamFilter, setTeamFilter] = useState('All')

  useEffect(() => {
    setLoading(true)
    setArticles([])
    if (source === 'espn') {
      fetch('/api/espn/news?limit=40')
        .then(r => r.json())
        .then(data => {
          const items = (data.articles || []).map(a => ({
            headline: a.headline || '',
            desc:     a.description || '',
            link:     a.links?.web?.href || '#',
            image:    a.images?.[0]?.url || null,
            time:     a.published ? new Date(a.published) : null,
            byline:   a.byline || '',
            team:     a.categories?.find(c => c.type === 'team')?.description || '',
            tags:     a.categories?.map(c => c.description).filter(Boolean) || [],
          }))
          setArticles(items)
          setLoading(false)
        })
        .catch(() => setLoading(false))
    } else {
      // Google News RSS via allorigins proxy
      fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent('https://news.google.com/rss/search?q=NFL+fantasy+football&hl=en-US&gl=US&ceid=US:en')}`)
        .then(r => r.text())
        .then(xml => {
          const parser = new DOMParser()
          const doc = parser.parseFromString(xml, 'text/xml')
          const items = Array.from(doc.querySelectorAll('item')).slice(0, 40).map(item => ({
            headline: item.querySelector('title')?.textContent || '',
            desc:     item.querySelector('description')?.textContent?.replace(/<[^>]+>/g,'') || '',
            link:     item.querySelector('link')?.textContent || '#',
            image:    null,
            time:     item.querySelector('pubDate') ? new Date(item.querySelector('pubDate').textContent) : null,
            byline:   item.querySelector('source')?.textContent || 'Google News',
            team:     '',
            tags:     [],
          }))
          setArticles(items)
          setLoading(false)
        })
        .catch(() => setLoading(false))
    }
  }, [source])

  const timeAgo = (date) => {
    if (!date) return ''
    const diff = Date.now() - date.getTime()
    const mins = Math.floor(diff / 60000)
    const hrs  = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 60)  return `${mins}m ago`
    if (hrs  < 24)  return `${hrs}h ago`
    return `${days}d ago`
  }

  const filtered = articles.filter(a => {
    if (teamFilter !== 'All' && !a.headline.includes(teamFilter) && !a.team.includes(teamFilter)) return false
    if (posFilter  !== 'All') {
      const posKeywords = { QB:['QB','quarterback','passing'], RB:['RB','running back','rush'], WR:['WR','receiver','receiving'], TE:['TE','tight end'] }
      const kws = posKeywords[posFilter] || []
      const text = (a.headline + a.desc).toLowerCase()
      if (!kws.some(k => text.includes(k.toLowerCase()))) return false
    }
    return true
  })

  return (
    <div>
      {/* Controls */}
      <div className="fn-controls">
        <div className="fn-source-btns">
          <span className="tc-label">Source</span>
          <button className={`tc-btn ${source === 'espn' ? 'on' : ''}`} onClick={() => setSource('espn')}>ESPN</button>
          <button className={`tc-btn ${source === 'google' ? 'on' : ''}`} onClick={() => setSource('google')}>Google News</button>
        </div>
        <div className="fn-source-btns">
          <span className="tc-label">Position</span>
          {['All','QB','RB','WR','TE'].map(p => (
            <button key={p} className={`tc-btn ${posFilter === p ? 'on' : ''}`} onClick={() => setPosFilter(p)}>{p}</button>
          ))}
        </div>
        <div className="fn-source-btns" style={{flexWrap:'wrap'}}>
          <span className="tc-label">Team</span>
          {['All', ...ALL_TEAMS].map(t => (
            <button key={t} className={`fpill ${teamFilter === t ? 'on' : ''}`} onClick={() => setTeamFilter(t)}>{t}</button>
          ))}
        </div>
      </div>

      {loading && <div className="sch-loading">Loading fantasy news…</div>}

      {!loading && filtered.length > 0 && (
        <div className="news-grid">
          {filtered.map((a, i) => (
            <a key={i} href={a.link} target="_blank" rel="noopener"
               className={`news-card ${i === 0 ? 'news-featured' : ''}`}>
              {a.image && i < 6 && (
                <div className="news-img-wrap">
                  <img src={a.image} alt="" className="news-img" loading="lazy" />
                </div>
              )}
              <div className="news-body">
                {a.team && <span className="news-team-tag">{a.team}</span>}
                <div className="news-headline">{a.headline}</div>
                {a.desc && i < 8 && (
                  <div className="news-desc">{a.desc.slice(0,120)}{a.desc.length > 120 ? '…' : ''}</div>
                )}
                <div className="news-meta">
                  <span className="news-byline">{a.byline}</span>
                  {a.time && <span className="news-time">{timeAgo(a.time)}</span>}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="leaders-coming-soon">
          <div className="cs-icon">📰</div>
          <div className="cs-title">No fantasy news found</div>
          <div className="cs-text">Try a different filter or source.</div>
        </div>
      )}
    </div>
  )
}

// ── WAIVER WIRE VIEW ──────────────────────────────────────────────────────────
const WAIVER_TARGETS = [
  { player:'Malik Washington',   team:'DEN', pos:'WR', owned:'18%', reason:'Courtland Sutton dealing with knee — Washington steps into WR1 role vs soft secondary', priority:'HIGH' },
  { player:'Tyjae Spears',       team:'TEN', pos:'RB', owned:'31%', reason:'Tony Pollard listed questionable — Spears has workhorse upside if Pollard misses Week 5', priority:'HIGH' },
  { player:'Cole Kmet',          team:'CHI', pos:'TE', owned:'42%', reason:'With Caleb Williams hot, Kmet is his favorite red zone target — 4 TDs in last 3 weeks', priority:'MED' },
  { player:'Demarcus Robinson',  team:'LAR', pos:'WR', owned:'8%',  reason:'Cooper Kupp on IR — Robinson becomes LA\'s WR2 immediately', priority:'HIGH' },
  { player:'Jordan Mason',       team:'SF',  pos:'RB', owned:'55%', reason:'Christian McCaffrey limited in practice — Mason is the handcuff every 49ers manager needs', priority:'MED' },
  { player:'Chosen Anderson',    team:'ARI', pos:'WR', owned:'12%', reason:'Kyler Murray has been targeting him in the slot — 8 catches last week', priority:'MED' },
  { player:'Dalton Kincaid',     team:'BUF', pos:'TE', owned:'38%', reason:'Emerging as Josh Allen\'s safety valve — 6+ targets in 3 straight games', priority:'MED' },
  { player:'Antonio Gibson',     team:'WAS', pos:'RB', owned:'22%', reason:'Brian Robinson dealing with ankle — Gibson poised for lead back role', priority:'HIGH' },
  { player:'Rashid Shaheed',     team:'NO',  pos:'WR', owned:'29%', reason:'Big play ability in Saints offense — Chris Olave questionable Week 5', priority:'LOW' },
  { player:'Hunter Henry',       team:'NE',  pos:'TE', owned:'15%', reason:'Drake Maye loves targeting TEs — Henry averaging 6 targets/game', priority:'LOW' },
]

function WaiverWireView() {
  const [posFilter, setPosFilter] = useState('All')
  const [priFilter, setPriFilter] = useState('All')

  const filtered = WAIVER_TARGETS.filter(p => {
    if (posFilter !== 'All' && p.pos !== posFilter) return false
    if (priFilter !== 'All' && p.priority !== priFilter) return false
    return true
  })

  const priColor = { HIGH:'#c00', MED:'#c8a84b', LOW:'#555' }

  return (
    <div>
      <div className="ww-controls">
        <div className="tc-group">
          <span className="tc-label">Position</span>
          <div className="tc-btns">
            {['All','QB','RB','WR','TE'].map(p => (
              <button key={p} className={`tc-btn ${posFilter === p ? 'on' : ''}`} onClick={() => setPosFilter(p)}>{p}</button>
            ))}
          </div>
        </div>
        <div className="tc-group">
          <span className="tc-label">Priority</span>
          <div className="tc-btns">
            {['All','HIGH','MED','LOW'].map(p => (
              <button key={p} className={`tc-btn ${priFilter === p ? 'on' : ''}`} onClick={() => setPriFilter(p)}>{p}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="ww-intro">
        <span style={{fontFamily:'var(--font-body)', fontStyle:'italic', fontSize:12, color:'var(--muted)'}}>
          Waiver wire targets based on injuries, usage trends, and matchup analysis. Updates weekly during the season.
        </span>
      </div>
      {filtered.map((p, i) => (
        <a key={i} href={`https://www.google.com/search?q=${encodeURIComponent(p.player+' fantasy football 2026')}`}
           target="_blank" rel="noopener" className="ww-card">
          <div className="ww-priority" style={{background: priColor[p.priority]}}>{p.priority}</div>
          <div className="ww-info">
            <div className="ww-player">{p.player}</div>
            <div className="ww-meta">
              <span className="ww-team">{p.team}</span>
              <span className="ww-pos">{p.pos}</span>
              <span className="ww-owned">{p.owned} owned</span>
            </div>
            <div className="ww-reason">{p.reason}</div>
          </div>
          <div className="ww-arrow">↗</div>
        </a>
      ))}
      <div className="atl-note">Ownership percentages are estimates. Adds should be made before your league\'s waiver deadline.</div>
    </div>
  )
}

// ── MATCHUP RATER VIEW ────────────────────────────────────────────────────────
const MATCHUP_DATA = {
  QB: { best:['DET','NO','WAS','LAV','TB'], worst:['SF','BAL','DEN','NYJ','PHI'] },
  RB: { best:['DET','NO','LAC','MIA','LV'], worst:['SF','BAL','CLE','NYJ','CHI'] },
  WR: { best:['DET','NO','WAS','TB','LV'],  worst:['SF','DEN','BAL','NYJ','PHI'] },
  TE: { best:['DET','NO','MIA','TB','LV'],  worst:['SF','BAL','KC','NYJ','CHI'] },
}

function MatchupRaterView() {
  const [pos, setPos] = useState('WR')
  const currentWeek = getAutoWeek()

  const weekGames = SCHEDULE_2026.filter(g => g.week === currentWeek)

  const getRating = (team, pos) => {
    const data = MATCHUP_DATA[pos]
    if (!data) return 5
    if (data.best.includes(team))  return data.best.indexOf(team)  <= 1 ? 9 : 7
    if (data.worst.includes(team)) return data.worst.indexOf(team) <= 1 ? 2 : 3
    return 5
  }

  const getLabel = (r) => r >= 8 ? '🟢 Excellent' : r >= 6 ? '🟢 Good' : r >= 4 ? '🟡 Average' : r >= 3 ? '🟠 Tough' : '🔴 Avoid'

  const gamesWithRatings = weekGames.map(g => ({
    ...g,
    homeRating: getRating(g.away, pos), // home team faces away defense
    awayRating: getRating(g.home, pos), // away team faces home defense
  })).sort((a, b) => Math.max(b.homeRating, b.awayRating) - Math.max(a.homeRating, a.awayRating))

  return (
    <div>
      <div className="tc-group" style={{padding:'10px 16px', borderBottom:'1px solid var(--rule)', background:'var(--paper-mid)'}}>
        <span className="tc-label">Position</span>
        <div className="tc-btns">
          {['QB','RB','WR','TE'].map(p => (
            <button key={p} className={`tc-btn ${pos === p ? 'on' : ''}`} onClick={() => setPos(p)}>{p}</button>
          ))}
        </div>
      </div>
      <div className="matchup-intro">
        <span style={{fontFamily:'var(--font-body)', fontStyle:'italic', fontSize:12, color:'var(--muted)'}}>
          Defensive matchup ratings for Week {currentWeek} — ranked best to worst for {pos}s.
          Green = start with confidence. Red = consider sitting.
        </span>
      </div>
      <table className="matchup-table">
        <thead>
          <tr>
            <th>Game</th>
            <th>Time</th>
            <th>Away {pos} Matchup</th>
            <th>Home {pos} Matchup</th>
          </tr>
        </thead>
        <tbody>
          {gamesWithRatings.map((g, i) => (
            <tr key={i}>
              <td className="mt-game">{g.away} @ {g.home}</td>
              <td className="mt-time">{g.time !== 'TBD' ? g.time : g.day}</td>
              <td>
                <span className="mt-rating" style={{color: g.awayRating >= 7 ? '#1a4a1a' : g.awayRating <= 3 ? '#8b1a1a' : '#6b5700'}}>
                  {getLabel(g.awayRating)}
                </span>
                <span className="mt-sub">vs {g.home} D</span>
              </td>
              <td>
                <span className="mt-rating" style={{color: g.homeRating >= 7 ? '#1a4a1a' : g.homeRating <= 3 ? '#8b1a1a' : '#6b5700'}}>
                  {getLabel(g.homeRating)}
                </span>
                <span className="mt-sub">vs {g.away} D</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="atl-note">Matchup ratings based on 2025 defensive statistics. Updates before Week 1 with 2026 preseason data.</div>
    </div>
  )
}

function FantasyView({ mode, setMode, currentWeek, trendsMode, setTrendsMode, trendsRange, setTrendsRange, trendsPos, setTrendsPos }) {
  const [tab, setTab] = useState('startsit')
  const TABS = [
    { id:'startsit',  label:'⚖️ Start/Sit' },
    { id:'matchups',  label:'🎯 Matchups' },
    { id:'waiver',    label:'📋 Waiver Wire' },
    { id:'trends',    label:'🔥 Trends' },
    { id:'news',      label:'📰 Fantasy News' },
    { id:'scoring',   label:'📊 Scoring' },
  ]
  return (
    <div>
      <div className="section-bar">
        <h2>Fantasy Hub</h2>
        <div className="sb-rule" />
        <span className="sb-ct">Start/Sit · Matchups · Waiver · Trends · News · {mode === 'ppr' ? 'PPR' : 'Standard'}</span>
      </div>
      <div className="fant-mode-bar">
        <span className="fmb-label">Scoring</span>
        <div className="fmb-btns">
          <button className={`fmb-btn ${mode === 'std' ? 'on' : ''}`} onClick={() => setMode('std')}>Standard</button>
          <button className={`fmb-btn ${mode === 'ppr' ? 'on' : ''}`} onClick={() => setMode('ppr')}>PPR</button>
        </div>
        <span className="fmb-key">Pass 1pt/25yds · 6pt TD · −2 INT · Rush/Rec 1pt/10yds{mode === 'ppr' ? ' · +1pt REC' : ''}</span>
      </div>
      <div className="hist-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`htab ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>
      {tab === 'startsit' && <StartSitView mode={mode} />}
      {tab === 'matchups' && <MatchupRaterView />}
      {tab === 'waiver'   && <WaiverWireView />}
      {tab === 'trends'   && (
        <TrendsView currentWeek={currentWeek}
          mode={trendsMode} setMode={setTrendsMode}
          range={trendsRange} setRange={setTrendsRange}
          pos={trendsPos} setPos={setTrendsPos} />
      )}
      {tab === 'news'     && <FantasyNewsView mode={mode} />}
      {tab === 'scoring'  && (
        <div className="leaders-coming-soon">
          <div className="cs-icon">⚡</div>
          <div className="cs-title">Fantasy Scoring Leaders — Week 1</div>
          <div className="cs-text">Fantasy point totals populate after games are played.</div>
          <div className="cs-date">Season opens Sep 9 · SEA vs NE</div>
        </div>
      )}
    </div>
  )
}

// ── FANTASY SCORING HELPERS ───────────────────────────────────────────────────
function calcFantasyPts(stats, mode, pos) {
  if (!stats) return 0
  let pts = 0

  if (pos === 'K') {
    // Kicker scoring: 3pt FG <40, 4pt 40-49, 5pt 50+, 1pt XP
    pts += (parseInt(stats['FG'] || stats['FGM'] || 0)) * 3
    pts += (parseInt(stats['XP'] || stats['XPM'] || 0)) * 1
    return Math.round(pts * 10) / 10
  }

  if (pos === 'DEF') {
    // DEF/ST scoring
    const sacks    = parseFloat(stats['SACKS'] || stats['TOT'] || 0)
    const ints     = parseFloat(stats['INT'] || 0)
    const fum      = parseFloat(stats['FR']  || 0)
    const td       = parseFloat(stats['TD']  || 0)
    pts += sacks * 1
    pts += ints  * 2
    pts += fum   * 2
    pts += td    * 6
    return Math.round(pts * 10) / 10
  }

  // Skill positions
  const passYds = parseFloat(stats['YDS'] || 0)
  const passTDs = parseFloat(stats['TD']  || 0)
  const ints    = parseFloat(stats['INT'] || 0)
  const rushYds = parseFloat(stats['YDS'] || 0)
  const rushTDs = parseFloat(stats['TD']  || 0)
  const recYds  = parseFloat(stats['YDS'] || 0)
  const recTDs  = parseFloat(stats['TD']  || 0)
  const recs    = parseFloat(stats['REC'] || 0)

  // Passing
  if (stats['C/ATT'] || stats['QBR']) {
    pts += passYds / 25
    pts += passTDs * 6
    pts -= ints    * 2
  }
  // Rushing
  if (stats['CAR']) {
    pts += rushYds / 10
    pts += rushTDs * 6
  }
  // Receiving
  if (stats['REC'] || stats['TGT']) {
    pts += recYds / 10
    pts += recTDs * 6
    if (mode === 'ppr') pts += recs
  }

  return Math.round(pts * 10) / 10
}

// ESPN stat category → position mapping
const CAT_TO_POS = {
  passing:   'QB',
  rushing:   'RB',
  receiving: 'WR',
  kicking:   'K',
  defensive: 'DEF',
}

// ── TRENDS VIEW ───────────────────────────────────────────────────────────────
function TrendsView({ currentWeek, mode, setMode, range, setRange, pos, setPos }) {
  const [players, setPlayers]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [error,   setError]     = useState(null)
  const [fetched, setFetched]   = useState(false)

  const POSITIONS = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF']
  const RANGES    = [
    { label: 'This Week', value: 1  },
    { label: 'Last 3',    value: 3  },
    { label: 'Last 5',    value: 5  },
    { label: 'Season',    value: 'season' },
  ]

  const seasonStarted = currentWeek > 1 || new Date() >= new Date('2026-09-09')

  useEffect(() => {
    if (!seasonStarted) return
    fetchTrends()
  }, [range, currentWeek])

  async function fetchTrends() {
    setLoading(true)
    setError(null)
    try {
      // Determine which weeks to fetch
      const weeksToFetch = []
      if (range === 'season') {
        for (let w = 1; w <= currentWeek; w++) weeksToFetch.push(w)
      } else {
        const start = Math.max(1, currentWeek - (range - 1))
        for (let w = start; w <= currentWeek; w++) weeksToFetch.push(w)
      }

      // Fetch all scoreboards in parallel
      const scoreboards = await Promise.all(
        weeksToFetch.map(w =>
          fetch(`/api/espn/scoreboard?week=${w}&seasontype=2&limit=20`)
            .then(r => r.json())
            .catch(() => null)
        )
      )

      // Get all game IDs
      const gameIds = []
      scoreboards.forEach((sb, idx) => {
        if (!sb?.events) return
        sb.events.forEach(ev => {
          gameIds.push({ id: ev.id, week: weeksToFetch[idx] })
        })
      })

      // Fetch all box scores in parallel (cap at 20 to avoid rate limits)
      const capped = gameIds.slice(0, 20)
      const boxScores = await Promise.all(
        capped.map(g =>
          fetch(`/api/espn/summary?event=${g.id}`)
            .then(r => r.json())
            .then(data => ({ ...data, week: g.week }))
            .catch(() => null)
        )
      )

      // Aggregate player stats across all box scores
      const playerMap = {} // key: name+team

      boxScores.forEach(bs => {
        if (!bs?.boxscore?.players) return
        bs.boxscore.players.forEach(teamData => {
          const tm = teamData.team?.abbreviation || ''
          teamData.statistics?.forEach(statGroup => {
            const cat = statGroup.name
            const detectedPos = CAT_TO_POS[cat] || 'SKILL'
            statGroup.athletes?.forEach(a => {
              const name = a.athlete?.displayName || ''
              if (!name) return
              const key = `${name}|${tm}`
              const vals = {}
              statGroup.labels?.forEach((lbl, i) => {
                vals[lbl] = a.stats?.[i] || '0'
              })
              const weekPts = calcFantasyPts(vals, mode, detectedPos)
              if (!playerMap[key]) {
                playerMap[key] = {
                  name, team: tm, pos: detectedPos,
                  weeks: {}, totalPts: 0, weekCount: 0,
                }
              }
              if (!playerMap[key].weeks[bs.week]) {
                playerMap[key].weeks[bs.week] = 0
              }
              playerMap[key].weeks[bs.week] += weekPts
            })
          })
        })
      })

      // Calculate totals, averages, and trend
      const allPlayers = Object.values(playerMap).map(p => {
        const weekPts = Object.values(p.weeks)
        const total   = weekPts.reduce((a, b) => a + b, 0)
        const avg     = weekPts.length > 0 ? total / weekPts.length : 0
        const lastWk  = p.weeks[currentWeek] || 0
        const trend   = weekPts.length > 1
          ? lastWk >= avg ? 'hot' : 'cold'
          : 'new'
        return {
          ...p,
          totalPts:  Math.round(total * 10) / 10,
          avgPts:    Math.round(avg   * 10) / 10,
          lastWkPts: Math.round(lastWk * 10) / 10,
          trend,
          weekCount: weekPts.length,
        }
      })

      // Sort by total points descending
      allPlayers.sort((a, b) => b.totalPts - a.totalPts)
      setPlayers(allPlayers)
      setFetched(true)
    } catch(e) {
      setError('Could not load trend data from ESPN.')
    } finally {
      setLoading(false)
    }
  }

  // Filter by position
  const filtered = pos === 'ALL'
    ? players.slice(0, 30)
    : players.filter(p => p.pos === pos).slice(0, 15)

  const rangeLabel = RANGES.find(r => r.value === range)?.label || 'Last 3'

  return (
    <div>
      <div className="section-bar">
        <h2>Fantasy Trends</h2>
        <div className="sb-rule" />
        <span className="sb-ct">{rangeLabel} · {mode === 'ppr' ? 'PPR' : 'Standard'}</span>
      </div>

      {/* Controls */}
      <div className="trends-controls">
        {/* Week range */}
        <div className="tc-group">
          <span className="tc-label">Range</span>
          <div className="tc-btns">
            {RANGES.map(r => (
              <button
                key={r.value}
                className={`tc-btn ${range === r.value ? 'on' : ''}`}
                onClick={() => setRange(r.value)}
              >{r.label}</button>
            ))}
          </div>
        </div>

        {/* Scoring mode */}
        <div className="tc-group">
          <span className="tc-label">Scoring</span>
          <div className="tc-btns">
            <button className={`tc-btn ${mode === 'std' ? 'on' : ''}`} onClick={() => setMode('std')}>Standard</button>
            <button className={`tc-btn ${mode === 'ppr' ? 'on' : ''}`} onClick={() => setMode('ppr')}>PPR</button>
          </div>
        </div>

        {/* Position filter */}
        <div className="tc-group">
          <span className="tc-label">Position</span>
          <div className="tc-btns">
            {POSITIONS.map(p => (
              <button
                key={p}
                className={`tc-btn ${pos === p ? 'on' : ''}`}
                onClick={() => setPos(p)}
              >{p}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Off-season placeholder */}
      {!seasonStarted && (
        <div className="leaders-coming-soon">
          <div className="cs-icon">🔥</div>
          <div className="cs-title">Trends Available Week 3</div>
          <div className="cs-text">
            Fantasy trending stats — hottest players over the last 1, 3, or 5 weeks —
            will populate automatically once the season gets rolling. Standard and PPR
            scoring, all positions including K and DEF, top 10+ per position.
          </div>
          <div className="cs-date">Season opens Sep 9 · SEA vs NE · Need 3 weeks for full trends</div>
        </div>
      )}

      {/* Loading */}
      {seasonStarted && loading && (
        <div className="trends-loading">
          <div className="tl-spinner">⚡</div>
          <div>Crunching {range === 'season' ? 'season' : `last ${range} week${range > 1 ? 's' : ''}`} of box scores…</div>
        </div>
      )}

      {/* Error */}
      {error && <div className="sch-error">{error}</div>}

      {/* Player table */}
      {seasonStarted && !loading && fetched && filtered.length > 0 && (
        <div className="trends-table-wrap">
          <table className="trends-table">
            <thead>
              <tr>
                <th className="tt-rank">#</th>
                <th className="tt-name">Player</th>
                <th className="tt-team">TM</th>
                <th className="tt-pos">POS</th>
                <th className="tt-pts">Total</th>
                <th className="tt-avg">Avg/Wk</th>
                <th className="tt-last">Last Wk</th>
                <th className="tt-trend">Trend</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={`${p.name}-${p.team}`} className={i < 3 ? 'tt-top3' : ''}>
                  <td className="tt-rank">{i + 1}</td>
                  <td className="tt-name">{p.name}</td>
                  <td className="tt-team">{p.team}</td>
                  <td className="tt-pos">{p.pos}</td>
                  <td className="tt-pts">{p.totalPts}</td>
                  <td className="tt-avg">{p.avgPts}</td>
                  <td className="tt-last">{p.lastWkPts}</td>
                  <td className="tt-trend">
                    {p.trend === 'hot'  && <span className="trend-hot">🔥</span>}
                    {p.trend === 'cold' && <span className="trend-cold">❄️</span>}
                    {p.trend === 'new'  && <span className="trend-new">⚡</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="trends-footer">
            {mode === 'ppr' ? 'PPR' : 'Standard'} · Pass 1pt/25yds · 6pt TD · −2 INT · Rush/Rec 1pt/10yds{mode === 'ppr' ? ' · +1pt REC' : ''}
          </div>
        </div>
      )}

      {/* Empty state */}
      {seasonStarted && !loading && fetched && filtered.length === 0 && (
        <div className="leaders-coming-soon">
          <div className="cs-icon">📊</div>
          <div className="cs-title">No data for this filter yet</div>
          <div className="cs-text">Try a different position or week range.</div>
        </div>
      )}
    </div>
  )
}
// ── INJURIES VIEW ─────────────────────────────────────────────────────────────
// ESPN team IDs for all 32 NFL teams
const TEAM_ESPN_IDS = {
  ARI:1, ATL:2, BAL:3, BUF:4, CAR:5, CHI:6, CIN:7, CLE:8,
  DAL:9, DEN:10, DET:11, GB:12, HOU:34, IND:14, JAC:15, KC:16,
  LA:19, LAC:24, LV:13, MIA:20, MIN:21, NE:17, NO:18, NYG:22,
  NYJ:23, PHI:25, PIT:26, SEA:28, SF:29, TB:27, TEN:10, WAS:28,
}
// Fixed ESPN IDs
const ESPN_TEAM_IDS = {
  ARI:22, ATL:1,  BAL:33, BUF:2,  CAR:29, CHI:3,  CIN:4,  CLE:5,
  DAL:6,  DEN:7,  DET:8,  GB:9,   HOU:34, IND:11, JAC:30, KC:12,
  LA:14,  LAC:24, LV:13,  MIA:15, MIN:16, NE:17,  NO:18,  NYG:19,
  NYJ:20, PHI:21, PIT:23, SEA:26, SF:25,  TB:27,  TEN:10, WAS:28,
}

// ── NEWS VIEW ─────────────────────────────────────────────────────────────────
function NewsView({ teamFilter, setTeamFilter }) {
  const [articles, setArticles]   = useState([])
  const [loading,  setLoading]    = useState(true)
  const [error,    setError]      = useState(null)

  // ESPN team IDs for news filtering
  const ESPN_TEAM_NEWS_IDS = {
    ARI:22, ATL:1,  BAL:33, BUF:2,  CAR:29, CHI:3,  CIN:4,  CLE:5,
    DAL:6,  DEN:7,  DET:8,  GB:9,   HOU:34, IND:11, JAC:30, KC:12,
    LA:14,  LAC:24, LV:13,  MIA:15, MIN:16, NE:17,  NO:18,  NYG:19,
    NYJ:20, PHI:21, PIT:23, SEA:26, SF:25,  TB:27,  TEN:10, WAS:28,
  }

  useEffect(() => {
    setLoading(true)
    setArticles([])
    const url = teamFilter !== 'All' && ESPN_TEAM_NEWS_IDS[teamFilter]
      ? `/api/espn/news?team=${ESPN_TEAM_NEWS_IDS[teamFilter]}&limit=25`
      : `/api/espn/news?limit=30`

    fetch(url)
      .then(r => r.json())
      .then(data => {
        const items = (data.articles || []).map(a => ({
          headline:    a.headline || '',
          description: a.description || a.story || '',
          link:        a.links?.web?.href || 'https://www.espn.com/nfl',
          image:       a.images?.[0]?.url || null,
          published:   a.published ? new Date(a.published) : null,
          byline:      a.byline || '',
          categories:  a.categories?.map(c => c.description).filter(Boolean) || [],
          team:        a.categories?.find(c => c.type === 'team')?.description || '',
        }))
        setArticles(items)
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [teamFilter])

  const timeAgo = (date) => {
    if (!date) return ''
    const diff = Date.now() - date.getTime()
    const mins  = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days  = Math.floor(diff / 86400000)
    if (mins < 60)  return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  return (
    <div>
      <div className="section-bar">
        <h2>NFL News</h2>
        <div className="sb-rule" />
        <span className="sb-ct">
          {teamFilter === 'All' ? 'League-Wide' : `${ti(teamFilter).city} ${ti(teamFilter).nick}`}
          {loading ? ' · Loading…' : ` · ${articles.length} stories`}
        </span>
      </div>

      {/* Team filter */}
      <div className="sch-filters">
        <div className="filter-group">
          <span className="filter-label">Team</span>
          <div className="filter-pills">
            {['All', ...ALL_TEAMS].map(t => (
              <button key={t} className={`fpill ${teamFilter === t ? 'on' : ''}`}
                onClick={() => setTeamFilter(t)}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      {loading && <div className="sch-loading">Loading news from ESPN…</div>}
      {error   && <div className="sch-error">Could not load news — {error}</div>}

      {!loading && articles.length > 0 && (
        <div className="news-grid">
          {articles.map((a, i) => (
            <a key={i} href={a.link} target="_blank" rel="noopener" className={`news-card ${i === 0 ? 'news-featured' : ''}`}>
              {a.image && i < 6 && (
                <div className="news-img-wrap">
                  <img src={a.image} alt="" className="news-img" loading="lazy" />
                </div>
              )}
              <div className="news-body">
                {a.team && <span className="news-team-tag">{a.team}</span>}
                <div className="news-headline">{a.headline}</div>
                {a.description && i < 10 && (
                  <div className="news-desc">{a.description.slice(0, 120)}{a.description.length > 120 ? '…' : ''}</div>
                )}
                <div className="news-meta">
                  {a.byline && <span className="news-byline">{a.byline}</span>}
                  {a.published && <span className="news-time">{timeAgo(a.published)}</span>}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {!loading && articles.length === 0 && !error && (
        <div className="leaders-coming-soon">
          <div className="cs-icon">📰</div>
          <div className="cs-title">No news available</div>
          <div className="cs-text">Try a different team or check back later.</div>
        </div>
      )}
    </div>
  )
}

function InjuriesView() {
  const [injuries, setInjuries]   = useState({})
  const [loading,  setLoading]    = useState(false)
  const [teamFilter, setTeamFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [fetched,  setFetched]    = useState(false)

  const STATUS_ORDER = ['Out', 'Doubtful', 'Questionable', 'Probable', 'IR', 'PUP']
  const STATUS_COLORS = {
    'Out':          { bg: '#c00',    text: '#fff' },
    'Doubtful':     { bg: '#c66',    text: '#fff' },
    'Questionable': { bg: '#c8a84b', text: '#000' },
    'Probable':     { bg: '#2a6b2a', text: '#fff' },
    'IR':           { bg: '#333',    text: '#fff' },
    'PUP':          { bg: '#555',    text: '#fff' },
  }

  useEffect(() => {
    fetchAllInjuries()
  }, [])

  async function fetchAllInjuries() {
    setLoading(true)
    try {
      // Fetch injuries for all 32 teams in parallel
      const teams = Object.keys(ESPN_TEAM_IDS)
      const results = await Promise.all(
        teams.map(abbr =>
          fetch(`/api/espn-core/teams/${ESPN_TEAM_IDS[abbr]}/injuries`)
            .then(r => r.json())
            .then(data => ({ abbr, items: data.items || [] }))
            .catch(() => ({ abbr, items: [] }))
        )
      )

      const byTeam = {}
      results.forEach(({ abbr, items }) => {
        if (!items.length) return
        byTeam[abbr] = items.map(inj => ({
          name:     inj.athlete?.displayName || '—',
          pos:      inj.athlete?.position?.abbreviation || '—',
          status:   inj.status || '—',
          detail:   inj.detail || '',
          side:     inj.side || '',
          type:     inj.type || '',
          date:     inj.date ? new Date(inj.date).toLocaleDateString('en-US', {month:'short', day:'numeric'}) : '',
        })).sort((a, b) => {
          const order = ['Out','Doubtful','Questionable','Probable','IR','PUP']
          return (order.indexOf(a.status) || 99) - (order.indexOf(b.status) || 99)
        })
      })

      setInjuries(byTeam)
      setFetched(true)
    } catch(e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Filter teams
  const teamsToShow = teamFilter === 'All'
    ? Object.keys(injuries).sort()
    : Object.keys(injuries).filter(t => t === teamFilter)

  // Count total
  const totalCount = Object.values(injuries).reduce((a, b) => a + b.length, 0)

  // All statuses present
  const allStatuses = ['All', ...STATUS_ORDER.filter(s =>
    Object.values(injuries).some(injs => injs.some(i => i.status === s))
  )]

  return (
    <div>
      <div className="section-bar">
        <h2>NFL Injury Report</h2>
        <div className="sb-rule" />
        <span className="sb-ct">
          {loading ? 'Loading…' : fetched ? `${totalCount} players listed` : 'All 32 Teams'}
        </span>
      </div>

      {/* Filters */}
      <div className="sch-filters">
        <div className="filter-group">
          <span className="filter-label">Team</span>
          <div className="filter-pills">
            {['All', ...ALL_TEAMS].map(t => (
              <button key={t} className={`fpill ${teamFilter === t ? 'on' : ''}`}
                onClick={() => setTeamFilter(t)}>{t}</button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <span className="filter-label">Status</span>
          <div className="filter-pills">
            {allStatuses.map(s => (
              <button key={s} className={`fpill ${statusFilter === s ? 'on' : ''}`}
                onClick={() => setStatusFilter(s)}>{s}</button>
            ))}
          </div>
        </div>
      </div>

      {loading && <div className="sch-loading">Loading injury reports from ESPN…</div>}

      {!loading && fetched && totalCount === 0 && (
        <div className="leaders-coming-soon">
          <div className="cs-icon">🏥</div>
          <div className="cs-title">No injuries reported yet</div>
          <div className="cs-text">Injury reports populate during the season, typically Wednesday–Friday each week.</div>
          <div className="cs-date">Season opens Sep 9 · SEA vs NE</div>
        </div>
      )}

      {!loading && fetched && totalCount > 0 && (
        <div className="injury-grid">
          {teamsToShow.map(abbr => {
            const teamInjs = injuries[abbr]?.filter(i =>
              statusFilter === 'All' || i.status === statusFilter
            ) || []
            if (!teamInjs.length) return null
            return (
              <div key={abbr} className="injury-team-block">
                <div className="itb-header">
                  <span className="itb-abbr">{abbr}</span>
                  <span className="itb-name">{ti(abbr).city} {ti(abbr).nick}</span>
                  <span className="itb-count">{teamInjs.length} listed</span>
                </div>
                <table className="injury-table">
                  <thead>
                    <tr>
                      <th className="it-name">Player</th>
                      <th>POS</th>
                      <th>Injury</th>
                      <th>Status</th>
                      <th>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamInjs.map((inj, i) => {
                      const sc = STATUS_COLORS[inj.status] || { bg: '#555', text: '#fff' }
                      return (
                        <tr key={i}>
                          <td className="it-name">{inj.name}</td>
                          <td className="it-pos">{inj.pos}</td>
                          <td className="it-detail">{inj.side ? `${inj.side} ` : ''}{inj.type || inj.detail}</td>
                          <td>
                            <span className="inj-status-badge" style={{ background: sc.bg, color: sc.text }}>
                              {inj.status}
                            </span>
                          </td>
                          <td className="it-date">{inj.date}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      )}

      {/* Off-season placeholder */}
      {!loading && !fetched && (
        <div className="leaders-coming-soon">
          <div className="cs-icon">🏥</div>
          <div className="cs-title">Injury Report</div>
          <div className="cs-text">
            Full injury reports for all 32 teams — pulled live from ESPN every time you visit.
            Out, Doubtful, Questionable, IR, and PUP designations. Filter by team or status.
            Reports are published Wednesday–Friday each week during the season.
          </div>
          <div className="cs-date">Season opens Sep 9 · SEA vs NE</div>
        </div>
      )}
    </div>
  )
}

// ── HISTORY DATA ─────────────────────────────────────────────────────────────
const SUPER_BOWLS = [
  { num:'LX',   year:2026, winner:'Seattle Seahawks',    loser:'New England Patriots',  score:'29-13', mvp:'Kenneth Walker III',   site:'Santa Clara, CA' },
  { num:'LIX',  year:2025, winner:'Philadelphia Eagles', loser:'Kansas City Chiefs',    score:'40-22', mvp:'Jalen Hurts',          site:'New Orleans, LA' },
  { num:'LVIII',year:2024, winner:'Kansas City Chiefs',  loser:'San Francisco 49ers',   score:'25-22', mvp:'Patrick Mahomes',      site:'Las Vegas, NV' },
  { num:'LVII', year:2023, winner:'Kansas City Chiefs',  loser:'Philadelphia Eagles',   score:'38-35', mvp:'Patrick Mahomes',      site:'Glendale, AZ' },
  { num:'LVI',  year:2022, winner:'Los Angeles Rams',    loser:'Cincinnati Bengals',    score:'23-20', mvp:'Cooper Kupp',          site:'Inglewood, CA' },
  { num:'LV',   year:2021, winner:'Tampa Bay Buccaneers',loser:'Kansas City Chiefs',    score:'31-9',  mvp:'Tom Brady',            site:'Tampa, FL' },
  { num:'LIV',  year:2020, winner:'Kansas City Chiefs',  loser:'San Francisco 49ers',   score:'31-20', mvp:'Patrick Mahomes',      site:'Miami, FL' },
  { num:'LIII', year:2019, winner:'New England Patriots',loser:'Los Angeles Rams',      score:'13-3',  mvp:'Julian Edelman',       site:'Atlanta, GA' },
  { num:'LII',  year:2018, winner:'Philadelphia Eagles', loser:'New England Patriots',  score:'41-33', mvp:'Nick Foles',           site:'Minneapolis, MN' },
  { num:'LI',   year:2017, winner:'New England Patriots',loser:'Atlanta Falcons',       score:'34-28', mvp:'Tom Brady',            site:'Houston, TX' },
  { num:'50',   year:2016, winner:'Denver Broncos',      loser:'Carolina Panthers',     score:'24-10', mvp:'Von Miller',           site:'Santa Clara, CA' },
  { num:'XLIX', year:2015, winner:'New England Patriots',loser:'Seattle Seahawks',      score:'28-24', mvp:'Tom Brady',            site:'Glendale, AZ' },
  { num:'XLVIII',year:2014,winner:'Seattle Seahawks',    loser:'Denver Broncos',        score:'43-8',  mvp:'Malcolm Smith',        site:'East Rutherford, NJ' },
  { num:'XLVII',year:2013, winner:'Baltimore Ravens',    loser:'San Francisco 49ers',   score:'34-31', mvp:'Joe Flacco',           site:'New Orleans, LA' },
  { num:'XLVI', year:2012, winner:'New York Giants',     loser:'New England Patriots',  score:'21-17', mvp:'Eli Manning',          site:'Indianapolis, IN' },
  { num:'XLV',  year:2011, winner:'Green Bay Packers',   loser:'Pittsburgh Steelers',   score:'31-25', mvp:'Aaron Rodgers',        site:'Arlington, TX' },
  { num:'XLIV', year:2010, winner:'New Orleans Saints',  loser:'Indianapolis Colts',    score:'31-17', mvp:'Drew Brees',           site:'Miami, FL' },
  { num:'XLIII',year:2009, winner:'Pittsburgh Steelers', loser:'Arizona Cardinals',     score:'27-23', mvp:'Santonio Holmes',      site:'Tampa, FL' },
  { num:'XLII', year:2008, winner:'New York Giants',     loser:'New England Patriots',  score:'17-14', mvp:'Eli Manning',          site:'Glendale, AZ' },
  { num:'XLI',  year:2007, winner:'Indianapolis Colts',  loser:'Chicago Bears',         score:'29-17', mvp:'Peyton Manning',       site:'Miami, FL' },
  { num:'XL',   year:2006, winner:'Pittsburgh Steelers', loser:'Seattle Seahawks',      score:'21-10', mvp:'Hines Ward',           site:'Detroit, MI' },
  { num:'XXXIX',year:2005, winner:'New England Patriots',loser:'Philadelphia Eagles',   score:'24-21', mvp:'Deion Branch',         site:'Jacksonville, FL' },
  { num:'XXXVIII',year:2004,winner:'New England Patriots',loser:'Carolina Panthers',    score:'32-29', mvp:'Tom Brady',            site:'Houston, TX' },
  { num:'XXXVII',year:2003,winner:'Tampa Bay Buccaneers',loser:'Oakland Raiders',      score:'48-21', mvp:'Dexter Jackson',       site:'San Diego, CA' },
  { num:'XXXVI',year:2002, winner:'New England Patriots',loser:'Los Angeles Rams',      score:'20-17', mvp:'Tom Brady',            site:'New Orleans, LA' },
  { num:'XXXV', year:2001, winner:'Baltimore Ravens',    loser:'New York Giants',       score:'34-7',  mvp:'Ray Lewis',            site:'Tampa, FL' },
  { num:'XXXIV',year:2000, winner:'Los Angeles Rams',    loser:'Tennessee Titans',      score:'23-16', mvp:'Kurt Warner',          site:'Atlanta, GA' },
  { num:'XXXIII',year:1999,winner:'Denver Broncos',      loser:'Atlanta Falcons',       score:'34-19', mvp:'John Elway',           site:'Miami, FL' },
  { num:'XXXII',year:1998, winner:'Denver Broncos',      loser:'Green Bay Packers',     score:'31-24', mvp:'Terrell Davis',        site:'San Diego, CA' },
  { num:'XXXI', year:1997, winner:'Green Bay Packers',   loser:'New England Patriots',  score:'35-21', mvp:'Desmond Howard',       site:'New Orleans, LA' },
  { num:'XXX',  year:1996, winner:'Dallas Cowboys',      loser:'Pittsburgh Steelers',   score:'27-17', mvp:'Larry Brown',          site:'Tempe, AZ' },
  { num:'XXIX', year:1995, winner:'San Francisco 49ers', loser:'San Diego Chargers',    score:'49-26', mvp:'Steve Young',          site:'Miami, FL' },
  { num:'XXVIII',year:1994,winner:'Dallas Cowboys',      loser:'Buffalo Bills',         score:'30-13', mvp:'Emmitt Smith',         site:'Atlanta, GA' },
  { num:'XXVII',year:1993, winner:'Dallas Cowboys',      loser:'Buffalo Bills',         score:'52-17', mvp:'Troy Aikman',          site:'Pasadena, CA' },
  { num:'XXVI', year:1992, winner:'Washington Redskins', loser:'Buffalo Bills',         score:'37-24', mvp:'Mark Rypien',          site:'Minneapolis, MN' },
  { num:'XXV',  year:1991, winner:'New York Giants',     loser:'Buffalo Bills',         score:'20-19', mvp:'Ottis Anderson',       site:'Tampa, FL' },
  { num:'XXIV', year:1990, winner:'San Francisco 49ers', loser:'Denver Broncos',        score:'55-10', mvp:'Joe Montana',          site:'New Orleans, LA' },
  { num:'XXIII',year:1989, winner:'San Francisco 49ers', loser:'Cincinnati Bengals',    score:'20-16', mvp:'Jerry Rice',           site:'Miami, FL' },
  { num:'XXII', year:1988, winner:'Washington Redskins', loser:'Denver Broncos',        score:'42-10', mvp:'Doug Williams',        site:'San Diego, CA' },
  { num:'XXI',  year:1987, winner:'New York Giants',     loser:'Denver Broncos',        score:'39-20', mvp:'Phil Simms',           site:'Pasadena, CA' },
  { num:'XX',   year:1986, winner:'Chicago Bears',       loser:'New England Patriots',  score:'46-10', mvp:'Richard Dent',         site:'New Orleans, LA' },
  { num:'XIX',  year:1985, winner:'San Francisco 49ers', loser:'Miami Dolphins',        score:'38-16', mvp:'Joe Montana',          site:'Stanford, CA' },
  { num:'XVIII',year:1984, winner:'Los Angeles Raiders', loser:'Washington Redskins',   score:'38-9',  mvp:'Marcus Allen',         site:'Tampa, FL' },
  { num:'XVII', year:1983, winner:'Washington Redskins', loser:'Miami Dolphins',        score:'27-17', mvp:'John Riggins',         site:'Pasadena, CA' },
  { num:'XVI',  year:1982, winner:'San Francisco 49ers', loser:'Cincinnati Bengals',    score:'26-21', mvp:'Joe Montana',          site:'Pontiac, MI' },
  { num:'XV',   year:1981, winner:'Oakland Raiders',     loser:'Philadelphia Eagles',   score:'27-10', mvp:'Jim Plunkett',         site:'New Orleans, LA' },
  { num:'XIV',  year:1980, winner:'Pittsburgh Steelers', loser:'Los Angeles Rams',      score:'31-19', mvp:'Terry Bradshaw',       site:'Pasadena, CA' },
  { num:'XIII', year:1979, winner:'Pittsburgh Steelers', loser:'Dallas Cowboys',        score:'35-31', mvp:'Terry Bradshaw',       site:'Miami, FL' },
  { num:'XII',  year:1978, winner:'Dallas Cowboys',      loser:'Denver Broncos',        score:'27-10', mvp:'Harvey Martin / Randy White', site:'New Orleans, LA' },
  { num:'XI',   year:1977, winner:'Oakland Raiders',     loser:'Minnesota Vikings',     score:'32-14', mvp:'Fred Biletnikoff',     site:'Pasadena, CA' },
  { num:'X',    year:1976, winner:'Pittsburgh Steelers', loser:'Dallas Cowboys',        score:'21-17', mvp:'Lynn Swann',           site:'Miami, FL' },
  { num:'IX',   year:1975, winner:'Pittsburgh Steelers', loser:'Minnesota Vikings',     score:'16-6',  mvp:'Franco Harris',        site:'New Orleans, LA' },
  { num:'VIII', year:1974, winner:'Miami Dolphins',      loser:'Minnesota Vikings',     score:'24-7',  mvp:'Larry Csonka',         site:'Houston, TX' },
  { num:'VII',  year:1973, winner:'Miami Dolphins',      loser:'Washington Redskins',   score:'14-7',  mvp:'Jake Scott',           site:'Los Angeles, CA' },
  { num:'VI',   year:1972, winner:'Dallas Cowboys',      loser:'Miami Dolphins',        score:'24-3',  mvp:'Roger Staubach',       site:'New Orleans, LA' },
  { num:'V',    year:1971, winner:'Baltimore Colts',     loser:'Dallas Cowboys',        score:'16-13', mvp:'Chuck Howley',         site:'Miami, FL' },
  { num:'IV',   year:1970, winner:'Kansas City Chiefs',  loser:'Minnesota Vikings',     score:'23-7',  mvp:'Len Dawson',           site:'New Orleans, LA' },
  { num:'III',  year:1969, winner:'New York Jets',       loser:'Baltimore Colts',       score:'16-7',  mvp:'Joe Namath',           site:'Miami, FL' },
  { num:'II',   year:1968, winner:'Green Bay Packers',   loser:'Oakland Raiders',       score:'33-14', mvp:'Bart Starr',           site:'Miami, FL' },
  { num:'I',    year:1967, winner:'Green Bay Packers',   loser:'Kansas City Chiefs',    score:'35-10', mvp:'Bart Starr',           site:'Los Angeles, CA' },
]

const FANTASY_HOF = [
  { player:'Alvin Kamara',        team:'NO',  pos:'RB',  year:2020, week:16, pts:61.8, line:'22 rush yds, 6 rush TD + 6 rec, 46 yds', note:'Six rushing TDs on Christmas Day — all-time single-game TD record' },
  { player:'Patrick Mahomes',     team:'KC',  pos:'QB',  year:2018, week:6,  pts:56.7, line:'6 TD, 478 yds, 0 INT', note:'50 TD season — youngest QB ever to win MVP at 23' },
  { player:'LaDainian Tomlinson', team:'SD',  pos:'RB',  year:2006, week:16, pts:55.4, line:'28 car, 193 rush yds, 3 TD + 4 rec, 57 yds, 1 TD', note:'Greatest fantasy RB season ever — 28 TDs, 1,815 rush yards' },
  { player:'Jamaal Charles',      team:'KC',  pos:'RB',  year:2013, week:14, pts:55.2, line:'6 rush TD, 1 rec TD, 195 scrimmage yds', note:'7 touchdowns in a single game — tied NFL single-game record' },
  { player:'Marshall Faulk',      team:'STL', pos:'RB',  year:2000, week:15, pts:54.6, line:'5 TD, 220 scrimmage yds', note:'Greatest fantasy season ever — 26 TDs, 2,189 scrimmage yards' },
  { player:'Josh Allen',          team:'BUF', pos:'QB',  year:2020, week:15, pts:54.1, line:'4 pass TD, 1 rush TD, 375 yds', note:'Transformed Bills into contenders — the dual-threat QB fantasy managers dream of' },
  { player:'Tom Brady',           team:'NE',  pos:'QB',  year:2007, week:17, pts:52.3, line:'6 TD, 392 yds, 0 INT', note:'Record 50 TD season — Patriots went 16-0 in the regular season' },
  { player:'Jerry Rice',          team:'SF',  pos:'WR',  year:1987, week:11, pts:52.0, line:'3 rec TD, 12 rec, 204 yds', note:'Greatest receiver of all time — 22 TD season in strike-shortened year' },
  { player:'Peyton Manning',      team:'IND', pos:'QB',  year:2004, week:6,  pts:51.2, line:'6 TD, 472 yds, 0 INT', note:'49 TD season record at the time — unanimous MVP' },
  { player:'Priest Holmes',       team:'KC',  pos:'RB',  year:2003, week:8,  pts:53.2, line:'6 TD, 148 yds', note:'27 TD season — dominated fantasy for three consecutive years' },
  { player:'Tyreek Hill',         team:'KC',  pos:'WR',  year:2020, week:12, pts:50.2, line:'13 rec, 269 yds, 3 TD', note:'269 yards — one of the greatest single-game WR performances ever' },
  { player:'Adrian Peterson',     team:'MIN', pos:'RB',  year:2012, week:16, pts:50.1, line:'34 car, 212 yds, 2 TD', note:'2,097 rush yards — came within 9 yards of Dickerson all-time record' },
  { player:'Calvin Johnson',      team:'DET', pos:'WR',  year:2012, week:16, pts:49.3, line:'11 rec, 225 yds, 1 TD', note:'Record 1,964 receiving yards in a season — Megatron at his peak' },
  { player:'Shaun Alexander',     team:'SEA', pos:'RB',  year:2005, week:15, pts:49.8, line:'4 rush TD, 168 rush yds', note:'NFL MVP season — record 28 TDs, won Super Bowl XL' },
  { player:'Randy Moss',          team:'MIN', pos:'WR',  year:1998, week:8,  pts:48.7, line:'5 TD, 190 yds, 8 rec', note:'Rookie record 17 TD season — Vikings went 15-1' },
  { player:'Gale Sayers',         team:'CHI', pos:'RB',  year:1965, week:12, pts:48.0, line:'6 TD — 4 rush, 1 rec, 1 return', note:'6 TDs in mud at Wrigley Field — still one of the most legendary games ever' },
  { player:'Steve Smith Sr.',     team:'CAR', pos:'WR',  year:2005, week:16, pts:47.8, line:'15 rec, 201 yds, 3 TD', note:'Led NFL in yards AND TDs — carried fantasy teams single-handedly' },
  { player:'Clinton Portis',      team:'DEN', pos:'RB',  year:2002, week:14, pts:47.2, line:'5 rush TD, 218 rush yds', note:'Exploded onto the scene as a rookie — 15 TDs in just 15 games' },
  { player:'Antonio Brown',       team:'PIT', pos:'WR',  year:2014, week:16, pts:46.3, line:'16 rec, 189 yds, 2 TD', note:'4 straight 1,000-yard seasons — best WR in football for half a decade' },
  { player:'Larry Johnson',       team:'KC',  pos:'RB',  year:2006, week:15, pts:45.8, line:'4 rush TD, 147 yds', note:'27 TDs in 2006 — briefly threatened LaDainian\'s record pace' },
]

const ALL_TIME_LEADERS = {
  passing: [
    { rank:1,  name:'Tom Brady',           team:'NE/TB',    stat:'89,214',  label:'Career Pass Yards' },
    { rank:2,  name:'Drew Brees',          team:'NO',       stat:'80,358',  label:'Career Pass Yards' },
    { rank:3,  name:'Peyton Manning',      team:'IND/DEN',  stat:'71,940',  label:'Career Pass Yards' },
    { rank:4,  name:'Brett Favre',         team:'GB/MIN',   stat:'71,838',  label:'Career Pass Yards' },
    { rank:5,  name:'Ben Roethlisberger',  team:'PIT',      stat:'64,088',  label:'Career Pass Yards' },
    { rank:6,  name:'Philip Rivers',       team:'SD/LAC',   stat:'63,440',  label:'Career Pass Yards' },
    { rank:7,  name:'Matt Ryan',           team:'ATL',      stat:'62,792',  label:'Career Pass Yards' },
    { rank:8,  name:'Dan Marino',          team:'MIA',      stat:'61,361',  label:'Career Pass Yards' },
    { rank:9,  name:'Eli Manning',         team:'NYG',      stat:'57,023',  label:'Career Pass Yards' },
    { rank:10, name:'John Elway',          team:'DEN',      stat:'51,475',  label:'Career Pass Yards' },
  ],
  rushing: [
    { rank:1,  name:'Emmitt Smith',        team:'DAL/ARI',  stat:'18,355',  label:'Career Rush Yards' },
    { rank:2,  name:'Walter Payton',       team:'CHI',      stat:'16,726',  label:'Career Rush Yards' },
    { rank:3,  name:'Frank Gore',          team:'Multiple', stat:'16,000',  label:'Career Rush Yards' },
    { rank:4,  name:'Barry Sanders',       team:'DET',      stat:'15,269',  label:'Career Rush Yards' },
    { rank:5,  name:'Adrian Peterson',     team:'MIN',      stat:'14,918',  label:'Career Rush Yards' },
    { rank:6,  name:'LaDainian Tomlinson', team:'SD/NYJ',   stat:'13,684',  label:'Career Rush Yards' },
    { rank:7,  name:'Jerome Bettis',       team:'PIT',      stat:'13,662',  label:'Career Rush Yards' },
    { rank:8,  name:'Eric Dickerson',      team:'LARM/IND', stat:'13,259',  label:'Career Rush Yards' },
    { rank:9,  name:'Tony Dorsett',        team:'DAL',      stat:'12,739',  label:'Career Rush Yards' },
    { rank:10, name:'Jim Brown',           team:'CLE',      stat:'12,312',  label:'Career Rush Yards' },
  ],
  receiving: [
    { rank:1,  name:'Jerry Rice',          team:'SF/OAK',   stat:'22,895',  label:'Career Rec Yards' },
    { rank:2,  name:'Larry Fitzgerald',    team:'ARI',      stat:'17,492',  label:'Career Rec Yards' },
    { rank:3,  name:'Terrell Owens',       team:'Multiple', stat:'15,934',  label:'Career Rec Yards' },
    { rank:4,  name:'Randy Moss',          team:'Multiple', stat:'15,292',  label:'Career Rec Yards' },
    { rank:5,  name:'Tony Gonzalez',       team:'KC/ATL',   stat:'15,127',  label:'Career Rec Yards' },
    { rank:6,  name:'Isaac Bruce',         team:'STL',      stat:'15,208',  label:'Career Rec Yards' },
    { rank:7,  name:'Tim Brown',           team:'OAK',      stat:'14,934',  label:'Career Rec Yards' },
    { rank:8,  name:'Steve Smith Sr.',     team:'CAR',      stat:'14,731',  label:'Career Rec Yards' },
    { rank:9,  name:'Marvin Harrison',     team:'IND',      stat:'14,580',  label:'Career Rec Yards' },
    { rank:10, name:'Jason Witten',        team:'DAL',      stat:'13,046',  label:'Career Rec Yards' },
  ],
  touchdowns: [
    { rank:1,  name:'Jerry Rice',          team:'SF/OAK',   stat:'208',     label:'Career TDs' },
    { rank:2,  name:'Emmitt Smith',        team:'DAL',      stat:'175',     label:'Career TDs' },
    { rank:3,  name:'LaDainian Tomlinson', team:'SD',       stat:'162',     label:'Career TDs' },
    { rank:4,  name:'Randy Moss',          team:'Multiple', stat:'156',     label:'Career TDs' },
    { rank:5,  name:'Terrell Owens',       team:'Multiple', stat:'153',     label:'Career TDs' },
    { rank:6,  name:'Marcus Allen',        team:'OAK/KC',   stat:'145',     label:'Career TDs' },
    { rank:7,  name:'Marshall Faulk',      team:'IND/STL',  stat:'136',     label:'Career TDs' },
    { rank:8,  name:'Cris Carter',         team:'MIN',      stat:'130',     label:'Career TDs' },
    { rank:9,  name:'Shaun Alexander',     team:'SEA',      stat:'100',     label:'Career TDs' },
    { rank:10, name:'Jim Brown',           team:'CLE',      stat:'126',     label:'Career TDs' },
  ],
  defense: [
    { rank:1,  name:'Bruce Smith',         team:'BUF/WAS',  stat:'200.0',   label:'Career Sacks' },
    { rank:2,  name:'Reggie White',        team:'PHI/GB',   stat:'198.0',   label:'Career Sacks' },
    { rank:3,  name:'Kevin Greene',        team:'Multiple', stat:'160.0',   label:'Career Sacks' },
    { rank:4,  name:'Julius Peppers',      team:'CAR/CHI',  stat:'159.5',   label:'Career Sacks' },
    { rank:5,  name:'Chris Doleman',       team:'MIN',      stat:'150.5',   label:'Career Sacks' },
    { rank:6,  name:'Michael Strahan',     team:'NYG',      stat:'141.5',   label:'Career Sacks' },
    { rank:7,  name:'Dwight Freeney',      team:'IND',      stat:'125.5',   label:'Career Sacks' },
    { rank:8,  name:'Jason Taylor',        team:'MIA',      stat:'139.5',   label:'Career Sacks' },
    { rank:9,  name:'Osi Umenyiora',       team:'NYG',      stat:'85.0',    label:'Career Sacks' },
    { rank:10, name:'Lawrence Taylor',     team:'NYG',      stat:'132.5',   label:'Career Sacks' },
  ],
  interceptions: [
    { rank:1,  name:'Paul Krause',         team:'WAS/MIN',  stat:'81',      label:'Career INTs' },
    { rank:2,  name:'Emlen Tunnell',       team:'NYG',      stat:'79',      label:'Career INTs' },
    { rank:3,  name:'Rod Woodson',         team:'PIT/SF',   stat:'71',      label:'Career INTs' },
    { rank:4,  name:'Dick "Night Train" Lane',team:'DET',   stat:'68',      label:'Career INTs' },
    { rank:5,  name:'Ken Riley',           team:'CIN',      stat:'65',      label:'Career INTs' },
    { rank:6,  name:'Ronnie Lott',         team:'SF/OAK',   stat:'63',      label:'Career INTs' },
    { rank:7,  name:'Dave Brown',          team:'Multiple', stat:'62',      label:'Career INTs' },
    { rank:8,  name:'Dick LeBeau',         team:'DET',      stat:'62',      label:'Career INTs' },
    { rank:9,  name:'Emmitt Thomas',       team:'KC',       stat:'58',      label:'Career INTs' },
    { rank:10, name:'Mel Blount',          team:'PIT',      stat:'57',      label:'Career INTs' },
  ],
}

// ── HISTORY VIEW ──────────────────────────────────────────────────────────────
function HistoryView() {
  const [tab, setTab] = useState('superbowl')
  const [sbSearch, setSbSearch] = useState('')
  const [statCat, setStatCat] = useState('passing')

  const TABS = [
    { id: 'superbowl', label: '🏆 Super Bowl History' },
    { id: 'fantasyhof', label: '⚡ Fantasy Hall of Fame' },
    { id: 'alltime', label: '📊 All-Time Leaders' },
  ]

  const filteredSBs = SUPER_BOWLS.filter(sb =>
    !sbSearch ||
    sb.winner.toLowerCase().includes(sbSearch.toLowerCase()) ||
    sb.loser.toLowerCase().includes(sbSearch.toLowerCase()) ||
    sb.mvp.toLowerCase().includes(sbSearch.toLowerCase()) ||
    String(sb.year).includes(sbSearch)
  )

  return (
    <div>
      <div className="section-bar">
        <h2>NFL History</h2>
        <div className="sb-rule" />
        <span className="sb-ct">Super Bowls · Fantasy HOF · All-Time Leaders</span>
      </div>

      {/* Sub-tabs */}
      <div className="hist-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`htab ${tab === t.id ? 'on' : ''}`}
            onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* SUPER BOWL HISTORY */}
      {tab === 'superbowl' && (
        <div>
          <div className="hist-search-bar">
            <input
              className="hist-search"
              placeholder="Search by team, year, or MVP…"
              value={sbSearch}
              onChange={e => setSbSearch(e.target.value)}
            />
            <span className="hist-count">{filteredSBs.length} of {SUPER_BOWLS.length} games</span>
          </div>
          <table className="sb-table">
            <thead>
              <tr>
                <th>SB</th>
                <th>Year</th>
                <th className="sbt-winner">Champion</th>
                <th className="sbt-loser">Runner-Up</th>
                <th>Score</th>
                <th className="sbt-mvp">MVP</th>
                <th className="sbt-site">Site</th>
              </tr>
            </thead>
            <tbody>
              {filteredSBs.map((sb, i) => (
                <tr key={i} className={i === 0 ? 'sb-latest' : ''}>
                  <td className="sb-num">
                    <a href={`https://www.google.com/search?q=Super+Bowl+${sb.num}+${sb.year}`} target="_blank" rel="noopener" className="sb-google-link">{sb.num}</a>
                  </td>
                  <td className="sb-year">{sb.year}</td>
                  <td className="sbt-winner sb-winner">{sb.winner}</td>
                  <td className="sbt-loser sb-loser">{sb.loser}</td>
                  <td className="sb-score">{sb.score}</td>
                  <td className="sbt-mvp sb-mvp">
                    <a href={`https://www.google.com/search?q=${encodeURIComponent(sb.mvp)}+Super+Bowl+MVP+${sb.year}`} target="_blank" rel="noopener" className="sb-google-link">{sb.mvp}</a>
                  </td>
                  <td className="sbt-site sb-site">{sb.site}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* FANTASY HOF */}
      {tab === 'fantasyhof' && (
        <div>
          <div className="hof-intro">
            <span className="hof-intro-text">
              The greatest single-game and single-season fantasy performances in NFL history.
              Compiled across Standard and PPR formats.
            </span>
          </div>
          <div className="hof-grid">
            {FANTASY_HOF.map((p, i) => (
              <a key={i} href={`https://www.google.com/search?q=${encodeURIComponent(p.player+' '+p.year+' fantasy football '+p.pos)}`} target="_blank" rel="noopener" className={`hof-card ${i < 3 ? 'hof-elite' : ''}`} style={{textDecoration:'none',color:'inherit'}}>
                <div className="hof-rank">#{i + 1}</div>
                <div className="hof-player">{p.player}</div>
                <div className="hof-meta">
                  <span className="hof-team">{p.team}</span>
                  <span className="hof-pos">{p.pos}</span>
                  <span className="hof-year">{p.year} · Wk {p.week}</span>
                </div>
                <div className="hof-pts">{p.pts} <span>pts</span></div>
                <div className="hof-line">{p.line}</div>
                <div className="hof-note">{p.note}</div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ALL-TIME LEADERS */}
      {tab === 'alltime' && (
        <div>
          <div className="atl-cats">
            {Object.keys(ALL_TIME_LEADERS).map(cat => (
              <button key={cat} className={`atl-cat ${statCat === cat ? 'on' : ''}`}
                onClick={() => setStatCat(cat)}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
          <table className="atl-table">
            <thead>
              <tr>
                <th>#</th>
                <th className="atl-name">Player</th>
                <th>Teams</th>
                <th>{ALL_TIME_LEADERS[statCat][0]?.label}</th>
              </tr>
            </thead>
            <tbody>
              {ALL_TIME_LEADERS[statCat].map((p, i) => (
                <tr key={i} className={i === 0 ? 'atl-top' : ''}>
                  <td className="atl-rank">{p.rank}</td>
                  <td className="atl-name">
                    <a href={`https://www.google.com/search?q=${encodeURIComponent(p.name+' NFL career stats')}`} target="_blank" rel="noopener" className="sb-google-link">{p.name}</a>
                  </td>
                  <td className="atl-team">{p.team}</td>
                  <td className="atl-stat">{p.stat}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="atl-note">Stats current through 2025 season. Active players may have updated totals.</div>
        </div>
      )}
    </div>
  )
}

// ── TV GUIDE VIEW ─────────────────────────────────────────────────────────────
const STREAMING_SERVICES = [
  {
    name: 'Peacock',
    url: 'https://www.peacocktv.com',
    networks: ['NBC', 'NBC/Peacock', 'NBC/SNF'],
    description: 'Sunday Night Football · Kickoff Game · Playoffs',
    color: '#000000',
    textColor: '#ffffff',
    price: '$7.99/mo',
    games: 'SNF + Peacock exclusives',
  },
  {
    name: 'ESPN / ABC',
    url: 'https://www.espn.com/watch',
    networks: ['ESPN', 'ESPN/MNF', 'ABC'],
    description: 'Monday Night Football · Playoffs',
    color: '#CC0000',
    textColor: '#ffffff',
    price: 'ESPN+ $10.99/mo',
    games: 'MNF · 2 Wild Card games',
  },
  {
    name: 'Prime Video',
    url: `https://www.amazon.com/primevideo?tag=nysportsdaily-20`,
    networks: ['Amazon/TNF', 'Amazon'],
    description: 'Thursday Night Football exclusively on Prime',
    color: '#00A8E0',
    textColor: '#ffffff',
    price: '$14.99/mo (Prime)',
    games: 'TNF all season',
    amazon: true,
  },
  {
    name: 'Netflix',
    url: 'https://www.netflix.com',
    networks: ['Netflix'],
    description: 'International games · Christmas Day · Week 18',
    color: '#E50914',
    textColor: '#ffffff',
    price: '$15.49/mo',
    games: 'International Series · Christmas',
  },
  {
    name: 'Paramount+',
    url: 'https://www.paramountplus.com',
    networks: ['CBS'],
    description: 'CBS Sunday afternoon games · AFC coverage',
    color: '#0064FF',
    textColor: '#ffffff',
    price: '$5.99/mo',
    games: 'AFC games · Super Bowl (alternate years)',
  },
  {
    name: 'Fox Sports',
    url: 'https://www.foxsports.com',
    networks: ['Fox'],
    description: 'Fox Sunday afternoon games · NFC coverage',
    color: '#003087',
    textColor: '#ffffff',
    price: 'Free with cable / Fubo',
    games: 'NFC games · Super Bowl (alternate years)',
  },
  {
    name: 'NFL+',
    url: 'https://www.nfl.com/plus',
    networks: ['NFL Network', 'NFL+'],
    description: 'Live local & primetime games on mobile',
    color: '#013369',
    textColor: '#ffffff',
    price: '$6.99/mo',
    games: 'Local games on mobile · NFL Network',
  },
  {
    name: 'YouTube TV',
    url: 'https://tv.youtube.com',
    networks: [],
    description: 'All broadcast channels + NFL Sunday Ticket',
    color: '#FF0000',
    textColor: '#ffffff',
    price: '$72.99/mo',
    games: 'NFL Sunday Ticket add-on available',
  },
  {
    name: 'NFL Sunday Ticket',
    url: 'https://nflsundayticket.com',
    networks: [],
    description: 'Every out-of-market Sunday afternoon game',
    color: '#013369',
    textColor: '#ffffff',
    price: '$249-$449/season',
    games: 'All out-of-market Sunday games',
  },
  {
    name: 'Fubo',
    url: 'https://www.fubo.tv',
    networks: [],
    description: 'Sports-focused streaming with all NFL channels',
    color: '#E8000D',
    textColor: '#ffffff',
    price: '$79.99/mo',
    games: 'CBS · NBC · Fox · ESPN + NFL Network',
  },
  {
    name: 'Hulu Live TV',
    url: 'https://www.hulu.com/live-tv',
    networks: [],
    description: 'Live TV + on-demand bundle',
    color: '#1CE783',
    textColor: '#000000',
    price: '$82.99/mo',
    games: 'CBS · NBC · Fox · ESPN',
  },
  {
    name: 'DirecTV Stream',
    url: 'https://www.directv.com/stream',
    networks: [],
    description: 'Cable replacement with NFL Network',
    color: '#00A8E0',
    textColor: '#ffffff',
    price: '$79.99/mo',
    games: 'All channels + NFL Network + RedZone',
  },
]

function TVGuideView({ currentWeek }) {
  const [weekFilter, setWeekFilter] = useState(currentWeek || 1)
  const seasonStarted = new Date() >= new Date('2026-09-09T00:00:00-04:00')

  // Get games for selected week with network info
  const weekGames = SCHEDULE_2026.filter(g => g.week === weekFilter)
  const byNetwork = {}
  weekGames.forEach(g => {
    const net = g.network || 'TBD'
    if (!byNetwork[net]) byNetwork[net] = []
    byNetwork[net].push(g)
  })

  // Network display order
  const netOrder = ['NBC/Peacock', 'ESPN/MNF', 'Amazon/TNF', 'Netflix', 'CBS', 'Fox', 'NBC/SNF', 'NFL Network', 'TBD']

  return (
    <div>
      <div className="section-bar">
        <h2>TV Guide</h2>
        <div className="sb-rule" />
        <span className="sb-ct">Where to Watch · Streaming Guide · 2026 Season</span>
      </div>

      {/* Streaming services grid */}
      <div className="tvg-services-wrap">
        <div className="tvg-services-header">
          <span>📺 Where to Stream NFL Games in 2026</span>
        </div>
        <div className="tvg-services-grid">
          {STREAMING_SERVICES.map((s, i) => (
            <a key={i} href={s.url} target="_blank" rel="noopener" className="tvg-service-card">
              <div className="tvg-svc-badge" style={{ background: s.color, color: s.textColor }}>
                {s.name}
                {s.amazon && <span className="tvg-amazon-tag">★ Supports Site</span>}
              </div>
              <div className="tvg-svc-body">
                <div className="tvg-svc-games">{s.games}</div>
                <div className="tvg-svc-desc">{s.description}</div>
                <div className="tvg-svc-price">{s.price}</div>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Week selector */}
      <div className="tvg-week-wrap">
        <div className="tvg-week-header">
          <span>📅 Week-by-Week TV Schedule</span>
        </div>
        <div className="week-selector" style={{borderBottom:'none'}}>
          <div className="week-label-row">
            <span className="ws-label">Week</span>
            <div className="ws-pills">
              {ALL_WEEKS.map(w => (
                <button key={w} className={`ws-btn ${weekFilter === w ? 'on' : ''}`}
                  onClick={() => setWeekFilter(w)}>{w}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Games grouped by network */}
        <div className="tvg-games-wrap">
          {netOrder.filter(net => byNetwork[net]).map(net => {
            const games = byNetwork[net]
            const netColor = networkColor(net)
            const netLink = NETWORK_LINKS[net] || null
            return (
              <div key={net} className="tvg-net-block">
                <div className="tvg-net-header">
                  {netLink ? (
                    <a href={netLink} target="_blank" rel="noopener" className="tvg-net-badge" style={{ background: netColor.bg, color: netColor.text }}>
                      {net.replace('/SNF','').replace('/MNF','').replace('/TNF','')} ↗
                    </a>
                  ) : (
                    <span className="tvg-net-badge" style={{ background: netColor.bg, color: netColor.text }}>
                      {net}
                    </span>
                  )}
                  <span className="tvg-net-count">{games.length} game{games.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="tvg-games-list">
                  {games.map((g, i) => (
                    <div key={i} className="tvg-game">
                      <span className="tvg-time">{g.time !== 'TBD' ? g.time : g.day}</span>
                      <span className="tvg-matchup">
                        <a href={ti(g.away).url} target="_blank" rel="noopener" className="tvg-team-link">{g.away}</a>
                        <span className="tvg-at"> at </span>
                        <a href={ti(g.home).url} target="_blank" rel="noopener" className="tvg-team-link">{g.home}</a>
                      </span>
                      <span className="tvg-teams-full">
                        {ti(g.away).city} {ti(g.away).nick} at {ti(g.home).city} {ti(g.home).nick}
                      </span>
                      {g.intl && <span className="tvg-intl">🌍 {g.intlCity}</span>}
                      {g.note && <span className="tvg-note">{g.note}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Any networks not in the order list */}
          {Object.keys(byNetwork).filter(n => !netOrder.includes(n)).map(net => {
            const games = byNetwork[net]
            const netColor = networkColor(net)
            return (
              <div key={net} className="tvg-net-block">
                <div className="tvg-net-header">
                  <span className="tvg-net-badge" style={{ background: netColor.bg, color: netColor.text }}>{net}</span>
                  <span className="tvg-net-count">{games.length} game{games.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="tvg-games-list">
                  {games.map((g, i) => (
                    <div key={i} className="tvg-game">
                      <span className="tvg-time">{g.time !== 'TBD' ? g.time : g.day}</span>
                      <span className="tvg-matchup">
                        <a href={ti(g.away).url} target="_blank" rel="noopener" className="tvg-team-link">{g.away}</a>
                        <span className="tvg-at"> at </span>
                        <a href={ti(g.home).url} target="_blank" rel="noopener" className="tvg-team-link">{g.home}</a>
                      </span>
                      {g.note && <span className="tvg-note">{g.note}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── WEATHER HOOK ──────────────────────────────────────────────────────────────
const STADIUM_CITIES = {
  ARI:'Glendale,AZ', ATL:'Atlanta,GA', BAL:'Baltimore,MD', BUF:'Orchard Park,NY',
  CAR:'Charlotte,NC', CHI:'Chicago,IL', CIN:'Cincinnati,OH', CLE:'Cleveland,OH',
  DAL:'Arlington,TX', DEN:'Denver,CO', DET:'Detroit,MI', GB:'Green Bay,WI',
  HOU:'Houston,TX', IND:'Indianapolis,IN', JAC:'Jacksonville,FL', KC:'Kansas City,MO',
  LA:'Inglewood,CA', LAC:'Inglewood,CA', LV:'Las Vegas,NV', MIA:'Miami Gardens,FL',
  MIN:'Minneapolis,MN', NE:'Foxborough,MA', NO:'New Orleans,LA', NYG:'East Rutherford,NJ',
  NYJ:'East Rutherford,NJ', PHI:'Philadelphia,PA', PIT:'Pittsburgh,PA', SEA:'Seattle,WA',
  SF:'Santa Clara,CA', TB:'Tampa,FL', TEN:'Nashville,TN', WAS:'Landover,MD',
}

// Outdoor stadiums only (indoor = weather irrelevant)
const OUTDOOR_STADIUMS = ['BUF','CHI','CLE','DAL','DEN','GB','KC','LV','MIA','NE','NYG','NYJ','PHI','PIT','SEA','SF','TEN','WAS','BAL','CIN','JAC','NO','CAR']

function useWeather(city) {
  const [weather, setWeather] = useState(null)
  useEffect(() => {
    if (!city) return
    // Using open-meteo — completely free, no API key needed
    const CITY_COORDS = {
      'Glendale,AZ':{lat:33.53,lon:-112.26}, 'Atlanta,GA':{lat:33.76,lon:-84.40},
      'Baltimore,MD':{lat:39.28,lon:-76.62}, 'Orchard Park,NY':{lat:42.77,lon:-78.79},
      'Charlotte,NC':{lat:35.22,lon:-80.84}, 'Chicago,IL':{lat:41.86,lon:-87.62},
      'Cincinnati,OH':{lat:39.10,lon:-84.52}, 'Cleveland,OH':{lat:41.50,lon:-81.70},
      'Arlington,TX':{lat:32.75,lon:-97.09}, 'Denver,CO':{lat:39.74,lon:-105.02},
      'Detroit,MI':{lat:42.34,lon:-83.05}, 'Green Bay,WI':{lat:44.50,lon:-88.06},
      'Houston,TX':{lat:29.76,lon:-95.37}, 'Indianapolis,IN':{lat:39.76,lon:-86.16},
      'Jacksonville,FL':{lat:30.32,lon:-81.64}, 'Kansas City,MO':{lat:39.05,lon:-94.48},
      'Inglewood,CA':{lat:33.95,lon:-118.34}, 'Las Vegas,NV':{lat:36.09,lon:-115.18},
      'Miami Gardens,FL':{lat:25.96,lon:-80.24}, 'Minneapolis,MN':{lat:44.97,lon:-93.26},
      'Foxborough,MA':{lat:42.09,lon:-71.26}, 'New Orleans,LA':{lat:29.95,lon:-90.08},
      'East Rutherford,NJ':{lat:40.81,lon:-74.07}, 'Philadelphia,PA':{lat:39.90,lon:-75.17},
      'Pittsburgh,PA':{lat:40.44,lon:-80.01}, 'Seattle,WA':{lat:47.59,lon:-122.33},
      'Santa Clara,CA':{lat:37.40,lon:-121.97}, 'Tampa,FL':{lat:27.98,lon:-82.50},
      'Nashville,TN':{lat:36.17,lon:-86.77}, 'Landover,MD':{lat:38.91,lon:-76.86},
    }
    const coords = CITY_COORDS[city]
    if (!coords) return
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,precipitation,wind_speed_10m,weather_code&wind_speed_unit=mph&temperature_unit=fahrenheit&forecast_days=1`)
      .then(r => r.json())
      .then(data => {
        const c = data.current
        if (!c) return
        const code = c.weather_code
        const icon = code <= 1 ? '☀️' : code <= 3 ? '⛅' : code <= 48 ? '🌫️' : code <= 67 ? '🌧️' : code <= 77 ? '❄️' : code <= 82 ? '🌦️' : '⛈️'
        setWeather({
          temp: Math.round(c.temperature_2m),
          wind: Math.round(c.wind_speed_10m),
          rain: c.precipitation > 0,
          icon,
          fantasy: c.wind_speed_10m > 20 ? '⚠️ High wind — avoid pass catchers' :
                   c.precipitation > 0.1 ? '🌧️ Rain game — favor RBs' :
                   c.temperature_2m < 25 ? '🥶 Extreme cold — expect run game' : null,
        })
      })
      .catch(() => {})
  }, [city])
  return weather
}

// ── 2026 NFL DRAFT DATA ───────────────────────────────────────────────────────
const DRAFT_2026 = [
  // ── ROUND 1 ──────────────────────────────────────────────────────────────
  { pick:1,  round:1, team:'LV',  player:'Fernando Mendoza',  pos:'QB',   college:'Indiana',       note:'No. 1 overall — strong arm, poised pocket passer. Raiders bet on him as franchise QB.',      fantasyGrade:'A',  fantasyNote:'If he starts Week 1, top-8 fantasy QB upside. Watch training camp depth chart closely.' },
  { pick:2,  round:1, team:'NYJ', player:'David Bailey',      pos:'EDGE', college:'Texas Tech',    note:'Elite pass rusher — explosive off the edge, motor never stops.',                             fantasyGrade:'C',  fantasyNote:'IDP leagues only. No fantasy value in standard formats.' },
  { pick:3,  round:1, team:'ARI', player:'Jeremiyah Love',    pos:'RB',   college:'Notre Dame',    note:'Highest-drafted RB since Saquon Barkley. Explosive, versatile, elite pass catcher.',        fantasyGrade:'A+', fantasyNote:'Immediate RB1 candidate. Arizona will feed him touches. Top-5 fantasy RB if healthy.' },
  { pick:4,  round:1, team:'TEN', player:'Carnell Tate',      pos:'WR',   college:'Ohio State',    note:'Surprise pick — smooth route runner, elite hands. Titans went WR over QB.',                  fantasyGrade:'A-', fantasyNote:'WR1 upside if Tennessee\'s QB situation solidifies. Top-20 WR with upside.' },
  { pick:5,  round:1, team:'NYG', player:'Arvell Reese',      pos:'LB',   college:'Ohio State',    note:'Athletic LB — elite coverage ability, instincts. Part of Buckeyes\' dominant defense.',     fantasyGrade:'C',  fantasyNote:'IDP leagues only.' },
  { pick:6,  round:1, team:'KC',  player:'Mansoor Delane',    pos:'CB',   college:'LSU',           note:'(via CLE) — Ball-hawk corner, elite athleticism. Chiefs trade up for defensive help.',      fantasyGrade:'C',  fantasyNote:'IDP only.' },
  { pick:7,  round:1, team:'WAS', player:'Sonny Styles',      pos:'LB',   college:'Ohio State',    note:'Four Ohio State players top 11 — Styles is a do-it-all defender with elite range.',          fantasyGrade:'C',  fantasyNote:'IDP only.' },
  { pick:8,  round:1, team:'NO',  player:'Jordyn Tyson',      pos:'WR',   college:'Arizona State', note:'Electric playmaker — yards after catch specialist. Saints need a weapon.',                   fantasyGrade:'B+', fantasyNote:'WR2/3 with upside. Saints throw it around. Monitor training camp.' },
  { pick:9,  round:1, team:'CLE', player:'Spencer Fano',      pos:'OT',   college:'Utah',          note:'(via KC) — First of NINE OL taken in Round 1. Protects the blind side.',                   fantasyGrade:'C',  fantasyNote:'Helps Deshaun Watson / whoever starts. OL picks boost skill players around them.' },
  { pick:10, round:1, team:'NYG', player:'Francis Mauigoa',   pos:'OT',   college:'Miami',         note:'(via CIN) — Giants grab two picks, two needs. Athletic OT with versatility.',               fantasyGrade:'C',  fantasyNote:'Helps protect the QB and opens holes for Giants RBs.' },
  { pick:11, round:1, team:'DAL', player:'Caleb Downs',       pos:'S',    college:'Ohio State',    note:'(via MIA) — Ball hawk safety. 4th Ohio State player in top 11 picks.',                     fantasyGrade:'C',  fantasyNote:'IDP only.' },
  { pick:12, round:1, team:'MIA', player:'Kadyn Proctor',     pos:'OT',   college:'Alabama',       note:'(via DAL) — Tua needs protection. Elite length, strong hands.',                             fantasyGrade:'C',  fantasyNote:'Helps Tua, Tyreek Hill and the Dolphins offense overall.' },
  { pick:13, round:1, team:'LA',  player:'Ty Simpson',        pos:'QB',   college:'Alabama',       note:'(via ATL) — Surprise QB pick by the Rams. Developmental behind whoever starts.',            fantasyGrade:'C',  fantasyNote:'Long-term project. Not a 2026 fantasy factor.' },
  { pick:14, round:1, team:'BAL', player:'Olaivavega Ioane',  pos:'G',    college:'Penn State',    note:'Dominant interior guard — physical mauler. Fits Ravens\' power run scheme.',               fantasyGrade:'C',  fantasyNote:'Helps Lamar Jackson and the Ravens running game.' },
  { pick:15, round:1, team:'TB',  player:'Rueben Bain Jr.',   pos:'EDGE', college:'Miami',         note:'Top edge rusher in class. Miami product brings elite pass rush to Tampa Bay.',             fantasyGrade:'C',  fantasyNote:'IDP leagues only.' },
  { pick:16, round:1, team:'NYJ', player:'Kenyon Sadiq',      pos:'TE',   college:'Oregon',        note:'(via IND) — Jets get their TE of the future. Athletic, reliable pass catcher.',            fantasyGrade:'B+', fantasyNote:'TE2 with upside. NYJ needs weapons around their QB.' },
  { pick:17, round:1, team:'DET', player:'Blake Miller',      pos:'OT',   college:'Clemson',       note:'Athletic tackle — Lions continue building the best OL in football.',                        fantasyGrade:'C',  fantasyNote:'Helps Jahmyr Gibbs and David Montgomery continue their dominance.' },
  { pick:18, round:1, team:'MIN', player:'Caleb Banks',       pos:'DT',   college:'Florida',       note:'Disruptive interior — Vikings add to their defensive front.',                               fantasyGrade:'C',  fantasyNote:'IDP only.' },
  { pick:19, round:1, team:'CAR', player:'Monroe Freeling',   pos:'OT',   college:'Georgia',       note:'Panthers continue OL rebuild. Protecting their young QB is priority.',                      fantasyGrade:'C',  fantasyNote:'Helps Panthers skill players long term.' },
  { pick:20, round:1, team:'PHI', player:'Makai Lemon',       pos:'WR',   college:'USC',           note:'(via DAL/GB) — Eagles add explosiveness at WR. Speed merchant, big play ability.',         fantasyGrade:'B+', fantasyNote:'WR3 in a talented Eagles offense. Touchdown upside in red zone.' },
  { pick:21, round:1, team:'PIT', player:'Max Iheanachor',    pos:'OT',   college:'Arizona State', note:'9 OL in Round 1 — Steelers protect whoever wins the QB battle.',                           fantasyGrade:'C',  fantasyNote:'Helps Steelers ground game.' },
  { pick:22, round:1, team:'LAC', player:'Akheem Mesidor',    pos:'EDGE', college:'Miami',         note:'Explosive edge rusher — pairs with Joey Bosa to form elite pass rush duo.',               fantasyGrade:'C',  fantasyNote:'IDP only.' },
  { pick:23, round:1, team:'DAL', player:'Malachi Lawrence',  pos:'EDGE', college:'UCF',           note:'Cowboys add pass rush depth. Versatile speed rusher.',                                      fantasyGrade:'C',  fantasyNote:'IDP only.' },
  { pick:24, round:1, team:'CLE', player:'KC Concepcion',     pos:'WR',   college:'Texas A&M',     note:'(via JAX) — Browns grab a weapon. Concepcion is a yards-after-catch machine.',            fantasyGrade:'B',  fantasyNote:'WR3 upside — depends heavily on QB situation in Cleveland.' },
  { pick:25, round:1, team:'CHI', player:'Dillon Thieneman',  pos:'S',    college:'Oregon',        note:'Ball-hawk safety — led nation in INTs. Bears add defensive playmaker.',                    fantasyGrade:'C',  fantasyNote:'IDP only.' },
  { pick:26, round:1, team:'HOU', player:'Keylan Rutledge',   pos:'G',    college:'Georgia Tech',  note:'(via BUF) — Texans protect C.J. Stroud. Physical interior guard.',                        fantasyGrade:'C',  fantasyNote:'Helps Stroud, Tank Dell and Stefon Diggs.' },
  { pick:27, round:1, team:'MIA', player:'Chris Johnson',     pos:'CB',   college:'San Diego State',note:'(via SF) — Dolphins grab a corner. Athletic, physical in coverage.',                     fantasyGrade:'C',  fantasyNote:'IDP only.' },
  { pick:28, round:1, team:'NE',  player:'Caleb Lomu',        pos:'OT',   college:'Utah',          note:'(via BUF/HOU) — 9th OL in Round 1. Patriots rebuild their line.',                        fantasyGrade:'C',  fantasyNote:'Helps Drake Maye develop behind solid protection.' },
  { pick:29, round:1, team:'KC',  player:'Peter Woods',       pos:'DT',   college:'Clemson',       note:'(via LAR) — Chiefs\' second first-round pick. Disruptive interior rusher.',               fantasyGrade:'C',  fantasyNote:'IDP only.' },
  { pick:30, round:1, team:'NYJ', player:'Omar Cooper Jr.',   pos:'WR',   college:'Indiana',       note:'Jets\' second Round 1 pick — gives their new QB a weapon to throw to.',                   fantasyGrade:'B+', fantasyNote:'WR2/3 upside — huge if paired with a capable QB in NY.' },
  { pick:31, round:1, team:'TEN', player:'Keldric Faulk',     pos:'EDGE', college:'Auburn',        note:'Titans\' second Round 1 — athletic pass rusher to complement their WR pick.',             fantasyGrade:'C',  fantasyNote:'IDP only.' },
  { pick:32, round:1, team:'SEA', player:'Jadarian Price',    pos:'RB',   college:'Notre Dame',    note:'Seahawks grab the second Notre Dame RB. Complements Kenneth Walker III.',                  fantasyGrade:'B-', fantasyNote:'Backup role in 2026 behind Walker. Handcuff/watch list only.' },

  // ── ROUND 2 ──────────────────────────────────────────────────────────────
  { pick:33, round:2, team:'MIA', player:'Denzel Boston',      pos:'WR',   college:'Washington',    note:'Athletic WR — yards after catch ability. Joins crowded Miami receiving corps.',          fantasyGrade:'C+', fantasyNote:'WR4 in Miami. Deep league flier only.' },
  { pick:34, round:2, team:'ARI', player:'TBD',                pos:'—',    college:'—',             note:'Cardinals second-round pick.',                                                           fantasyGrade:'C',  fantasyNote:'Monitor after selection.' },
  { pick:35, round:2, team:'TEN', player:'T.J. Parker',        pos:'EDGE', college:'Clemson',       note:'Pass rusher adds to Tennessee defensive rebuild.',                                       fantasyGrade:'C',  fantasyNote:'IDP only.' },
  { pick:36, round:2, team:'LV',  player:'TBD',                pos:'—',    college:'—',             note:'Raiders second-round pick.',                                                             fantasyGrade:'C',  fantasyNote:'Monitor after selection.' },
  { pick:37, round:2, team:'NYG', player:'TBD',                pos:'—',    college:'—',             note:'Giants second-round pick.',                                                              fantasyGrade:'C',  fantasyNote:'Monitor after selection.' },
  { pick:38, round:2, team:'HOU', player:'Kayden McDonald',    pos:'OT',   college:'Georgia',       note:'Emotional pick — waited through Round 1. Protects C.J. Stroud.',                       fantasyGrade:'C',  fantasyNote:'Helps Texans skill players.' },
  { pick:39, round:2, team:'CLE', player:'Denzel Boston',      pos:'WR',   college:'Washington',    note:'Second Browns pick — adds receiving talent.',                                            fantasyGrade:'C+', fantasyNote:'Dependent on Browns QB situation.' },
  { pick:40, round:2, team:'KC',  player:'TBD',                pos:'—',    college:'—',             note:'Chiefs second-round pick.',                                                              fantasyGrade:'C',  fantasyNote:'Monitor.' },
  { pick:41, round:2, team:'CIN', player:'TBD',                pos:'—',    college:'—',             note:'Bengals second-round pick.',                                                             fantasyGrade:'C',  fantasyNote:'Monitor.' },
  { pick:42, round:2, team:'NO',  player:'TBD',                pos:'—',    college:'—',             note:'Saints second-round pick.',                                                              fantasyGrade:'C',  fantasyNote:'Monitor.' },
  { pick:43, round:2, team:'NYG', player:'Malachi Fields',     pos:'WR',   college:'Notre Dame',    note:'Giants grab another WR to give their QB options.',                                      fantasyGrade:'B-', fantasyNote:'WR3/4 — may develop into starter.' },
  { pick:44, round:2, team:'WAS', player:'Antonio Williams',   pos:'WR',   college:'Clemson',       note:'Speed receiver adds another weapon to Washington\'s offense.',                          fantasyGrade:'B-', fantasyNote:'WR3 with upside in Washington.' },
  { pick:47, round:2, team:'PIT', player:'Germie Bernard',     pos:'WR',   college:'Alabama',       note:'Steelers traded up for him after missing Lemon. Speed receiver.',                       fantasyGrade:'B-', fantasyNote:'WR3 — watch training camp for role clarity.' },
  { pick:56, round:2, team:'JAC', player:'Nate Boerkircher',   pos:'TE',   college:'Texas A&M',     note:'Blocking TE — controversial pick at 56. Reaches in the eyes of many.',                 fantasyGrade:'D',  fantasyNote:'Blocking TE — fantasy irrelevant.' },
  { pick:60, round:2, team:'TB',  player:'Anthony Hill Jr.',   pos:'LB',   college:'Texas',         note:'31.5 TFLs, 17 sacks, 8 forced fumbles in college. Elite LB.',                          fantasyGrade:'C',  fantasyNote:'IDP leagues only.' },

  // ── ROUND 3 ──────────────────────────────────────────────────────────────
  { pick:65, round:3, team:'ARI', player:'Carson Beck',        pos:'QB',   college:'Miami',         note:'Cardinals backup QB insurance. Former Georgia starter.',                                fantasyGrade:'C',  fantasyNote:'Backup QB — not a 2026 factor.' },
  { pick:66, round:3, team:'DEN', player:'Tyler Onyedim',      pos:'DT',   college:'Texas A&M',     note:'Interior presence for Broncos defense.',                                                fantasyGrade:'C',  fantasyNote:'IDP only.' },
  { pick:67, round:3, team:'LV',  player:'Keyron Crawford',    pos:'EDGE', college:'Auburn',        note:'Pass rush depth for Raiders.',                                                           fantasyGrade:'C',  fantasyNote:'IDP only.' },
  { pick:68, round:3, team:'PHI', player:'Markel Bell',        pos:'OT',   college:'Miami',         note:'Eagles continue OL depth building.',                                                     fantasyGrade:'C',  fantasyNote:'Helps Eagles skill players.' },
  { pick:69, round:3, team:'CHI', player:'Sam Roush',          pos:'TE',   college:'Stanford',      note:'Bears add a receiving TE to Caleb Williams\' arsenal.',                                fantasyGrade:'B-', fantasyNote:'TE2/3 — watch for role in Chicago.' },
  { pick:70, round:3, team:'SF',  player:'Romello Height',     pos:'EDGE', college:'Texas Tech',    note:'Pass rush depth for 49ers.',                                                             fantasyGrade:'C',  fantasyNote:'IDP only.' },
  { pick:71, round:3, team:'WAS', player:'Antonio Williams',   pos:'WR',   college:'Clemson',       note:'Second WR for Washington — speed threat.',                                              fantasyGrade:'B-', fantasyNote:'Deep league flier.' },
  { pick:72, round:3, team:'CIN', player:'Tacario Davis',      pos:'CB',   college:'Washington',    note:'Corner adds depth to Bengals secondary.',                                               fantasyGrade:'C',  fantasyNote:'IDP only.' },
  { pick:73, round:3, team:'NO',  player:'Oscar Delp',         pos:'TE',   college:'Georgia',       note:'Receiving TE adds a weapon for Saints offense.',                                        fantasyGrade:'B-', fantasyNote:'TE2 with some upside if Tyson emerges.' },
  { pick:74, round:3, team:'NYG', player:'Malachi Fields',     pos:'WR',   college:'Notre Dame',    note:'Giants third pick — WR depth.',                                                         fantasyGrade:'C+', fantasyNote:'Monitor training camp.' },
  { pick:75, round:3, team:'MIA', player:'Caleb Douglas',      pos:'WR',   college:'Texas Tech',    note:'Speed receiver adds to already crowded Miami WR room.',                                 fantasyGrade:'C',  fantasyNote:'Very crowded — minimal fantasy value.' },
  { pick:76, round:3, team:'PIT', player:'Drew Allar',         pos:'QB',   college:'Penn State',    note:'Steelers QB insurance/future. Penn State product.',                                     fantasyGrade:'C+', fantasyNote:'Not a 2026 factor but watch long-term.' },
  { pick:77, round:3, team:'GB',  player:'Chris McClellan',    pos:'DT',   college:'Missouri',      note:'Interior pass rusher adds to Packers D.',                                               fantasyGrade:'C',  fantasyNote:'IDP only.' },
  { pick:78, round:3, team:'IND', player:'A.J. Haulcy',        pos:'S',    college:'LSU',           note:'Safety adds defensive depth for Colts.',                                                fantasyGrade:'C',  fantasyNote:'IDP only.' },
  { pick:79,  round:3, team:'ATL', player:'Zachariah Branch',   pos:'WR',   college:'Georgia',       note:'Falcons drafted A.J. Terrell\'s brother — family reunion in Atlanta.',                fantasyGrade:'B-', fantasyNote:'Slot WR with return value. Watch for role.' },

  // ── ROUND 4 ──────────────────────────────────────────────────────────────
  { pick:102, round:4, team:'JAC', player:'Jude Bowry',          pos:'OT',   college:'Boston College', note:'OT depth for Jaguars.',                                                                fantasyGrade:'C',  fantasyNote:'OL depth — not fantasy relevant.' },
  { pick:103, round:4, team:'CLE', player:'Darrell Jackson Jr.', pos:'DL',   college:'Florida State',  note:'Defensive line depth for Browns.',                                                     fantasyGrade:'C',  fantasyNote:'IDP only.' },
  { pick:112, round:4, team:'NO',  player:'Bryce Lance',         pos:'WR',   college:'TBD',            note:'Saints drafted Trey Lance\'s brother — feel-good story.',                            fantasyGrade:'C',  fantasyNote:'Depth WR — deep league flier only.' },
  { pick:119, round:4, team:'CLE', player:'Wesley Williams',     pos:'EDGE', college:'Duke',           note:'Pass rush depth for Browns rebuild.',                                                   fantasyGrade:'C',  fantasyNote:'IDP only.' },

  // ── ROUND 5 ──────────────────────────────────────────────────────────────
  { pick:142, round:5, team:'TEN', player:'Nicholas Singleton',  pos:'RB',   college:'Penn State',     note:'Handcuff RB for Tennessee — Carnell Tate draft means run game needs work.',           fantasyGrade:'C+', fantasyNote:'Handcuff to Titans starter. Monitor depth chart.' },
  { pick:156, round:5, team:'IND', player:'George Gumbs Jr.',    pos:'EDGE', college:'Florida',        note:'Pass rush depth for Colts.',                                                           fantasyGrade:'C',  fantasyNote:'IDP only.' },
  { pick:163, round:5, team:'MIN', player:'Charles Demmings',    pos:'CB',   college:'Stephen F. Austin',note:'CB depth for Vikings.',                                                              fantasyGrade:'C',  fantasyNote:'IDP only.' },
  { pick:165, round:5, team:'NE',  player:'Nicholas Singleton',  pos:'RB',   college:'Penn State',     note:'RB depth for Patriots rebuild.',                                                       fantasyGrade:'C+', fantasyNote:'Handcuff — worth a late pick in deep leagues.' },
  { pick:172, round:5, team:'BUF', player:'Lorenzo Styles Jr.',  pos:'WR',   college:'TBD',            note:'WR depth for Bills.',                                                                  fantasyGrade:'C',  fantasyNote:'Deep league only.' },
  { pick:177, round:5, team:'KC',  player:'Kevin Coleman Jr.',   pos:'WR',   college:'Missouri',       note:'Speed WR adds depth to Chiefs. Return specialist ability.',                           fantasyGrade:'C',  fantasyNote:'Return value only in standard formats.' },
  { pick:179, round:5, team:'ARI', player:'Enrique Cruz Jr.',    pos:'OT',   college:'Kansas',         note:'OT depth for Cardinals.',                                                              fantasyGrade:'C',  fantasyNote:'Not fantasy relevant.' },
  { pick:180, round:5, team:'LAC', player:'Seydou Traore',       pos:'TE',   college:'Mississippi State',note:'TE depth for Chargers.',                                                            fantasyGrade:'C',  fantasyNote:'Deep league TE flier.' },

  // ── ROUND 6 ──────────────────────────────────────────────────────────────
  { pick:191, round:6, team:'BUF', player:'Josh Cameron',        pos:'WR',   college:'Baylor',         note:'WR depth/special teams for Bills.',                                                    fantasyGrade:'C',  fantasyNote:'Practice squad — not relevant.' },
  { pick:198, round:6, team:'SF',  player:'Demond Clairborne',   pos:'RB',   college:'Wake Forest',    note:'RB depth for 49ers.',                                                                  fantasyGrade:'C',  fantasyNote:'Deep handcuff only.' },
  { pick:199, round:6, team:'LV',  player:'Emmanuel Henderson Jr.',pos:'WR', college:'Kansas',         note:'Speed WR for Raiders.',                                                                fantasyGrade:'C',  fantasyNote:'Deep league flier.' },
  { pick:203, round:6, team:'LAC', player:'CJ Williams',         pos:'WR',   college:'Stanford',       note:'WR depth for Chargers.',                                                               fantasyGrade:'C',  fantasyNote:'Not relevant.' },
  { pick:214, round:6, team:'IND', player:'Caden Curry',         pos:'EDGE', college:'Ohio State',     note:'EDGE depth for Colts.',                                                                fantasyGrade:'C',  fantasyNote:'IDP only.' },
  { pick:215, round:6, team:'BAL', player:'Harold Perkins Jr.',  pos:'LB',   college:'LSU',            note:'Athletic LB — slid to Round 6 due to concerns.',                                     fantasyGrade:'C',  fantasyNote:'IDP only.' },

  // ── ROUND 7 ──────────────────────────────────────────────────────────────
  { pick:220, round:7, team:'SEA', player:'Toriano Pride Jr.',   pos:'CB',   college:'Missouri',       note:'CB depth for Seahawks.',                                                               fantasyGrade:'C',  fantasyNote:'Not relevant.' },
  { pick:231, round:7, team:'BAL', player:'Ethan Onianwa',       pos:'OT',   college:'Ohio State',     note:'OT depth for Ravens.',                                                                 fantasyGrade:'C',  fantasyNote:'Not relevant.' },
  { pick:235, round:7, team:'CIN', player:'Gavin Gerhardt',      pos:'C',    college:'Cincinnati',     note:'Local product — Mr. Cincinnati.',                                                      fantasyGrade:'C',  fantasyNote:'Not relevant.' },
  { pick:248, round:7, team:'KC',  player:'Carsen Ryan',         pos:'TE',   college:'BYU',            note:'TE depth for Chiefs.',                                                                 fantasyGrade:'C',  fantasyNote:'Not relevant.' },
  { pick:257, round:7, team:'DEN', player:'Red Murdock',         pos:'LB',   college:'Buffalo',        note:'Mr. Irrelevant — Broncos close the 2026 draft.',                                     fantasyGrade:'C',  fantasyNote:'Mr. Irrelevant — good luck Red!' },
]

// Fantasy relevant picks summary by grade
const FANTASY_SLEEPERS_2026 = [
  { player:'Jeremiyah Love',   team:'ARI', pos:'RB',  pick:'3rd overall',  grade:'A+', note:'Highest-drafted RB since Saquon Barkley. Arizona will make him the centerpiece of the offense. Top-5 fantasy RB upside immediately.' },
  { player:'Fernando Mendoza', team:'LV',  pos:'QB',  pick:'1st overall',  grade:'A',  note:'No. 1 overall to the Raiders. Strong arm, poised pocket presence. Top-8 fantasy QB if he starts Week 1. Watch training camp closely.' },
  { player:'Carnell Tate',     team:'TEN', pos:'WR',  pick:'4th overall',  grade:'A-', note:'Surprise pick — smooth route runner with elite hands. Tennessee\'s WR1 immediately. Top-20 WR upside if the QB situation solidifies.' },
  { player:'Jordyn Tyson',     team:'NO',  pos:'WR',  pick:'8th overall',  grade:'B+', note:'Electric yards-after-catch specialist. Saints desperately needed a weapon. WR2/3 with high upside in a pass-happy offense.' },
  { player:'Kenyon Sadiq',     team:'NYJ', pos:'TE',  pick:'16th overall', grade:'B+', note:'Jets\' TE of the future — athletic, reliable. NYJ has needed a tight end for years. TE2 with ceiling if Aaron Rodgers stays healthy.' },
  { player:'Omar Cooper Jr.',  team:'NYJ', pos:'WR',  pick:'30th overall', grade:'B+', note:'Jets\' third Round 1 pick — gives their QB another weapon. Fast, explosive slot receiver from Indiana.' },
  { player:'Makai Lemon',      team:'PHI', pos:'WR',  pick:'20th overall', grade:'B+', note:'Speed merchant added to an already loaded Eagles offense. WR3 with big-play touchdown upside.' },
  { player:'KC Concepcion',    team:'CLE', pos:'WR',  pick:'24th overall', grade:'B',  note:'Browns needed a receiver badly. Yards-after-catch machine but dependent on Cleveland\'s QB situation being resolved.' },
  { player:'Jadarian Price',   team:'SEA', pos:'RB',  pick:'32nd overall', grade:'B-', note:'Second Notre Dame RB taken late Round 1. Backup to Kenneth Walker III in 2026. Handcuff only but long-term upside.' },
  { player:'Ty Simpson',       team:'LA',  pos:'QB',  pick:'13th overall', grade:'C+', note:'Developmental QB behind current Rams starter. Not a 2026 fantasy factor but worth monitoring for future seasons.' },
]

// ── DRAFT VIEW ────────────────────────────────────────────────────────────────
function DraftView() {
  const [tab,       setTab]       = useState('results')  // 'results' | 'fantasy' | 'byteam'
  const [teamFilter, setTeamFilter] = useState('All')
  const [posFilter,  setPosFilter]  = useState('All')
  const [roundFilter, setRoundFilter] = useState('all')
  const [search,    setSearch]    = useState('')

  const POSITIONS = ['All', 'QB', 'RB', 'WR', 'TE', 'OT', 'OG', 'EDGE', 'DT', 'LB', 'CB', 'S']
  const TABS = [
    { id:'results', label:'📋 Draft Results' },
    { id:'byteam',  label:'🏟️ By Team' },
    { id:'fantasy', label:'⚡ Fantasy Analysis' },
  ]

  const gradeColor = (g) => ({
    'A+': '#2d8a50', 'A': '#4ade80', 'A-': '#86efac',
    'B+': '#c8a84b', 'B': '#fbbf24', 'B-': '#fde68a',
    'C':  '#555',
  })[g] || '#555'

  const filtered = DRAFT_2026.filter(p => {
    if (teamFilter !== 'All' && p.team !== teamFilter) return false
    if (posFilter  !== 'All' && p.pos  !== posFilter)  return false
    if (roundFilter !== 'all' && p.round !== roundFilter) return false
    if (search && !p.player.toLowerCase().includes(search.toLowerCase()) &&
        !p.team.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // By team grouping
  const byTeam = {}
  DRAFT_2026.forEach(p => {
    if (!byTeam[p.team]) byTeam[p.team] = []
    byTeam[p.team].push(p)
  })

  return (
    <div>
      <div className="section-bar">
        <h2>2026 NFL Draft</h2>
        <div className="sb-rule" />
        <span className="sb-ct">Results · Fantasy Analysis · By Team</span>
      </div>

      {/* Sub tabs */}
      <div className="hist-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`htab ${tab === t.id ? 'on' : ''}`}
            onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* DRAFT RESULTS */}
      {tab === 'results' && (
        <div>
          {/* Filters */}
          <div className="draft-filters">
            <input className="hist-search" placeholder="Search player or team…"
              value={search} onChange={e => setSearch(e.target.value)} style={{maxWidth:200}} />
            <div className="draft-round-btns">
              <button className={`tc-btn ${roundFilter === 'all' ? 'on' : ''}`} onClick={() => setRoundFilter('all')}>All</button>
              {[1,2,3,4,5,6,7].map(r => (
                <button key={r} className={`tc-btn ${roundFilter === r ? 'on' : ''}`}
                  onClick={() => setRoundFilter(r)}>Rd {r}</button>
              ))}
            </div>
            <div className="draft-pos-btns">
              {['All','QB','RB','WR','TE','OT','EDGE','DT','LB','CB','S'].map(p => (
                <button key={p} className={`tc-btn ${posFilter === p ? 'on' : ''}`}
                  onClick={() => setPosFilter(p)}>{p}</button>
              ))}
            </div>
          </div>

          <table className="draft-table">
            <thead>
              <tr>
                <th>Pick</th>
                <th>Team</th>
                <th className="dt-player">Player</th>
                <th>Pos</th>
                <th>College</th>
                <th className="dt-note">Scouting Note</th>
                <th>Fantasy</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={i} className={p.fantasyGrade === 'A+' || p.fantasyGrade === 'A' ? 'draft-elite' : ''}>
                  <td className="dt-pick">
                    <a href={`https://www.google.com/search?q=${encodeURIComponent(p.player+' 2026 NFL Draft')}`}
                       target="_blank" rel="noopener" className="sb-google-link">
                      #{p.pick}
                    </a>
                  </td>
                  <td className="dt-team">
                    <a href={ti(p.team).url} target="_blank" rel="noopener" className="sb-google-link">{p.team}</a>
                  </td>
                  <td className="dt-player">
                    <a href={`https://www.google.com/search?q=${encodeURIComponent(p.player+' NFL')}`}
                       target="_blank" rel="noopener" className="sb-google-link">{p.player}</a>
                  </td>
                  <td className="dt-pos">{p.pos}</td>
                  <td className="dt-college">{p.college}</td>
                  <td className="dt-note">{p.note}</td>
                  <td>
                    <span className="draft-grade" style={{ background: gradeColor(p.fantasyGrade) }}>
                      {p.fantasyGrade}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {roundFilter !== 'all' && roundFilter > 3 && (
            <div className="atl-note">
              Showing key Day 3 selections with fantasy impact notes. 
              <a href="https://www.nfl.com/draft/tracker/2026/rounds/1" target="_blank" rel="noopener" className="sb-google-link" style={{marginLeft:8}}>
                View complete 2026 NFL Draft on NFL.com ↗
              </a>
            </div>
          )}
          <div className="atl-note">
            <a href="https://www.nfl.com/draft/tracker/2026/rounds/1" target="_blank" rel="noopener" className="sb-google-link">
              View complete all 257 picks on NFL.com ↗
            </a>
          </div>
        </div>
      )}

      {/* BY TEAM */}
      {tab === 'byteam' && (
        <div>
          <div className="draft-filters">
            <div className="tc-btns">
              <button className={`tc-btn ${teamFilter === 'All' ? 'on' : ''}`} onClick={() => setTeamFilter('All')}>All</button>
              {ALL_TEAMS.map(t => (
                <button key={t} className={`tc-btn ${teamFilter === t ? 'on' : ''}`} onClick={() => setTeamFilter(t)}>{t}</button>
              ))}
            </div>
          </div>
          <div className="draft-byteam-grid">
            {(teamFilter === 'All' ? ALL_TEAMS : [teamFilter]).map(abbr => {
              const picks = byTeam[abbr] || []
              if (!picks.length && teamFilter === 'All') return null
              return (
                <div key={abbr} className="draft-team-card">
                  <div className="dtc-header">
                    <a href={ti(abbr).url} target="_blank" rel="noopener" className="dtc-abbr">{abbr}</a>
                    <span className="dtc-name">{ti(abbr).city} {ti(abbr).nick}</span>
                    <span className="dtc-count">{picks.length} pick{picks.length !== 1 ? 's' : ''}</span>
                  </div>
                  {picks.length === 0 ? (
                    <div className="dtc-empty">No picks in Round 1</div>
                  ) : (
                    picks.map((p, i) => (
                      <div key={i} className="dtc-pick">
                        <span className="dtc-round">Rd {p.round} · #{p.pick}</span>
                        <a href={`https://www.google.com/search?q=${encodeURIComponent(p.player+' NFL Draft 2026')}`}
                           target="_blank" rel="noopener" className="dtc-player">{p.player}</a>
                        <span className="dtc-pos">{p.pos}</span>
                        <span className="draft-grade" style={{ background: ({
                          'A+':'#2d8a50','A':'#4ade80','A-':'#86efac','B+':'#c8a84b','B':'#fbbf24','C':'#555'
                        })[p.fantasyGrade] || '#555', fontSize:9 }}>{p.fantasyGrade}</span>
                      </div>
                    ))
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* FANTASY ANALYSIS */}
      {tab === 'fantasy' && (
        <div>
          <div className="hof-intro">
            <span className="hof-intro-text">
              Fantasy-relevant picks from the 2026 NFL Draft — ranked by immediate impact potential.
              A+ = potential Day 1 starter with top-10 upside. Monitor training camp closely.
            </span>
          </div>
          <div className="draft-fantasy-grid">
            {FANTASY_SLEEPERS_2026.map((p, i) => (
              <a key={i} href={`https://www.google.com/search?q=${encodeURIComponent(p.player+' 2026 fantasy football')}`}
                 target="_blank" rel="noopener" className={`hof-card ${i < 3 ? 'hof-elite' : ''}`}
                 style={{textDecoration:'none', color:'inherit'}}>
                <div className="hof-rank">#{i + 1} Fantasy Pick</div>
                <div className="hof-player">{p.player}</div>
                <div className="hof-meta">
                  <span className="hof-team">{p.team}</span>
                  <span className="hof-pos">{p.pos}</span>
                  <span className="hof-year">{p.pick}</span>
                </div>
                <div className="hof-pts" style={{fontSize:32, color:({'A+':'#2d8a50','A':'#4ade80','A-':'#86efac','B+':'#c8a84b','B':'#fbbf24'})[p.grade] || '#555'}}>
                  {p.grade} <span style={{fontSize:12, color:'var(--muted)'}}>grade</span>
                </div>
                <div className="hof-note">{p.note}</div>
              </a>
            ))}
          </div>
          <div className="atl-note">
            Fantasy grades based on immediate impact potential. Monitor training camp and depth charts.
            Rookies rarely pay off in fantasy Year 1 — exceptions exist for elite talents.
          </div>
        </div>
      )}
    </div>
  )
}

// ── FOOTER ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="footer">
      <span>The Final Whistle · nflboxscore.com · 2026</span>
      <span className="footer-bmac">
        Enjoying this? <a href="https://buymeacoffee.com/mhughes65v" target="_blank" rel="noopener">Buy me a coffee</a>
        {' · '}
        <a href={`https://www.amazon.com?tag=${AMAZON_TAG}`} target="_blank" rel="noopener">Shop Amazon</a>
      </span>
      <span>6pt TD · Standard / PPR</span>
    </footer>
  )
}
