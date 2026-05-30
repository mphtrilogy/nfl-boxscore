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
const VIEWS = ['Scores', 'Schedule', 'Standings', 'Trends', 'Leaders', 'Fantasy']

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

  // Also ask ESPN what the current week is and sync if different
  useEffect(() => {
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

  // Live ESPN scoreboard for current week
  const { data: espnData, loading, error, lastUpdated, refresh } = useScoreboard(activeWeek)

  // Parse ESPN games
  const liveGames = espnData?.events?.map(parseESPNGame).filter(Boolean) || []

  // Merge live scores into schedule
  const mergedGames = SCHEDULE_2026.filter(g => g.week === activeWeek).map(g => {
    const live = liveGames.find(lg =>
      lg.home === g.home && lg.away === g.away
    )
    if (live) return { ...g, ...live }
    return g
  })

  // Detect if any game is live (for auto-refresh indicator)
  const hasLiveGame = liveGames.some(g => g.status === 'live')

  return (
    <div className="app">
      {/* ── MASTHEAD ── */}
      <Masthead lastUpdated={lastUpdated} hasLiveGame={hasLiveGame} onRefresh={refresh} />

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
        {activeView === 'Trends'    && (
          <TrendsView
            currentWeek={activeWeek}
            mode={trendsMode}
            setMode={setTrendsMode}
            range={trendsRange}
            setRange={setTrendsRange}
            pos={trendsPos}
            setPos={setTrendsPos}
          />
        )}
        {activeView === 'Leaders'   && (
          <LeadersView tab={leadersTab} setTab={setLeadersTab} />
        )}
        {activeView === 'Fantasy'   && (
          <FantasyView mode={fantMode} setMode={setFantMode} />
        )}
      </main>

      <Footer />
    </div>
  )
}

// ── MASTHEAD ──────────────────────────────────────────────────────────────────
function Masthead({ lastUpdated, hasLiveGame, onRefresh }) {
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })
  const vol = `Vol. ${now.getFullYear()} · No. ${Math.ceil((now - new Date(now.getFullYear(),0,1))/(7*86400000))}`

  return (
    <header className="masthead">
      <div className="edition-line">
        <span>{vol}</span>
        <span>{dateStr}</span>
      </div>
      <div className="logo">The Final Whistle</div>
      <div className="tagline">NFL · Scores · Box Scores · Fantasy · Schedule</div>
      <div className="support-bar">
        <span className="support-text">Independent &amp; ad-free. If it's useful,</span>
        <span className="support-div">—</span>
        <a className="support-link" href="https://buymeacoffee.com/mhughes65v" target="_blank" rel="noopener">
          buy me a coffee ☕
        </a>
        {lastUpdated && (
          <span className="live-badge" onClick={onRefresh} title="Click to refresh">
            {hasLiveGame && <span className="live-dot" />}
            {hasLiveGame ? 'LIVE' : `Updated ${lastUpdated.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`}
          </span>
        )}
      </div>
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
            <span className="network-badge" style={{ background: netColor.bg, color: netColor.text }}>
              {g.network.replace('/SNF','').replace('/MNF','').replace('/TNF','')}
            </span>
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
  return (
    <div className="game-info-drawer">
      <div className="gi-row"><span>Date</span><span>{g.date} · {g.day}</span></div>
      <div className="gi-row"><span>Kickoff</span><span>{g.time} ET</span></div>
      <div className="gi-row"><span>Network</span><span>{g.network}</span></div>
      {g.venue && <div className="gi-row"><span>Venue</span><span>{g.venue}</span></div>}
      {g.intl  && <div className="gi-row"><span>Location</span><span>🌍 {g.intlCity}</span></div>}
      {g.odds  && <div className="gi-row"><span>Line</span><span>{g.odds}</span></div>}
      {g.note  && <div className="gi-note">{g.note}</div>}
    </div>
  )
}

// ── SCHEDULE VIEW ─────────────────────────────────────────────────────────────
function ScheduleView({ teamFilter, setTeamFilter, weekFilter, setWeekFilter }) {
  const isTeamView = teamFilter !== 'All'
  const isWeekView = !isTeamView && weekFilter !== 'All'
  const isAllView  = !isTeamView && weekFilter === 'All'

  // Team view — fetch from ESPN directly (accurate bye weeks, correct games)
  const { games: teamGames, loading: teamLoading, error: teamError } = useTeamSchedule(
    isTeamView ? teamFilter : null
  )

  // Week view — fetch from ESPN scoreboard
  const { games: weekGames, loading: weekLoading } = useWeekSchedule(
    isWeekView ? weekFilter : null
  )

  const loading = teamLoading || weekLoading

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

      {/* TEAM VIEW — ESPN live data, fallback to static if off-season */}
      {isTeamView && !loading && (
        teamGames.length > 0
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
          : /* Off-season fallback — static schedule data */
            ALL_WEEKS.map(w => {
              const wGames = SCHEDULE_2026.filter(g =>
                g.week === w && (g.home === teamFilter || g.away === teamFilter)
              )
              if (!wGames.length) return null
              const meta = WEEK_META[w] || { label: `Week ${w}`, dates: '' }
              return (
                <div key={w} className="sch-week-block">
                  <div className="sch-week-header">
                    <span className="swh-title">{meta.label}{meta.note ? ` · ${meta.note}` : ''}</span>
                    <span className="swh-dates">{meta.dates}</span>
                  </div>
                  <div className="sch-games-list">
                    {wGames.map((g,i) => <ScheduleGame key={i} game={g} onTeamClick={setTeamFilter} />)}
                  </div>
                </div>
              )
            })
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

  return (
    <div className={`sch-game ${isFinal ? 'sg-final' : isLive ? 'sg-live' : ''}`}>
      <div className="sg-meta">
        <span className="sg-day">{g.day}</span>
        <span className={`sg-status ${isFinal ? 'final' : isLive ? 'live' : ''}`}>
          {isFinal ? 'Final' : isLive ? `Q${g.period} ${g.displayClock}` : g.date}
        </span>
        {g.intl && <span className="sg-intl">🌍</span>}
        {g.network && (
          <span className="sg-net" style={{ background: netColor.bg, color: netColor.text }}>
            {g.network.split('/')[0]}
          </span>
        )}
      </div>
      <div className="sg-teams">
        <div className={`sg-team ${awayWin ? 'win' : homeWin ? 'lose' : ''}`}
             onClick={() => onTeamClick(g.away)}>
          <span className="sg-abv">{g.away}</span>
          <span className="sg-city">{ti(g.away).city}</span>
          <span className="sg-ha">Away</span>
        </div>
        <div className="sg-vs">at</div>
        <div className={`sg-team ${homeWin ? 'win' : awayWin ? 'lose' : ''}`}
             onClick={() => onTeamClick(g.home)}>
          <span className="sg-abv">{g.home}</span>
          <span className="sg-city">{ti(g.home).city}</span>
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
function FantasyView({ mode, setMode }) {
  return (
    <div>
      <div className="section-bar">
        <h2>Fantasy Scoring</h2>
        <div className="sb-rule" />
        <span className="sb-ct">6pt TD · Standard / PPR</span>
      </div>
      <div className="fant-mode-bar">
        <span className="fmb-label">Scoring Mode</span>
        <div className="fmb-btns">
          <button className={`fmb-btn ${mode === 'std' ? 'on' : ''}`} onClick={() => setMode('std')}>Standard</button>
          <button className={`fmb-btn ${mode === 'ppr' ? 'on' : ''}`} onClick={() => setMode('ppr')}>PPR</button>
        </div>
        <span className="fmb-key">
          Pass 1pt/25yds · 6pt TD · −2 INT · Rush/Rec 1pt/10yds{mode === 'ppr' ? ' · +1pt REC' : ''} · No kickers
        </span>
      </div>
      <div className="leaders-coming-soon">
        <div className="cs-icon">⚡</div>
        <div className="cs-title">Fantasy Leaders Ready Week 1</div>
        <div className="cs-text">
          Fantasy point totals, per-player breakdowns, and Standard vs PPR toggle will populate
          after games are played. Box score tabs include fantasy projections per player.
        </div>
        <div className="cs-date">Season opens Sep 9 · SEA vs NE</div>
      </div>
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
function Footer() {
  return (
    <footer className="footer">
      <span>The Final Whistle · NFL 2026</span>
      <span className="footer-bmac">
        Enjoying this? <a href="https://buymeacoffee.com/mhughes65v" target="_blank" rel="noopener">Buy me a coffee</a>
      </span>
      <span>6pt TD · Standard / PPR</span>
    </footer>
  )
}
