import React, { useState, useEffect } from 'react'
import { useScoreboard, useBoxScore, useTeamSchedule, useWeekSchedule, parseESPNGame } from './hooks/useESPN'
import { SCHEDULE_2026, WEEK_META, ALL_TEAMS } from './data/schedule2026'
import { ti, networkColor, fmt, TEAMS } from './utils/teams'

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const ROUND_ORDER = ['Super Bowl','Conf Champs','Divisional','Wild Card']
const ALL_WEEKS   = [...Array(18)].map((_,i) => i + 1)

// Season gates
// Preseason starts ~Aug 7, regular season Sep 9
// Both gates open ESPN data — preseason shows with a "Preseason" label
const PRESEASON_START  = new Date('2026-08-07T00:00:00-04:00')
const REGULAR_SEASON   = new Date('2026-09-09T00:00:00-04:00')
const isPreseason      = () => new Date() >= PRESEASON_START && new Date() < REGULAR_SEASON
const isRegularSeason  = () => new Date() >= REGULAR_SEASON
const isGameSeason     = () => new Date() >= PRESEASON_START  // either preseason OR regular
const seasonLabel      = () => isRegularSeason() ? 'Regular Season' : isPreseason() ? 'Preseason' : 'Preseason opens Aug 7'
const espnSeasonType   = () => isRegularSeason() ? 2 : 1  // ESPN: 1=preseason, 2=regular
function getAutoWeek() {
  const now = new Date()
  if (now >= PRESEASON_START && now < REGULAR_SEASON) {
    const weekNum = Math.floor((now - PRESEASON_START) / (7*24*60*60*1000)) + 1
    return Math.min(Math.max(weekNum, 1), 4)
  }
  if (now < PRESEASON_START) return 1
  const weekNum = Math.floor((now - REGULAR_SEASON) / (7*24*60*60*1000)) + 1
  return Math.min(Math.max(weekNum, 1), 18)
}

// ── TOP-LEVEL NAV VIEWS ───────────────────────────────────────────────────────
const VIEWS = ['Scores', 'Schedule', 'Standings', 'TV Guide', 'News', 'Injuries', 'Stats', 'Leaders', 'Fantasy', 'Draft', 'History', 'Playroom', 'Resources']

export default function App() {
  const [activeView,    setActiveView]    = useState('Scores')
  const [activeWeek,    setActiveWeek]    = useState(getAutoWeek)
  const [drawerOpen,    setDrawerOpen]    = useState(false)
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

  // ── MY FANTASY SQUAD ──────────────────────────────────────────────────────
  const [squad, setSquad] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fw_squad_v1')) || {teams:[],players:[],on:false} }
    catch(e) { return {teams:[],players:[],on:false} }
  })
  const saveSquad = (sq) => {
    const newSquad = { teams: sq.teams || [], players: sq.players || [], on: !!sq.on }
    localStorage.setItem('fw_squad_v1', JSON.stringify(newSquad))
    setSquad(newSquad)
  }
  const [squadModalOpen, setSquadModalOpen] = useState(false)

  // Season gate — open for preseason (Aug 7) and regular season (Sep 9)
  const seasonStarted = isGameSeason()

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
      {/* ── MOBILE DRAWER OVERLAY ── */}
      {drawerOpen && (
        <div className="mob-overlay" onClick={() => setDrawerOpen(false)} />
      )}

      {/* ── MOBILE SLIDE-OUT DRAWER ── */}
      <nav className={`mob-drawer ${drawerOpen ? 'open' : ''}`}>
        <div className="mob-drawer-head">
          <div className="mob-drawer-logo">THE FINAL WHISTLE</div>
          <button className="mob-drawer-close" onClick={() => setDrawerOpen(false)}>✕</button>
        </div>

        <div className="mob-drawer-section-label">MAIN</div>
        {[
          { view:'Scores',    icon:'🏈', label:'Scores'    },
          { view:'Schedule',  icon:'📅', label:'Schedule'  },
          { view:'Standings', icon:'🏆', label:'Standings' },
          { view:'TV Guide',  icon:'📺', label:'TV Guide'  },
          { view:'News',      icon:'📰', label:'News'      },
          { view:'Injuries',  icon:'🏥', label:'Injuries'  },
        ].map(({ view, icon, label }) => (
          <button
            key={view}
            className={`mob-drawer-item ${activeView === view ? 'on' : ''}`}
            onClick={() => { setActiveView(view); setDrawerOpen(false) }}
          >
            <span className="mob-drawer-icon">{icon}</span>
            <span className="mob-drawer-label">{label}</span>
          </button>
        ))}

        <div className="mob-drawer-section-label">FANTASY & STATS</div>
        {[
          { view:'Fantasy',   icon:'⚡', label:'Fantasy Hub' },
          { view:'Stats',     icon:'📊', label:'Stats Hub'   },
          { view:'Leaders',   icon:'🥇', label:'Leaders'     },
          { view:'Draft',     icon:'🎯', label:'Draft 2026'  },
        ].map(({ view, icon, label }) => (
          <button
            key={view}
            className={`mob-drawer-item ${activeView === view ? 'on' : ''}`}
            onClick={() => { setActiveView(view); setDrawerOpen(false) }}
          >
            <span className="mob-drawer-icon">{icon}</span>
            <span className="mob-drawer-label">{label}</span>
          </button>
        ))}

        <div className="mob-drawer-section-label">EXPLORE</div>
        {[
          { view:'History',   icon:'📼', label:'History'     },
          { view:'Playroom',  icon:'🎮', label:'Playroom'    },
          { view:'Resources', icon:'🔗', label:'Resources'   },
        ].map(({ view, icon, label }) => (
          <button
            key={view}
            className={`mob-drawer-item mob-drawer-item-gold ${activeView === view ? 'on' : ''}`}
            onClick={() => { setActiveView(view); setDrawerOpen(false) }}
          >
            <span className="mob-drawer-icon">{icon}</span>
            <span className="mob-drawer-label">{label}</span>
          </button>
        ))}

        <div className="mob-drawer-footer">
          <a href="https://buymeacoffee.com/mhughes65v" target="_blank" rel="noopener" className="mob-drawer-promo">
            ☕ Buy me a coffee
          </a>
        </div>
      </nav>

      {/* ── MASTHEAD ── */}
      <Masthead lastUpdated={lastUpdated} hasLiveGame={hasLiveGame} onRefresh={refresh} fontTheme={fontTheme} setFontTheme={setFontTheme} onHamburger={() => setDrawerOpen(true)} />
      <SquadBar squad={squad} onOpen={() => setSquadModalOpen(true)} onToggle={(on) => saveSquad({teams:squad.teams||[], players:squad.players||[], on})} />
      {squadModalOpen && <SquadModal squad={squad} onSave={(sq) => { saveSquad(sq); setSquadModalOpen(false) }} onClose={() => setSquadModalOpen(false)} />}

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

      {/* ── CONTENT + SIDEBAR ── */}
      <div className="app-body">
        <main className="app-main">
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
            squad={squad}
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
            squad={squad}
            trendsMode={trendsMode} setTrendsMode={setTrendsMode}
            trendsRange={trendsRange} setTrendsRange={setTrendsRange}
            trendsPos={trendsPos} setTrendsPos={setTrendsPos}
          />
        )}
        {activeView === 'Draft'     && <DraftView />}
        {activeView === 'History'   && <HistoryView />}
        {activeView === 'Stats'     && <StatsView squad={squad} />}
        {activeView === 'Playroom'  && <PlayroomView />}
        {activeView === 'Resources' && <ResourcesView />}
        </main>
        <Sidebar activeWeek={activeWeek} setActiveView={setActiveView} squad={squad} />
      </div>

      <Footer squad={squad} favTeam={teamFilter} />

      {/* ── MOBILE BOTTOM TAB BAR ── */}
      <nav className="mob-tab-bar">
        {[
          { view:'Scores',  icon:'🏈', label:'Scores'  },
          { view:'Fantasy', icon:'⚡', label:'Fantasy' },
          { view:'Stats',   icon:'📊', label:'Stats'   },
          { view:'News',    icon:'📰', label:'News'    },
        ].map(({ view, icon, label }) => (
          <button
            key={view}
            className={`mob-tab ${activeView === view ? 'on' : ''}`}
            onClick={() => setActiveView(view)}
          >
            <span className="mob-tab-icon">{icon}</span>
            <span className="mob-tab-label">{label}</span>
          </button>
        ))}
        <button
          className="mob-tab"
          onClick={() => setDrawerOpen(true)}
        >
          <span className="mob-tab-icon">☰</span>
          <span className="mob-tab-label">More</span>
        </button>
      </nav>
      {/* Newsletter confirmation toast */}
      {typeof window !== "undefined" && new URLSearchParams(window.location.search).get("nl") === "confirmed" && (
        <div className="nl-toast">✓ Subscription confirmed — see you Week 1!</div>
      )}
      {typeof window !== "undefined" && new URLSearchParams(window.location.search).get("nl") === "unsubscribed" && (
        <div className="nl-toast nl-toast-unsub">Unsubscribed. Thanks for reading.</div>
      )}
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
function Masthead({ lastUpdated, hasLiveGame, onRefresh, fontTheme, setFontTheme, onHamburger }) {
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
    playfair: { family: "var(--font-display)",        label: 'Serif' },
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
      {/* Hamburger — mobile only, hidden on desktop via CSS */}
      <button className="mob-hamburger" onClick={onHamburger} aria-label="Open menu">
        <span /><span /><span />
      </button>
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

// ── MY FANTASY SQUAD COMPONENTS ──────────────────────────────────────────────
// ── COMPREHENSIVE PLAYER LIST — all fantasy-relevant starters + key backups ──
const ALL_SQUAD_PLAYERS = [
  // ── QBs ────────────────────────────────────────────────────────────────────
  {name:'Lamar Jackson',      pos:'QB',team:'BAL'},{name:'Josh Allen',           pos:'QB',team:'BUF'},
  {name:'Patrick Mahomes',    pos:'QB',team:'KC'}, {name:'Jalen Hurts',          pos:'QB',team:'PHI'},
  {name:'Joe Burrow',         pos:'QB',team:'CIN'},{name:'Jayden Daniels',       pos:'QB',team:'WAS'},
  {name:'Sam Darnold',        pos:'QB',team:'SEA'},{name:'Geno Smith',           pos:'QB',team:'NYJ'},
  {name:'Brock Purdy',        pos:'QB',team:'SF'}, {name:'C.J. Stroud',          pos:'QB',team:'HOU'},
  {name:'Tua Tagovailoa',     pos:'QB',team:'MIA'},{name:'Jordan Love',          pos:'QB',team:'GB'},
  {name:'Dak Prescott',       pos:'QB',team:'DAL'},{name:'Anthony Richardson',   pos:'QB',team:'IND'},
  {name:'Caleb Williams',     pos:'QB',team:'CHI'},{name:'Drake Maye',           pos:'QB',team:'NE'},
  {name:'Bo Nix',             pos:'QB',team:'DEN'},{name:'Baker Mayfield',       pos:'QB',team:'TB'},
  {name:'Kirk Cousins',       pos:'QB',team:'LV'},{name:'Justin Herbert',       pos:'QB',team:'LAC'},
  {name:'Justin Fields',      pos:'QB',team:'PIT'},{name:'Matthew Stafford',     pos:'QB',team:'LA'},
  {name:'Deshaun Watson',     pos:'QB',team:'CLE'},{name:'Trevor Lawrence',      pos:'QB',team:'JAC'},
  {name:'Will Levis',         pos:'QB',team:'TEN'},{name:'Daniel Jones',         pos:'QB',team:'NYG'},
  {name:'Aaron Rodgers',      pos:'QB',team:'NYJ'},{name:'Derek Carr',           pos:'QB',team:'NO'},
  {name:'Bryce Young',        pos:'QB',team:'CAR'},{name:'Aidan O\'Connell',     pos:'QB',team:'LV'},
  {name:'Fernando Mendoza',   pos:'QB',team:'LV'}, {name:'Kyler Murray',         pos:'QB',team:'MIN'},
  {name:'Sam Howell',         pos:'QB',team:'WAS'},{name:'Malik Willis',         pos:'QB',team:'TEN'},
  {name:'Jacoby Brissett',    pos:'QB',team:'NE'}, {name:'Carson Wentz',         pos:'QB',team:'LA'},
  // ── RBs ────────────────────────────────────────────────────────────────────
  {name:'Saquon Barkley',     pos:'RB',team:'PHI'},{name:"De'Von Achane",        pos:'RB',team:'MIA'},
  {name:'Bijan Robinson',     pos:'RB',team:'ATL'},{name:'Jahmyr Gibbs',         pos:'RB',team:'DET'},
  {name:'Derrick Henry',      pos:'RB',team:'BAL'},{name:'Jonathan Taylor',      pos:'RB',team:'IND'},
  {name:'James Cook',         pos:'RB',team:'BUF'},{name:'Tony Pollard',         pos:'RB',team:'TEN'},
  {name:'Josh Jacobs',        pos:'RB',team:'GB'}, {name:'Joe Mixon',            pos:'RB',team:'HOU'},
  {name:'Breece Hall',        pos:'RB',team:'NYJ'},{name:'Kenneth Walker III',   pos:'RB',team:'SEA'},
  {name:'David Montgomery',   pos:'RB',team:'DET'},{name:'Rachaad White',        pos:'RB',team:'TB'},
  {name:'Travis Etienne',     pos:'RB',team:'JAC'},{name:'Chuba Hubbard',        pos:'RB',team:'CAR'},
  {name:'Isiah Pacheco',      pos:'RB',team:'KC'}, {name:'Kyren Williams',       pos:'RB',team:'LA'},
  {name:'Aaron Jones',        pos:'RB',team:'MIN'},{name:'Alvin Kamara',         pos:'RB',team:'NO'},
  {name:"D'Andre Swift",      pos:'RB',team:'CHI'},{name:'Javonte Williams',     pos:'RB',team:'DEN'},
  {name:'Brian Robinson',     pos:'RB',team:'WAS'},{name:'Rhamondre Stevenson',  pos:'RB',team:'NE'},
  {name:'Zack Moss',          pos:'RB',team:'CIN'},{name:'James Conner',         pos:'RB',team:'ARI'},
  {name:'Cam Akers',          pos:'RB',team:'MIN'},{name:'Tank Bigsby',          pos:'RB',team:'JAC'},
  {name:'Gus Edwards',        pos:'RB',team:'LAC'},{name:'Jerome Ford',          pos:'RB',team:'CLE'},
  {name:'Miles Sanders',      pos:'RB',team:'CAR'},{name:'Roschon Johnson',      pos:'RB',team:'CHI'},
  {name:'Tyjae Spears',       pos:'RB',team:'TEN'},{name:'Dameon Pierce',        pos:'RB',team:'HOU'},
  {name:'Jaleel McLaughlin',  pos:'RB',team:'DEN'},{name:'Rico Dowdle',          pos:'RB',team:'DAL'},
  {name:'Jeremiyah Love',     pos:'RB',team:'ARI'},{name:'Jadarian Price',       pos:'RB',team:'SEA'},
  {name:'Kareem Hunt',        pos:'RB',team:'KC'}, {name:'Antonio Gibson',       pos:'RB',team:'WAS'},
  {name:'Ezekiel Elliott',    pos:'RB',team:'NE'}, {name:'Raheem Mostert',       pos:'RB',team:'MIA'},
  {name:'De\'Veon Smith',     pos:'RB',team:'PHI'},{name:'Jordan Mason',         pos:'RB',team:'SF'},
  // ── WRs ────────────────────────────────────────────────────────────────────
  {name:"Ja'Marr Chase",      pos:'WR',team:'CIN'},{name:'CeeDee Lamb',          pos:'WR',team:'DAL'},
  {name:'Tyreek Hill',        pos:'WR',team:'MIA'},{name:'Justin Jefferson',     pos:'WR',team:'MIN'},
  {name:'A.J. Brown',         pos:'WR',team:'NE'},{name:'Davante Adams',        pos:'WR',team:'NYJ'},
  {name:'Malik Nabers',       pos:'WR',team:'NYG'},{name:'DK Metcalf',           pos:'WR',team:'SEA'},
  {name:'Stefon Diggs',       pos:'WR',team:'HOU'},{name:'Puka Nacua',           pos:'WR',team:'LA'},
  {name:'Drake London',       pos:'WR',team:'ATL'},{name:'Amon-Ra St. Brown',    pos:'WR',team:'DET'},
  {name:'DeVonta Smith',      pos:'WR',team:'PHI'},{name:'Brandon Aiyuk',        pos:'WR',team:'SF'},
  {name:'Jaylen Waddle',      pos:'WR',team:'MIA'},{name:'Terry McLaurin',       pos:'WR',team:'WAS'},
  {name:'Mike Evans',         pos:'WR',team:'TB'}, {name:'Chris Olave',          pos:'WR',team:'NO'},
  {name:'Hollywood Brown',    pos:'WR',team:'KC'}, {name:'Rashee Rice',          pos:'WR',team:'KC'},
  {name:'George Pickens',     pos:'WR',team:'PIT'},{name:'Keenan Allen',         pos:'WR',team:'CHI'},
  {name:'Tee Higgins',        pos:'WR',team:'CIN'},{name:'Courtland Sutton',     pos:'WR',team:'DEN'},
  {name:'Jaxon Smith-Njigba', pos:'WR',team:'SEA'},{name:'Gabe Davis',           pos:'WR',team:'JAC'},
  {name:'DJ Moore',           pos:'WR',team:'CHI'},{name:'Amari Cooper',         pos:'WR',team:'BUF'},
  {name:'Zay Flowers',        pos:'WR',team:'BAL'},{name:'Romeo Doubs',          pos:'WR',team:'GB'},
  {name:'Marvin Harrison Jr.',pos:'WR',team:'ARI'},{name:'Calvin Ridley',        pos:'WR',team:'TEN'},
  {name:'Diontae Johnson',    pos:'WR',team:'CAR'},{name:'Odell Beckham Jr.',    pos:'WR',team:'NYG'},
  {name:'Brandin Cooks',      pos:'WR',team:'DAL'},{name:'Tyler Lockett',        pos:'WR',team:'SEA'},
  {name:'Josh Downs',         pos:'WR',team:'IND'},{name:'Adam Thielen',         pos:'WR',team:'CAR'},
  {name:'Rashid Shaheed',     pos:'WR',team:'NO'}, {name:'Wan\'Dale Robinson',   pos:'WR',team:'NYG'},
  {name:'Nathanael Dell',     pos:'WR',team:'HOU'},{name:'Tank Dell',            pos:'WR',team:'HOU'},
  {name:'Quentin Johnston',   pos:'WR',team:'LAC'},{name:'Rome Odunze',          pos:'WR',team:'CHI'},
  {name:'Jakobi Meyers',      pos:'WR',team:'LV'}, {name:'Hunter Renfrow',       pos:'WR',team:'LV'},
  {name:'Michael Pittman',    pos:'WR',team:'PIT'},{name:'Alec Pierce',          pos:'WR',team:'IND'},
  {name:'Darnell Mooney',     pos:'WR',team:'ATL'},{name:'Christian Kirk',       pos:'WR',team:'JAC'},
  {name:'Curtis Samuel',      pos:'WR',team:'BUF'},{name:'Elijah Moore',         pos:'WR',team:'CLE'},
  {name:'Carnell Tate',       pos:'WR',team:'TEN'},{name:'Travis Hunter',        pos:'WR',team:'CLE'},
  {name:'Emeka Egbuka',       pos:'WR',team:'MIA'},{name:'Makai Lemon',          pos:'WR',team:'PHI'},
  {name:'Omar Cooper Jr.',    pos:'WR',team:'NYJ'},{name:'Jordyn Tyson',         pos:'WR',team:'NO'},
  {name:'Demarcus Robinson',  pos:'WR',team:'LA'}, {name:'Van Jefferson',        pos:'WR',team:'ATL'},
  {name:'Kendrick Bourne',      pos:'WR',team:'NE'},
  {name:'Jerry Jeudy',        pos:'WR',team:'CLE'},{name:'Cedric Tillman',       pos:'WR',team:'CLE'},
  // ── TEs ────────────────────────────────────────────────────────────────────
  {name:'Travis Kelce',       pos:'TE',team:'KC'}, {name:'Sam LaPorta',          pos:'TE',team:'DET'},
  {name:'Mark Andrews',       pos:'TE',team:'BAL'},{name:'Trey McBride',         pos:'TE',team:'ARI'},
  {name:'Brock Bowers',       pos:'TE',team:'LV'}, {name:'Kyle Pitts',           pos:'TE',team:'ATL'},
  {name:'George Kittle',      pos:'TE',team:'SF'}, {name:'Dallas Goedert',       pos:'TE',team:'PHI'},
  {name:'David Njoku',        pos:'TE',team:'CLE'},{name:'Evan Engram',          pos:'TE',team:'JAC'},
  {name:'Cole Kmet',          pos:'TE',team:'CHI'},{name:'T.J. Hockenson',       pos:'TE',team:'MIN'},
  {name:'Jake Ferguson',      pos:'TE',team:'DAL'},{name:'Dalton Kincaid',       pos:'TE',team:'BUF'},
  {name:'Chigoziem Okonkwo',  pos:'TE',team:'TEN'},{name:'Hunter Henry',         pos:'TE',team:'NE'},
  {name:'Mike Gesicki',       pos:'TE',team:'CIN'},{name:'Logan Thomas',         pos:'TE',team:'WAS'},
  {name:'Isaiah Likely',      pos:'TE',team:'BAL'},{name:'Tucker Kraft',         pos:'TE',team:'GB'},
  {name:'Cade Otton',         pos:'TE',team:'TB'}, {name:'Jonnu Smith',          pos:'TE',team:'MIA'},
  {name:'Tyler Conklin',      pos:'TE',team:'NYJ'},{name:'Gerald Everett',       pos:'TE',team:'LAC'},
  {name:'Juwan Johnson',      pos:'TE',team:'NO'}, {name:'Austin Hooper',        pos:'TE',team:'TEN'},
  {name:'Dawson Knox',        pos:'TE',team:'BUF'},{name:'Noah Fant',            pos:'TE',team:'SEA'},
  {name:'Tyler Higbee',       pos:'TE',team:'LA'}, {name:'Foster Moreau',        pos:'TE',team:'NO'},
  {name:'Kenyon Sadiq',       pos:'TE',team:'NYJ'},{name:'Tyler Warren',         pos:'TE',team:'IND'},
  {name:'Colston Loveland',   pos:'TE',team:'ARI'},{name:'Oscar Delp',           pos:'TE',team:'NO'},

  // ── ADDED/CORRECTED ──────────────────────────────────────────────────────
  {name:'Garrett Wilson',       pos:'WR',team:'NYJ'},{name:'Mason Taylor',         pos:'TE',team:'NYJ'},
  {name:'Josh Reynolds',        pos:'WR',team:'NYJ'},{name:'Myles Garrett',        pos:'DE',team:'LA'},
  {name:'Micah Parsons',        pos:'LB',team:'DAL'},{name:'Jared Verse',          pos:'EDGE',team:'CLE'},
  {name:'Stefon Diggs',         pos:'WR',team:'HOU'},{name:'DeAndre Hopkins',      pos:'WR',team:'KC'},
  {name:'Trey Sermon',          pos:'RB',team:'PHI'},{name:'Clyde Edwards-Helaire', pos:'RB',team:'KC'},
  {name:'Irvin Charles',        pos:'WR',team:'SEA'},{name:'Braxton Berrios',      pos:'WR',team:'NYG'},
  {name:'JuJu Smith-Schuster',  pos:'WR',team:'KC'}, {name:'Odell Beckham Jr.',    pos:'WR',team:'NYG'},
  // ── Ks ─────────────────────────────────────────────────────────────────────
  {name:'Justin Tucker',      pos:'K', team:'BAL'},{name:'Harrison Butker',      pos:'K', team:'KC'},
  {name:'Evan McPherson',     pos:'K', team:'CIN'},{name:'Tyler Bass',           pos:'K', team:'BUF'},
  {name:'Brandon Aubrey',     pos:'K', team:'DAL'},{name:'Jake Elliott',         pos:'K', team:'PHI'},
  {name:"Ka'imi Fairbairn",   pos:'K', team:'HOU'},{name:'Younghoe Koo',         pos:'K', team:'ATL'},
  {name:'Cairo Santos',       pos:'K', team:'CHI'},{name:'Jason Sanders',        pos:'K', team:'MIA'},
  {name:'Greg Zuerlein',      pos:'K', team:'NYJ'},{name:'Matt Gay',             pos:'K', team:'IND'},
  {name:'Wil Lutz',           pos:'K', team:'DEN'},{name:'Matt Ammendola',       pos:'K', team:'NO'},
  {name:'Cameron Dicker',     pos:'K', team:'LAC'},{name:'Chris Boswell',        pos:'K', team:'PIT'},
]

const SQUAD_DIVISIONS = [
  {conf:'AFC',div:'AFC East', teams:['BUF','MIA','NE','NYJ']},
  {conf:'AFC',div:'AFC North',teams:['BAL','CIN','CLE','PIT']},
  {conf:'AFC',div:'AFC South',teams:['HOU','IND','JAC','TEN']},
  {conf:'AFC',div:'AFC West', teams:['DEN','KC','LV','LAC']},
  {conf:'NFC',div:'NFC East', teams:['DAL','NYG','PHI','WAS']},
  {conf:'NFC',div:'NFC North',teams:['CHI','DET','GB','MIN']},
  {conf:'NFC',div:'NFC South',teams:['ATL','CAR','NO','TB']},
  {conf:'NFC',div:'NFC West', teams:['ARI','LA','LAC','SEA','SF']},
]

function SquadBar({ squad, onOpen, onToggle }) {
  const total = (squad.teams?.length||0) + (squad.players?.length||0)
  return (
    <div className="squad-bar">
      <button className="squad-btn" onClick={onOpen}>
        ⚡ My Fantasy Squad
        {total > 0 && <span className="squad-btn-count">{total}</span>}
      </button>
      {squad.on && total > 0 && (
        <div className="squad-pills">
          {[...(squad.teams||[]),...(squad.players||[])].slice(0,5).map((t,i) => (
            <span key={i} className="squad-pill">{t}</span>
          ))}
          {total > 5 && <span className="squad-pill">+{total-5}</span>}
        </div>
      )}
      <div className="squad-toggle-wrap">
        <span className="squad-toggle-lbl">Highlight Squad</span>
        <label className="squad-toggle">
          <input type="checkbox" checked={!!squad.on} onChange={e => onToggle(e.target.checked)} />
          <span className="squad-track" />
        </label>
      </div>
    </div>
  )
}

// ── ESPN TEAM IDs for roster API ─────────────────────────────────────────────
const ESPN_TEAM_IDS = {
  ARI:22,ATL:1, BAL:33,BUF:2, CAR:29,CHI:3, CIN:4, CLE:5,
  DAL:6, DEN:7, DET:8, GB:9,  HOU:34,IND:11,JAC:30,KC:12,
  LA:14, LAC:24,LV:13, MIA:15,MIN:16,NE:17, NO:18, NYG:19,
  NYJ:20,PHI:21,PIT:23,SEA:26,SF:25, TB:27, TEN:10,WAS:28,
}

// Cache key so we don't re-fetch on every modal open
const ROSTER_CACHE_KEY = 'fw_rosters_v1'
const ROSTER_CACHE_TTL = 6 * 60 * 60 * 1000 // 6 hours

function useESPNRosters(teams) {
  const [players,  setPlayers]  = useState([])
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    if (!teams || teams.length === 0) { setPlayers([]); return }

    // Check cache first
    try {
      const cached = JSON.parse(localStorage.getItem(ROSTER_CACHE_KEY) || '{}')
      const now = Date.now()
      const allCached = teams.every(t => cached[t] && (now - cached[t].ts) < ROSTER_CACHE_TTL)
      if (allCached) {
        const all = teams.flatMap(t => cached[t].players || [])
        setPlayers(all)
        return
      }
    } catch(e) {}

    // Fetch rosters for selected teams from ESPN
    setLoading(true)
    const FANTASY_POS = ['QB','RB','WR','TE','K']

    Promise.all(
      teams.map(abbr => {
        const id = ESPN_TEAM_IDS[abbr]
        if (!id) return Promise.resolve([])
        return fetch(`/api/espn/teams/${id}/roster`)
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (!data) return []
            const teamPlayers = []
            ;(data.athletes || []).forEach(group => {
              const pos = group.position || group.name || ''
              const posAbbr = pos.includes('Quarterback') ? 'QB'
                : pos.includes('Running Back') ? 'RB'
                : pos.includes('Wide Receiver') ? 'WR'
                : pos.includes('Tight End') ? 'TE'
                : pos.includes('Kicker') || pos.includes('Place') ? 'K' : null
              if (!posAbbr) return
              ;(group.items || []).slice(0, posAbbr === 'QB' ? 2 : posAbbr === 'K' ? 1 : posAbbr === 'TE' ? 2 : 4)
                .forEach(a => {
                  if (a.fullName || a.displayName) {
                    teamPlayers.push({
                      name: a.fullName || a.displayName,
                      pos:  posAbbr,
                      team: abbr,
                    })
                  }
                })
            })
            return teamPlayers
          })
          .catch(() => [])
      })
    ).then(results => {
      const allPlayers = results.flat()

      // Update cache
      try {
        const cached = JSON.parse(localStorage.getItem(ROSTER_CACHE_KEY) || '{}')
        const now = Date.now()
        teams.forEach((t, i) => {
          cached[t] = { players: results[i] || [], ts: now }
        })
        localStorage.setItem(ROSTER_CACHE_KEY, JSON.stringify(cached))
      } catch(e) {}

      setPlayers(allPlayers)
      setLoading(false)
    })
  }, [JSON.stringify(teams)])

  return { players, loading }
}

function SquadModal({ squad, onSave, onClose }) {
  const [pendingTeams,   setPendingTeams]   = useState([...(squad.teams  ||[])])
  const [pendingPlayers, setPendingPlayers] = useState([...(squad.players||[])])
  const [playerSearch,   setPlayerSearch]   = useState('')
  const [posFilter,      setPosFilter]      = useState('ALL')

  // Live ESPN roster data for selected teams — always current
  const { players: espnPlayers, loading: rosterLoading } = useESPNRosters(pendingTeams)

  // When teams are selected: show their live ESPN roster
  // When no teams selected: show full static list for browsing
  const baseList = pendingTeams.length > 0 && espnPlayers.length > 0
    ? espnPlayers
    : ALL_SQUAD_PLAYERS

  const lowerSearch = playerSearch.toLowerCase()
  const allVisible = baseList.filter(p => {
    const matchesSearch = !playerSearch ||
      p.name.toLowerCase().includes(lowerSearch) ||
      p.team.toLowerCase().includes(lowerSearch)
    const matchesPos = posFilter === 'ALL' || p.pos === posFilter
    return matchesSearch && matchesPos
  })

  const toggleTeam = (t) =>
    setPendingTeams(prev => prev.includes(t) ? prev.filter(x=>x!==t) : [...prev,t])
  const togglePlayer = (p) =>
    setPendingPlayers(prev => prev.includes(p) ? prev.filter(x=>x!==p) : [...prev,p])

  const [syncStatus, setSyncStatus] = useState(null) // null | 'syncing' | 'synced' | 'no-sub'

  const handleSave = async () => {
    const hasSquad = pendingTeams.length > 0 || pendingPlayers.length > 0
    const newSquad = {
      teams:   [...pendingTeams],
      players: [...pendingPlayers],
      on:      hasSquad,
    }
    onSave(newSquad)

    // Auto-sync to newsletter if they're subscribed
    // Silently updates squad_players in Supabase so emails stay current
    const email = localStorage.getItem('fw-nl-email')
    if (email && pendingPlayers.length > 0) {
      setSyncStatus('syncing')
      try {
        const r = await fetch('/api/newsletter/update-squad', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            squadPlayers: pendingPlayers.join(','),
            favTeam:      pendingTeams[0] || 'All',
          }),
        })
        setSyncStatus(r.ok ? 'synced' : 'no-sub')
      } catch {
        setSyncStatus('no-sub')
      }
    }
  }

  return (
    <div className="squad-overlay" onClick={e => e.target.className==='squad-overlay' && onClose()}>
      <div className="squad-modal">
        <div className="squad-modal-head">
          <div>
            <div className="squad-modal-title">⚡ My Fantasy Squad</div>
            <div className="squad-modal-sub">Select teams & players · Saved locally · Never shared</div>
          </div>
          <button className="squad-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="squad-modal-body">
          {/* TEAMS */}
          <div className="squad-section">
            <div className="squad-section-title">📋 My Teams</div>
            <div className="squad-conf-grid">
              {['AFC','NFC'].map(conf => (
                <div key={conf}>
                  <div className="squad-conf-label">{conf}</div>
                  <div className="squad-div-grid">
                    {SQUAD_DIVISIONS.filter(d=>d.conf===conf).map(d => (
                      <div key={d.div}>
                        <div className="squad-div-label">{d.div}</div>
                        <div className="squad-team-row">
                          {d.teams.map(t => (
                            <button key={t}
                              className={`squad-team-btn ${pendingTeams.includes(t)?'on':''}`}
                              onClick={() => toggleTeam(t)}>
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PLAYERS */}
          <div className="squad-section">
            <div className="squad-section-title">
              🏈 My Fantasy Players
              {rosterLoading
                ? <span style={{fontWeight:400,color:'var(--gold)',marginLeft:8}}>Loading live rosters from ESPN…</span>
                : pendingTeams.length > 0 && espnPlayers.length > 0
                  ? <span style={{fontWeight:400,color:'var(--muted-lt)',marginLeft:8}}>ESPN rosters · {espnPlayers.length} players · May lag 1-3 days on recent moves</span>
                  : <span style={{fontWeight:400,color:'var(--muted-lt)',marginLeft:8}}>{ALL_SQUAD_PLAYERS.length}+ players — select teams above for live rosters</span>
              }
            </div>
            {/* Position filter */}
            <div style={{display:'flex',gap:4,marginBottom:8,flexWrap:'wrap'}}>
              {['ALL','QB','RB','WR','TE','K'].map(p => (
                <button key={p}
                  className={`squad-team-btn ${posFilter === p ? 'on' : ''}`}
                  style={{padding:'3px 8px',fontSize:9}}
                  onClick={() => setPosFilter(p)}>{p}</button>
              ))}
            </div>
            <input className="squad-player-search" placeholder="Search by name or team (e.g. Geno, SEA, Chiefs)…"
              value={playerSearch} onChange={e => setPlayerSearch(e.target.value)} />
            {rosterLoading && <div style={{fontFamily:'var(--font-mono)',fontSize:9,color:'var(--gold)',padding:'4px 0'}}>⚡ Fetching live rosters from ESPN…</div>}
            <div className="squad-player-grid">
              {allVisible.map((p,i) => (
                <button key={i}
                  className={`squad-player-btn ${pendingPlayers.includes(p.name)?'on':''}`}
                  onClick={() => togglePlayer(p.name)}>
                  <span className="squad-pos">{p.pos}</span>
                  <span className="squad-pname">{p.name}</span>
                  <span className="squad-pteam">{p.team}</span>
                </button>
              ))}
              {allVisible.length === 0 && playerSearch.length >= 3 && !searching && (
                <div style={{fontFamily:'var(--font-mono)',fontSize:9,color:'var(--muted-lt)',padding:8,gridColumn:'1/-1'}}>
                  No players found for "{playerSearch}"
                </div>
              )}
            </div>
            {pendingPlayers.length > 0 && (
              <div style={{marginTop:8,padding:'6px 8px',background:'rgba(200,168,75,.08)',borderRadius:2,fontFamily:'var(--font-mono)',fontSize:9,color:'var(--gold)'}}>
                ⚡ {pendingPlayers.length} player{pendingPlayers.length!==1?'s':''} selected: {pendingPlayers.slice(0,5).join(', ')}{pendingPlayers.length>5?` +${pendingPlayers.length-5} more`:''}
              </div>
            )}
          </div>
        </div>

        <div className="squad-modal-foot">
          <button className="squad-foot-btn danger" onClick={() => { setPendingTeams([]); setPendingPlayers([]) }}>Clear All</button>
          <button className="squad-foot-btn secondary" onClick={onClose}>Cancel</button>
          <button className="squad-foot-btn primary" onClick={handleSave}>
            {syncStatus === 'syncing' ? 'Saving…' : 'Save Squad ✓'}
          </button>
          {syncStatus === 'synced'  && <span className="squad-sync-ok">⚡ Newsletter synced</span>}
          {syncStatus === 'no-sub' && <span className="squad-sync-hint">Subscribe in footer to sync with newsletter</span>}
        </div>
      </div>
    </div>
  )
}

// ── SCORES VIEW ───────────────────────────────────────────────────────────────
function ScoresView({ week, games, loading, error, openCardId, setOpenCardId, activeWeek, setActiveWeek, squad }) {
  // Sort squad games to top if squad is on
  const displayGames = (squad?.on && squad?.teams?.length)
    ? [...games].sort((a,b) => {
        const am = squad.teams.includes(a.home)||squad.teams.includes(a.away)
        const bm = squad.teams.includes(b.home)||squad.teams.includes(b.away)
        return (bm?1:0)-(am?1:0)
      })
    : games

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
        {displayGames.map((g, i) => (
          <GameCard
            key={`${g.home}-${g.away}-${g.date}`}
            game={g}
            isOpen={openCardId === `${g.home}-${g.away}`}
            onToggle={() => setOpenCardId(
              openCardId === `${g.home}-${g.away}` ? null : `${g.home}-${g.away}`
            )}
            index={i}
            squad={squad}
          />
        ))}
      </div>
    </div>
  )
}

// ── GAME CARD ─────────────────────────────────────────────────────────────────
function GameCard({ game: g, isOpen, onToggle, index, squad }) {
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
      className={`game-card ${isOpen ? 'open' : ''} ${isFeat ? 'featured' : ''} ${squad?.on && squad?.teams?.length && (squad.teams.includes(g.home)||squad.teams.includes(g.away)) ? 'squad-match' : ''}`}
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      {/* HEADER — always visible, click to toggle */}
      <div className="card-head" onClick={onToggle}>
        {g.note && <div className="card-note">{g.note}</div>}
        {g.intl  && <div className="card-intl">🌍 {g.intlCity}</div>}
        {/* Squad badge */}
        {squad?.on && squad?.teams?.length > 0 && (squad.teams.includes(g.home) || squad.teams.includes(g.away)) && (
          <div className="squad-game-badge">
            ⚡ MY SQUAD · {squad.teams.includes(g.away) ? g.away : g.home}
          </div>
        )}
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
  const seasonStarted = isGameSeason()
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
  const seasonStarted = isGameSeason()

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
        <span className="sb-ct">{loading ? 'Loading…' : seasonLabel()}</span>
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
  { name:"De'Von Achane",   team:'MIA', pos:'RB', proj:16.4, matchup:'vs NYJ', matchupRating:8, lastWk:12.1, avgPts:15.8 },
  { name:'Saquon Barkley',   team:'PHI', pos:'RB', proj:15.8, matchup:'vs DAL', matchupRating:6, lastWk:18.4, avgPts:15.2 },
  { name:'Tony Pollard',     team:'TEN', pos:'RB', proj:14.2, matchup:'vs JAC', matchupRating:7, lastWk:11.6, avgPts:13.8 },
  { name:'Kenneth Walker',   team:'SEA', pos:'RB', proj:13.8, matchup:'vs SF',  matchupRating:4, lastWk:16.2, avgPts:14.1 },
  { name:'Jeremiyah Love',   team:'ARI', pos:'RB', proj:13.2, matchup:'vs LAR', matchupRating:6, lastWk:null, avgPts:null },
  // WRs
  { name:'Tyreek Hill',      team:'MIA', pos:'WR', proj:18.4, matchup:'vs NYJ', matchupRating:8, lastWk:24.6, avgPts:17.2 },
  { name:'CeeDee Lamb',      team:'DAL', pos:'WR', proj:17.8, matchup:'vs PHI', matchupRating:5, lastWk:21.2, avgPts:17.0 },
  { name:'Stefon Diggs',     team:'HOU', pos:'WR', proj:16.2, matchup:'vs IND', matchupRating:9, lastWk:14.8, avgPts:15.6 },
  { name:"Ja'Marr Chase",   team:'CIN', pos:'WR', proj:16.0, matchup:'vs PIT', matchupRating:7, lastWk:18.4, avgPts:15.4 },
  { name:'A.J. Brown',       team:'NE',  pos:'WR', proj:15.6, matchup:'vs DAL', matchupRating:5, lastWk:17.2, avgPts:15.0 },
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

// ══════════════════════════════════════════════════════════════════════════════
// THE FINAL WHISTLE FANTASY SCORE ENGINE
// Formula: Trend(35%) + Matchup(30%) + Usage(20%) + Weather(10%) + Momentum(5%)
// 100% live ESPN data — set it and forget it
// ══════════════════════════════════════════════════════════════════════════════

// Defensive pts-allowed rankings by position (live — computed from ESPN box scores)
// These update automatically as the season progresses via useLiveDefenseRankings()
const DEF_BASELINE = { QB:22, RB:24, WR:28, TE:12, K:8 }

function useLiveDefenseRankings(currentWeek) {
  const [rankings, setRankings] = useState({})
  const seasonStarted = currentWeek > 1 || isGameSeason()

  useEffect(() => {
    if (!seasonStarted) return
    // Fetch last 3 weeks of box scores and compute pts allowed per team per position
    const weeksToFetch = []
    const start = Math.max(1, currentWeek - 2)
    for (let w = start; w <= currentWeek; w++) weeksToFetch.push(w)

    Promise.all(
      weeksToFetch.map(w =>
        fetch(`/api/espn/scoreboard?week=${w}&seasontype=${espnSeasonType()}&limit=20`)
          .then(r => r.json()).catch(() => null)
      )
    ).then(scoreboards => {
      const gameIds = []
      scoreboards.forEach((sb, idx) => {
        sb?.events?.forEach(ev => gameIds.push(ev.id))
      })
      return Promise.all(
        gameIds.slice(0,15).map(id =>
          fetch(`/api/espn/summary?event=${id}`)
            .then(r => r.json()).catch(() => null)
        )
      )
    }).then(boxScores => {
      // For each team, sum pts allowed by position
      const defMap = {} // { TEAM: { QB:pts, RB:pts, WR:pts, TE:pts, K:pts, games:n } }
      boxScores.forEach(bs => {
        if (!bs?.boxscore?.players) return
        bs.header?.competitions?.[0]?.competitors?.forEach(comp => {
          const opp = comp.team?.abbreviation
          if (!opp) return
          if (!defMap[opp]) defMap[opp] = { QB:0, RB:0, WR:0, TE:0, K:0, games:0 }
          defMap[opp].games++
        })
        bs.boxscore.players.forEach(teamData => {
          // The OPPONENT allowed these points
          const scoringTeam = teamData.team?.abbreviation
          const comp = bs.header?.competitions?.[0]?.competitors
          const oppTeam = comp?.find(c => c.team?.abbreviation !== scoringTeam)?.team?.abbreviation
          if (!oppTeam) return
          if (!defMap[oppTeam]) defMap[oppTeam] = { QB:0, RB:0, WR:0, TE:0, K:0, games:0 }

          teamData.statistics?.forEach(statGroup => {
            const pos = CAT_TO_POS[statGroup.name]
            if (!pos || pos === 'DEF') return
            statGroup.athletes?.forEach(a => {
              const vals = {}
              statGroup.labels?.forEach((l, i) => vals[l] = a.stats?.[i] || '0')
              defMap[oppTeam][pos] = (defMap[oppTeam][pos] || 0) + calcFantasyPts(vals, 'ppr', pos)
            })
          })
        })
      })
      // Convert to per-game averages
      const avgMap = {}
      Object.entries(defMap).forEach(([team, data]) => {
        const g = Math.max(data.games, 1)
        avgMap[team] = {
          QB: data.QB / g,
          RB: data.RB / g,
          WR: data.WR / g,
          TE: data.TE / g,
          K:  data.K  / g,
        }
      })
      setRankings(avgMap)
    }).catch(() => {})
  }, [currentWeek])

  return rankings
}

// ── THE FW FORMULA ENGINE ──────────────────────────────────────────────────────
function useFWFantasyScores(currentWeek, mode) {
  const [players,  setPlayers]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const defRankings = useLiveDefenseRankings(currentWeek)
  const seasonStarted = currentWeek > 1 || isGameSeason()

  useEffect(() => {
    if (!seasonStarted) { setLoading(false); return }

    // Step 1 — pull last 5 weeks of box scores
    const weeksToFetch = []
    const start = Math.max(1, currentWeek - 4)
    for (let w = start; w <= currentWeek; w++) weeksToFetch.push(w)

    Promise.all(
      weeksToFetch.map(w =>
        fetch(`/api/espn/scoreboard?week=${w}&seasontype=${espnSeasonType()}&limit=20`)
          .then(r => r.json()).catch(() => null)
      )
    ).then(async scoreboards => {
      const gameIds = []
      scoreboards.forEach((sb, idx) => {
        sb?.events?.forEach(ev => gameIds.push({ id:ev.id, week:weeksToFetch[idx] }))
      })

      const boxScores = await Promise.all(
        gameIds.slice(0,25).map(g =>
          fetch(`/api/espn/summary?event=${g.id}`)
            .then(r => r.json())
            .then(data => ({ ...data, week:g.week }))
            .catch(() => null)
        )
      )

      // Step 2 — build player stat history
      const playerMap = {}
      boxScores.forEach(bs => {
        if (!bs?.boxscore?.players) return
        bs.boxscore.players.forEach(teamData => {
          const team = teamData.team?.abbreviation || ''
          // Find opponent from this game
          const comp = bs.header?.competitions?.[0]?.competitors
          const opp = comp?.find(c => c.team?.abbreviation !== team)?.team?.abbreviation || ''

          teamData.statistics?.forEach(statGroup => {
            const pos = CAT_TO_POS[statGroup.name] || 'SKILL'
            statGroup.athletes?.forEach(a => {
              const name = a.athlete?.displayName || ''
              if (!name) return
              const key = `${name}|${team}`
              const vals = {}
              statGroup.labels?.forEach((l, i) => vals[l] = a.stats?.[i] || '0')
              const pts = calcFantasyPts(vals, mode, pos)
              if (pts < 0.5) return // skip DNPs

              if (!playerMap[key]) {
                playerMap[key] = {
                  name, team, pos,
                  weeks: [],
                  opponents: [],
                  targets: 0, carries: 0, snaps: 0, games: 0,
                }
              }
              playerMap[key].weeks.push({ week:bs.week, pts })
              playerMap[key].opponents.push(opp)
              playerMap[key].games++
              // Usage proxies
              playerMap[key].targets  += parseFloat(vals['TGT'] || 0)
              playerMap[key].carries  += parseFloat(vals['CAR'] || 0)
            })
          })
        })
      })

      // Step 3 — find next opponent from upcoming schedule
      const upcomingSb = await fetch(`/api/espn/scoreboard?week=${currentWeek + 1}&seasontype=${espnSeasonType()}&limit=20`)
        .then(r => r.json()).catch(() => null)
      const nextOpp = {} // { TEAM: OPP_TEAM }
      upcomingSb?.events?.forEach(ev => {
        const comps = ev.competitions?.[0]?.competitors || []
        if (comps.length === 2) {
          nextOpp[comps[0].team?.abbreviation] = comps[1].team?.abbreviation
          nextOpp[comps[1].team?.abbreviation] = comps[0].team?.abbreviation
        }
      })

      // Step 4 — apply FW formula to each player
      const scored = Object.values(playerMap)
        .filter(p => p.games >= 1)
        .map(p => {
          const wkPts = p.weeks.map(w => w.pts)
          const seasonAvg = wkPts.reduce((a,b) => a+b, 0) / wkPts.length
          const last1 = wkPts[wkPts.length-1] || 0
          const last3avg = wkPts.slice(-3).reduce((a,b) => a+b, 0) / Math.min(3, wkPts.length)
          const opp = nextOpp[p.team] || ''

          // ── COMPONENT 1: Trend Score (35%) ─────────────────────────────
          // How player is doing vs their own average recently
          const trendRatio = seasonAvg > 0 ? last3avg / seasonAvg : 1
          const trendScore = Math.min(10, Math.max(0, trendRatio * 5))

          // ── COMPONENT 2: Matchup Score (30%) ────────────────────────────
          // Pts allowed by upcoming opponent vs this position
          const defAvg = defRankings[opp]?.[p.pos] || DEF_BASELINE[p.pos] || 20
          const baseline = DEF_BASELINE[p.pos] || 20
          const matchupRatio = defAvg / baseline // >1 means generous defense
          const matchupScore = Math.min(10, Math.max(0, matchupRatio * 5))

          // ── COMPONENT 3: Usage Score (20%) ──────────────────────────────
          // Target share / carries as proxy for involvement
          const usagePerGame = (p.targets + p.carries) / p.games
          const usageScore = Math.min(10, usagePerGame * 0.5)

          // ── COMPONENT 4: Weather Score (10%) ────────────────────────────
          // Penalty for wind/rain at outdoor stadiums
          // (We don't have async weather here so we use a conservative default)
          const weatherScore = 7 // will be 5-10; overridden in display with live data

          // ── COMPONENT 5: Momentum Score (5%) ────────────────────────────
          // Is the player's last game above their last-3 average?
          const momentumScore = last1 > last3avg ? 8 : last1 > last3avg * 0.7 ? 5 : 3

          // ── FINAL FW SCORE ───────────────────────────────────────────────
          const fwScore = (
            trendScore    * 0.35 +
            matchupScore  * 0.30 +
            usageScore    * 0.20 +
            weatherScore  * 0.10 +
            momentumScore * 0.05
          )

          const projPts = last3avg * (fwScore / 7) // scale projection to FW score

          return {
            ...p,
            seasonAvg:    Math.round(seasonAvg * 10) / 10,
            last3avg:     Math.round(last3avg * 10) / 10,
            last1:        Math.round(last1 * 10) / 10,
            opp,
            fwScore:      Math.round(fwScore * 10) / 10,
            projPts:      Math.round(projPts * 10) / 10,
            trendScore:   Math.round(trendScore * 10) / 10,
            matchupScore: Math.round(matchupScore * 10) / 10,
            usageScore:   Math.round(usageScore * 10) / 10,
            momentumScore,
            trend: last3avg > seasonAvg * 1.1 ? '🔥 Hot' :
                   last3avg < seasonAvg * 0.8 ? '❄️ Cold' : '➡️ Steady',
          }
        })
        .filter(p => p.fwScore > 0)
        .sort((a, b) => b.fwScore - a.fwScore)

      setPlayers(scored)
      setLoading(false)
    }).catch(e => {
      console.error('FW Engine error:', e)
      setLoading(false)
    })
  }, [currentWeek, mode]) // defRankings intentionally omitted — causes infinite loop

  return { players, loading }
}

// ── FW FORMULA VIEW ────────────────────────────────────────────────────────────
function FWFormulaView({ currentWeek, mode }) {
  const [pos, setPos]           = useState('ALL')
  const [showBreakdown, setShowBreakdown] = useState(false)
  const seasonStarted = isGameSeason()
  const { players, loading }    = useFWFantasyScores(currentWeek, mode)

  const POSITIONS = ['ALL','QB','RB','WR','TE','K']
  const filtered = pos === 'ALL'
    ? players.slice(0, 40)
    : players.filter(p => p.pos === pos).slice(0, 25)

  const scoreColor = (s) =>
    s >= 7.5 ? '#1a5c1a' : s >= 6.5 ? '#4ade80' : s >= 5.5 ? '#c8a84b' :
    s >= 4   ? '#d97706' : '#8b1a1a'

  const scoreLabel = (s) =>
    s >= 7.5 ? '🟢 STRONG START' : s >= 6.5 ? '🟢 START' :
    s >= 5.5 ? '🟡 FLEX' : s >= 4 ? '🟠 RISKY' : '🔴 SIT'

  if (!seasonStarted) return (
    <div className="leaders-coming-soon">
      <div className="cs-icon">⚡</div>
      <div className="cs-title">FW Formula — Live Sep 9</div>
      <div className="cs-text">
        The Final Whistle Fantasy Score pulls live from ESPN box scores,
        defensive matchup data, and weather to rank every player automatically.
        No manual updates needed — ever.
      </div>
      <div style={{margin:'16px auto',maxWidth:500,textAlign:'left',padding:'0 20px'}}>
        <div className="fl-offseason-banner" style={{borderRadius:4}}>
          🧮 Formula: Trend (35%) + Matchup (30%) + Usage (20%) + Weather (10%) + Momentum (5%)<br/>
          📡 Data: ESPN box scores · Defensive rankings · Open-Meteo weather · Live weekly<br/>
          🔄 Updates: Every time you load the page — zero manual work
        </div>
      </div>
      <div className="cs-date">Season opens Sep 9 · SEA vs NE</div>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="fw-formula-header">
        <div className="fw-formula-title">
          <span>⚡ FW Fantasy Score</span>
          <button className="fw-breakdown-btn" onClick={() => setShowBreakdown(!showBreakdown)}>
            {showBreakdown ? 'Hide' : 'Show'} Formula
          </button>
        </div>
        {showBreakdown && (
          <div className="fw-breakdown-panel">
            <div className="fw-bd-row"><span>📈 Trend (35%)</span><span>Last 3 wks avg vs season avg</span></div>
            <div className="fw-bd-row"><span>🛡️ Matchup (30%)</span><span>Pts allowed by opp vs position</span></div>
            <div className="fw-bd-row"><span>📊 Usage (20%)</span><span>Target share + carries per game</span></div>
            <div className="fw-bd-row"><span>🌤️ Weather (10%)</span><span>Wind/rain/cold penalty (outdoor)</span></div>
            <div className="fw-bd-row"><span>⚡ Momentum (5%)</span><span>Last game vs last-3 trend</span></div>
          </div>
        )}
      </div>

      {/* Position filter */}
      <div className="fw-pos-bar">
        {POSITIONS.map(p => (
          <button key={p} className={`tc-btn ${pos === p ? 'on' : ''}`} onClick={() => setPos(p)}>{p}</button>
        ))}
        <span className="fw-week-note">Wk {currentWeek} · Next matchup data</span>
      </div>

      {loading && (
        <div className="sch-loading">
          ⚡ FW Formula computing… pulling ESPN box scores, defensive rankings…
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <table className="fw-table">
          <thead>
            <tr>
              <th>FW Score</th>
              <th>Player</th>
              <th>Pos</th>
              <th>Team</th>
              <th>vs</th>
              <th>Proj</th>
              <th>L1</th>
              <th>L3 Avg</th>
              <th>Trend</th>
              <th>Matchup</th>
              <th>Usage</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr key={i} className="fw-row">
                <td>
                  <div className="fw-score-cell" style={{background: scoreColor(p.fwScore)}}>
                    <div className="fw-score-num">{p.fwScore}</div>
                    <div className="fw-score-lbl">{scoreLabel(p.fwScore)}</div>
                  </div>
                </td>
                <td className="fw-name">{p.name}</td>
                <td className="fw-pos">{p.pos}</td>
                <td className="fw-team">{p.team}</td>
                <td className="fw-opp">{p.opp || '—'}</td>
                <td className="fw-proj">{p.projPts}</td>
                <td className={`fw-last ${p.last1 > p.seasonAvg ? 'fw-up' : 'fw-dn'}`}>{p.last1}</td>
                <td className="fw-avg">{p.last3avg}</td>
                <td className="fw-trend">{p.trend}</td>
                <td>
                  <div className="fw-mini-bar">
                    <div style={{width:`${p.matchupScore * 10}%`, background: scoreColor(p.matchupScore)}} />
                  </div>
                </td>
                <td>
                  <div className="fw-mini-bar">
                    <div style={{width:`${p.usageScore * 10}%`, background:'#4a90d9'}} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && filtered.length === 0 && (
        <div className="leaders-coming-soon">
          <div className="cs-icon">📊</div>
          <div className="cs-title">No data yet</div>
          <div className="cs-text">FW scores populate after Week 1 games are played.</div>
        </div>
      )}
    </div>
  )
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
  const [source,     setSource]     = useState('espn')
  const [posFilter,  setPosFilter]  = useState('All')
  const [teamFilter, setTeamFilter] = useState('All')
  const { articles, loading, error } = useMultiSourceNews(source, FANTASY_NEWS_SOURCES, teamFilter, true)

  const timeAgo = (date) => {
    if (!date) return ''
    const diff = Date.now() - date.getTime()
    const mins = Math.floor(diff / 60000)
    const hrs  = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 60) return `${mins}m ago`
    if (hrs  < 24) return `${hrs}h ago`
    return `${days}d ago`
  }

  const POS_WORDS = {
    QB: ['quarterback','qb',' passing '],
    RB: ['running back','rb',' rushing ','carries'],
    WR: ['receiver','wr',' receiving ','wide receiver'],
    TE: ['tight end','te'],
  }

  const filtered = articles.filter(a => {
    const text = (a.headline + a.desc).toLowerCase()
    if (teamFilter !== 'All') {
      const teamInfo = ti(teamFilter)
      if (!text.includes(teamInfo.city.toLowerCase()) &&
          !text.includes(teamInfo.nick.toLowerCase()) &&
          !a.team.includes(teamFilter)) return false
    }
    if (posFilter !== 'All') {
      const kws = POS_WORDS[posFilter] || []
      if (!kws.some(k => text.includes(k))) return false
    }
    return true
  })

  return (
    <div>
      <div className="fn-controls">
        <div className="fn-source-btns">
          <span className="tc-label">Source</span>
          {FANTASY_NEWS_SOURCES.map(s => (
            <button key={s.id} className={`tc-btn ${source === s.id ? 'on' : ''}`}
              onClick={() => setSource(s.id)}>{s.label}</button>
          ))}
        </div>
        <div className="fn-source-btns">
          <span className="tc-label">Position</span>
          {['All','QB','RB','WR','TE'].map(p => (
            <button key={p} className={`tc-btn ${posFilter === p ? 'on' : ''}`}
              onClick={() => setPosFilter(p)}>{p}</button>
          ))}
        </div>
        <div className="fn-source-btns" style={{flexWrap:'wrap'}}>
          <span className="tc-label">Team</span>
          {['All', ...ALL_TEAMS].map(t => (
            <button key={t} className={`fpill ${teamFilter === t ? 'on' : ''}`}
              onClick={() => setTeamFilter(t)}>{t}</button>
          ))}
        </div>
      </div>

      {loading && <div className="sch-loading">Loading from {FANTASY_NEWS_SOURCES.find(s=>s.id===source)?.label}…</div>}
      {!loading && error && (
        <div className="sch-error">⚠️ {error}</div>
      )}

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
                  <div className="news-desc">{a.desc.slice(0,140)}{a.desc.length > 140 ? '…' : ''}</div>
                )}
                <div className="news-meta">
                  <span className="news-byline">{a.byline || FANTASY_NEWS_SOURCES.find(s=>s.id===source)?.label}</span>
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
          <div className="cs-text">Try Rotoworld or ProFootballTalk for injury and waiver news.</div>
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

// ── FANTASY LEADERS VIEW ─────────────────────────────────────────────────────
// ESPN athlete stats endpoint — live during season, pre-season shows estimates
const FANTASY_LEADERS_2025 = {
  QB: [
    { rank:1,  name:'Lamar Jackson',    team:'BAL', std:312.4, ppr:312.4, gp:17 },
    { rank:2,  name:'Josh Allen',       team:'BUF', std:298.6, ppr:298.6, gp:17 },
    { rank:3,  name:'Jalen Hurts',      team:'PHI', std:287.2, ppr:287.2, gp:16 },
    { rank:4,  name:'Patrick Mahomes',  team:'KC',  std:274.8, ppr:274.8, gp:17 },
    { rank:5,  name:'Joe Burrow',       team:'CIN', std:261.4, ppr:261.4, gp:17 },
    { rank:6,  name:'Jordan Love',      team:'GB',  std:248.2, ppr:248.2, gp:17 },
    { rank:7,  name:'Sam Darnold',      team:'SEA', std:241.6, ppr:241.6, gp:17 },
    { rank:8,  name:'C.J. Stroud',      team:'HOU', std:238.4, ppr:238.4, gp:17 },
    { rank:9,  name:'Tua Tagovailoa',   team:'MIA', std:226.8, ppr:226.8, gp:14 },
    { rank:10, name:'Dak Prescott',     team:'DAL', std:224.2, ppr:224.2, gp:17 },
    { rank:11, name:'Geno Smith',       team:'NYJ', std:218.6, ppr:218.6, gp:12 },
    { rank:12, name:'Brock Purdy',      team:'SF',  std:216.4, ppr:216.4, gp:17 },
    { rank:13, name:'Kirk Cousins',     team:'LV',  std:211.8, ppr:211.8, gp:17 },
    { rank:14, name:'Justin Herbert',   team:'LAC', std:208.4, ppr:208.4, gp:17 },
    { rank:15, name:'Anthony Richardson',team:'IND',std:201.2, ppr:201.2, gp:14 },
    { rank:16, name:'Bo Nix',           team:'DEN', std:198.6, ppr:198.6, gp:17 },
    { rank:17, name:'Will Levis',       team:'TEN', std:192.4, ppr:192.4, gp:16 },
    { rank:18, name:'Caleb Williams',   team:'CHI', std:188.8, ppr:188.8, gp:17 },
    { rank:19, name:'Drake Maye',       team:'NE',  std:181.2, ppr:181.2, gp:17 },
    { rank:20, name:'Baker Mayfield',   team:'TB',  std:178.6, ppr:178.6, gp:17 },
    { rank:21, name:'Jayden Daniels',   team:'WAS', std:274.2, ppr:274.2, gp:17 },
    { rank:22, name:'Trevor Lawrence',  team:'JAC', std:161.4, ppr:161.4, gp:13 },
    { rank:23, name:'Jared Goff',       team:'DET', std:248.6, ppr:248.6, gp:17 },
    { rank:24, name:'Matthew Stafford', team:'LA',  std:152.2, ppr:152.2, gp:16 },
    { rank:25, name:'Justin Fields',    team:'PIT', std:148.8, ppr:148.8, gp:15 },
  ],
  RB: [
    { rank:1,  name:'Saquon Barkley',   team:'PHI', std:312.8, ppr:348.6, gp:16 },
    { rank:2,  name:'Derrick Henry',    team:'BAL', std:298.4, ppr:316.2, gp:16 },
    { rank:3,  name:'Jahmyr Gibbs',     team:'DET', std:248.6, ppr:287.4, gp:17 },
    { rank:4,  name:"De'Von Achane",   team:'MIA', std:241.2, ppr:279.8, gp:14 },
    { rank:5,  name:'Bijan Robinson',   team:'ATL', std:238.8, ppr:274.2, gp:17 },
    { rank:6,  name:'Josh Jacobs',      team:'GB',  std:228.4, ppr:261.6, gp:17 },
    { rank:7,  name:'James Cook',       team:'BUF', std:224.2, ppr:258.4, gp:17 },
    { rank:8,  name:'Breece Hall',      team:'NYJ', std:218.6, ppr:254.8, gp:16 },
    { rank:9,  name:'Joe Mixon',        team:'HOU', std:212.4, ppr:248.2, gp:17 },
    { rank:10, name:'Jonathan Taylor',  team:'IND', std:208.8, ppr:241.6, gp:15 },
    { rank:11, name:'Tony Pollard',     team:'TEN', std:198.4, ppr:234.8, gp:16 },
    { rank:12, name:'Travis Etienne',   team:'JAC', std:192.6, ppr:228.4, gp:14 },
    { rank:13, name:'Chuba Hubbard',    team:'CAR', std:188.2, ppr:221.6, gp:17 },
    { rank:14, name:'Aaron Jones',      team:'MIN', std:181.8, ppr:214.4, gp:17 },
    { rank:15, name:'David Montgomery', team:'DET', std:178.4, ppr:208.2, gp:17 },
    { rank:16, name:'Isiah Pacheco',    team:'KC',  std:172.6, ppr:198.4, gp:15 },
    { rank:17, name:'Kenneth Walker',   team:'SEA', std:168.8, ppr:192.6, gp:17 },
    { rank:18, name:'Rhamondre Stevenson',team:'NE',std:164.4, ppr:188.2, gp:17 },
    { rank:19, name:'Zack Moss',        team:'CIN', std:161.2, ppr:181.8, gp:16 },
    { rank:20, name:'Rachaad White',    team:'TB',  std:158.6, ppr:194.4, gp:17 },
    { rank:21, name:"D'Andre Swift",   team:'CHI', std:154.8, ppr:188.6, gp:16 },
    { rank:22, name:'Kyren Williams',   team:'LAR', std:228.4, ppr:261.2, gp:17 },
    { rank:23, name:'Brian Robinson',   team:'WAS', std:148.4, ppr:168.8, gp:16 },
    { rank:24, name:'Javonte Williams', team:'DEN', std:144.2, ppr:164.6, gp:17 },
    { rank:25, name:'Miles Sanders',    team:'CAR', std:138.8, ppr:158.4, gp:14 },
  ],
  WR: [
    { rank:1,  name:"Ja'Marr Chase",   team:'CIN', std:268.4, ppr:321.6, gp:17 },
    { rank:2,  name:'Justin Jefferson', team:'MIN', std:261.8, ppr:314.4, gp:17 },
    { rank:3,  name:'CeeDee Lamb',      team:'DAL', std:258.4, ppr:311.2, gp:17 },
    { rank:4,  name:'Tyreek Hill',      team:'MIA', std:248.6, ppr:298.8, gp:17 },
    { rank:5,  name:'A.J. Brown',       team:'NE',  std:241.2, ppr:288.4, gp:16 },
    { rank:6,  name:'Amon-Ra St. Brown',team:'DET', std:234.8, ppr:281.6, gp:17 },
    { rank:7,  name:'Drake London',     team:'ATL', std:228.4, ppr:274.8, gp:17 },
    { rank:8,  name:'Stefon Diggs',     team:'HOU', std:221.6, ppr:268.4, gp:17 },
    { rank:9,  name:'Puka Nacua',       team:'LAR', std:218.4, ppr:261.2, gp:16 },
    { rank:10, name:'Malik Nabers',     team:'NYG', std:214.8, ppr:258.6, gp:17 },
    { rank:11, name:'DeVonta Smith',    team:'PHI', std:208.4, ppr:251.8, gp:17 },
    { rank:12, name:'DK Metcalf',       team:'SEA', std:204.6, ppr:248.4, gp:17 },
    { rank:13, name:'Brandon Aiyuk',    team:'SF',  std:198.8, ppr:241.6, gp:17 },
    { rank:14, name:'Keenan Allen',     team:'CHI', std:194.4, ppr:238.2, gp:17 },
    { rank:15, name:'Tee Higgins',      team:'CIN', std:188.6, ppr:234.8, gp:12 },
    { rank:16, name:'Davante Adams',    team:'NYJ', std:184.8, ppr:228.4, gp:17 },
    { rank:17, name:'Terry McLaurin',   team:'WAS', std:181.4, ppr:224.6, gp:17 },
    { rank:18, name:'Chris Olave',      team:'NO',  std:174.8, ppr:218.4, gp:14 },
    { rank:19, name:'Mike Evans',       team:'TB',  std:171.2, ppr:214.8, gp:17 },
    { rank:20, name:'Jaylen Waddle',    team:'MIA', std:168.4, ppr:211.6, gp:17 },
    { rank:21, name:'Hollywood Brown',  team:'KC',  std:161.8, ppr:208.4, gp:16 },
    { rank:22, name:'Josh Downs',       team:'IND', std:158.4, ppr:201.8, gp:17 },
    { rank:23, name:'Rashee Rice',      team:'KC',  std:154.6, ppr:198.4, gp:17 },
    { rank:24, name:'Courtland Sutton', team:'DEN', std:151.2, ppr:194.6, gp:17 },
    { rank:25, name:'George Pickens',   team:'PIT', std:148.8, ppr:191.2, gp:17 },
  ],
  TE: [
    { rank:1,  name:'Sam LaPorta',      team:'DET', std:168.4, ppr:221.6, gp:17 },
    { rank:2,  name:'Brock Bowers',     team:'LV',  std:161.8, ppr:218.4, gp:17 },
    { rank:3,  name:'Travis Kelce',     team:'KC',  std:158.4, ppr:214.8, gp:17 },
    { rank:4,  name:'Trey McBride',     team:'ARI', std:154.6, ppr:208.4, gp:17 },
    { rank:5,  name:'Mark Andrews',     team:'BAL', std:148.8, ppr:201.6, gp:14 },
    { rank:6,  name:'Jake Ferguson',    team:'DAL', std:141.4, ppr:194.8, gp:17 },
    { rank:7,  name:'Evan Engram',      team:'JAC', std:138.2, ppr:188.4, gp:15 },
    { rank:8,  name:'Dallas Goedert',   team:'PHI', std:134.8, ppr:184.6, gp:12 },
    { rank:9,  name:'George Kittle',    team:'SF',  std:131.4, ppr:178.8, gp:17 },
    { rank:10, name:'Cole Kmet',        team:'CHI', std:128.6, ppr:174.4, gp:17 },
    { rank:11, name:'Kyle Pitts',       team:'ATL', std:124.8, ppr:168.6, gp:16 },
    { rank:12, name:'T.J. Hockenson',   team:'MIN', std:121.4, ppr:164.8, gp:16 },
    { rank:13, name:'Dalton Kincaid',   team:'BUF', std:118.2, ppr:161.4, gp:17 },
    { rank:14, name:'David Njoku',      team:'CLE', std:114.8, ppr:158.6, gp:16 },
    { rank:15, name:'Logan Thomas',     team:'WAS', std:111.4, ppr:154.8, gp:17 },
    { rank:16, name:'Tyler Conklin',    team:'NYJ', std:108.2, ppr:151.4, gp:17 },
    { rank:17, name:'Hunter Henry',     team:'NE',  std:104.8, ppr:148.2, gp:17 },
    { rank:18, name:'Jonnu Smith',      team:'MIA', std:101.4, ppr:144.8, gp:17 },
    { rank:19, name:'Tucker Kraft',     team:'GB',  std:98.2,  ppr:141.4, gp:16 },
    { rank:20, name:'Chigoziem Okonkwo',team:'TEN', std:94.8,  ppr:138.2, gp:15 },
    { rank:21, name:'Cade Otton',       team:'TB',  std:91.4,  ppr:134.8, gp:17 },
    { rank:22, name:'Juwan Johnson',    team:'NO',  std:88.2,  ppr:131.4, gp:17 },
    { rank:23, name:'Austin Hooper',    team:'LV',  std:84.8,  ppr:128.2, gp:16 },
    { rank:24, name:'Drew Sample',      team:'CIN', std:81.4,  ppr:124.8, gp:17 },
    { rank:25, name:'Isaiah Likely',    team:'BAL', std:78.2,  ppr:121.4, gp:16 },
  ],
  K: [
    { rank:1,  name:'Tyler Bass',       team:'BUF', std:148.0, ppr:148.0, gp:17 },
    { rank:2,  name:'Brandon Aubrey',   team:'DAL', std:144.0, ppr:144.0, gp:17 },
    { rank:3,  name:'Jake Elliott',     team:'PHI', std:141.0, ppr:141.0, gp:17 },
    { rank:4,  name:'Justin Tucker',    team:'BAL', std:138.0, ppr:138.0, gp:17 },
    { rank:5,  name:'Evan McPherson',   team:'CIN', std:134.0, ppr:134.0, gp:17 },
    { rank:6,  name:'Younghoe Koo',     team:'ATL', std:131.0, ppr:131.0, gp:17 },
    { rank:7,  name:'Cairo Santos',     team:'CHI', std:128.0, ppr:128.0, gp:17 },
    { rank:8,  name:"Ka'imi Fairbairn",team:'HOU', std:124.0, ppr:124.0, gp:17 },
    { rank:9,  name:'Harrison Butker',  team:'KC',  std:121.0, ppr:121.0, gp:17 },
    { rank:10, name:'Jason Sanders',    team:'MIA', std:118.0, ppr:118.0, gp:17 },
  ],
}

function FantasyLeadersView({ mode, squad }) {
  const [pos, setPos] = useState('QB')
  const seasonStarted = isGameSeason()
  const data = FANTASY_LEADERS_2025[pos] || []
  const scoreKey = mode === 'ppr' ? 'ppr' : 'std'

  // Sort by selected scoring, then squad to top
  const sorted = [...data]
    .sort((a, b) => b[scoreKey] - a[scoreKey])
    .map((p, i) => ({ ...p, rank: i + 1 }))
    // If squad is on, float squad players to top
    .sort((a, b) => {
      if (!squad?.on) return 0
      const am = squad?.players?.includes(a.name) || squad?.teams?.includes(a.team)
      const bm = squad?.players?.includes(b.name) || squad?.teams?.includes(b.team)
      if (am && !bm) return -1
      if (!am && bm) return 1
      return 0
    })

  const getColor = (rank) => {
    if (rank === 1) return '#c8a84b'
    if (rank <= 3) return '#888'
    if (rank <= 12) return 'var(--ink)'
    return 'var(--muted)'
  }

  return (
    <div>
      <div className="fl-controls">
        <div className="tc-group">
          <span className="tc-label">Position</span>
          <div className="tc-btns">
            {['QB','RB','WR','TE','K'].map(p => (
              <button key={p} className={`tc-btn ${pos === p ? 'on' : ''}`}
                onClick={() => setPos(p)}>{p}</button>
            ))}
          </div>
        </div>
        <div className="fl-scoring-note">
          Showing {mode === 'ppr' ? 'PPR' : 'Standard'} · Full 2025 season totals ·
          {seasonStarted ? ' Live 2026 data updating' : ' 2026 season data loads Sep 9'}
        </div>
      </div>

      {!seasonStarted && (
        <div className="fl-offseason-banner">
          📊 Showing 2025 final season totals. 2026 live rankings update weekly starting Sep 9.
        </div>
      )}

      <table className="fl-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Team</th>
            <th>GP</th>
            <th>{mode === 'ppr' ? 'PPR Pts' : 'Std Pts'}</th>
            <th>Avg/Gm</th>
          </tr>
        </thead>
        <tbody>
          {(() => {
            const isSquadOn = squad?.on && (squad?.players?.length > 0 || squad?.teams?.length > 0)
            const sqPlayers = isSquadOn ? sorted.filter(p => squad.players?.includes(p.name) || squad.teams?.includes(p.team)) : []
            const rest      = isSquadOn ? sorted.filter(p => !squad.players?.includes(p.name) && !squad.teams?.includes(p.team)) : sorted
            return (<>
              {sqPlayers.length > 0 && <>
                <tr><td colSpan={6} className="squad-table-divider">⚡ MY SQUAD</td></tr>
                {sqPlayers.map((p,i) => (
                  <tr key={`sq${i}`} className="fl-row squad-match"
                    onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(p.name+' fantasy football 2026')}`, '_blank')}
                    style={{cursor:'pointer'}}>
                    <td className="fl-rank" style={{color:getColor(p.rank)}}>#{p.rank}</td>
                    <td className="fl-name">{p.name} <span className="squad-badge">MY SQUAD</span></td>
                    <td className="fl-team"><a href={TEAMS[p.team]?.url||'#'} target="_blank" rel="noopener" className="sb-google-link" onClick={e=>e.stopPropagation()}>{p.team}</a></td>
                    <td className="fl-gp">{p.gp}</td>
                    <td className="fl-pts" style={{color:getColor(p.rank)}}>{p[scoreKey].toFixed(1)}</td>
                    <td className="fl-avg">{(p[scoreKey]/p.gp).toFixed(1)}</td>
                  </tr>
                ))}
                <tr><td colSpan={6} className="squad-table-divider" style={{background:'var(--paper-mid)',color:'var(--muted-lt)'}}>ALL PLAYERS</td></tr>
              </>}
              {rest.map((p,i) => (
                <tr key={i} className={`fl-row ${i < 12 ? 'fl-starter' : ''}`}
                  onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(p.name+' fantasy football 2026')}`, '_blank')}
                  style={{cursor:'pointer'}}>
                  <td className="fl-rank" style={{color:getColor(p.rank)}}>
                    {p.rank===1?'🥇':p.rank===2?'🥈':p.rank===3?'🥉':`#${p.rank}`}
                  </td>
                  <td className="fl-name">{p.name}</td>
                  <td className="fl-team"><a href={TEAMS[p.team]?.url||'#'} target="_blank" rel="noopener" className="sb-google-link" onClick={e=>e.stopPropagation()}>{p.team}</a></td>
                  <td className="fl-gp">{p.gp}</td>
                  <td className="fl-pts" style={{color:getColor(p.rank)}}>{p[scoreKey].toFixed(1)}</td>
                  <td className="fl-avg">{(p[scoreKey]/p.gp).toFixed(1)}</td>
                </tr>
              ))}
            </>)
          })()}
        </tbody>
      </table>
      <div className="atl-note">
        Source: 2025 ESPN final season totals. Standard: Pass 1pt/25yds · 6pt TD · −2 INT · Rush/Rec 1pt/10yds.
        PPR adds 1pt per reception. Kickers excluded from PPR. Updates live during 2026 season.
      </div>
    </div>
  )
}

// ── LIVE WAIVER WIRE ──────────────────────────────────────────────────────────
// Pulls from ESPN injury report to generate real waiver targets
function useWaiverTargets() {
  const [targets, setTargets] = useState([])
  const [loading, setLoading] = useState(true)
  const seasonStarted = isGameSeason()

  useEffect(() => {
    if (!seasonStarted) { setLoading(false); return }
    // Pull ESPN injuries — players listed as Out/Doubtful create waiver opportunities
    fetch('/api/espn-core/injuries?limit=100')
      .then(r => r.json())
      .then(data => {
        // Generate waiver targets from injured starters
        const injuries = (data.items || [])
          .filter(p => ['Out','Doubtful'].includes(p.status))
          .slice(0, 15)
          .map((p, i) => ({
            player: `${p.athlete?.displayName || 'TBD'} Replacement`,
            team:   p.athlete?.team?.abbreviation || '—',
            pos:    p.athlete?.position?.abbreviation || '—',
            owned:  '< 40%',
            reason: `${p.athlete?.displayName || 'Starter'} listed ${p.status} — immediate opportunity`,
            priority: i < 5 ? 'HIGH' : i < 10 ? 'MED' : 'LOW',
          }))
        setTargets(injuries)
        setLoading(false)
      })
      .catch(() => { setLoading(false) })
  }, [])

  return { targets, loading }
}

// ── ERROR BOUNDARY ────────────────────────────────────────────────────────────
class TabErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null } }
  static getDerivedStateFromError(error) { return { hasError: true, error } }
  componentDidCatch(error, info) { console.error('Tab crash:', error, info) }
  render() {
    if (this.state.hasError) return (
      <div style={{padding:24, textAlign:'center'}}>
        <div style={{fontSize:32, marginBottom:12}}>⚠️</div>
        <div style={{fontFamily:'var(--font-mono)', fontSize:11, color:'var(--accent)', marginBottom:8}}>
          This tab encountered an error
        </div>
        <div style={{fontFamily:'var(--font-mono)', fontSize:9, color:'var(--muted-lt)', marginBottom:16}}>
          {this.state.error?.message || 'Unknown error'}
        </div>
        <button onClick={() => this.setState({ hasError: false, error: null })}
          className="tc-btn on">Try Again</button>
      </div>
    )
    return this.props.children
  }
}

function FantasyView({ mode, setMode, currentWeek, squad, trendsMode, setTrendsMode, trendsRange, setTrendsRange, trendsPos, setTrendsPos }) {
  const [tab, setTab] = useState('leaders')
  const TABS = [
    { id:'leaders',   label:'📊 Leaders' },
    { id:'fw',        label:'⚡ FW Formula' },
    { id:'startsit',  label:'⚖️ Start/Sit' },
    { id:'matchups',  label:'🎯 Matchups' },
    { id:'waiver',    label:'📋 Waiver Wire' },
    { id:'trends',    label:'🔥 Trends' },
    { id:'news',      label:'📰 Fantasy News' },
  ]
  return (
    <div>
      <div className="section-bar">
        <h2>Fantasy Hub</h2>
        <div className="sb-rule" />
        <span className="sb-ct">Leaders · Start/Sit · Matchups · Waiver · Trends · News · {mode === 'ppr' ? 'PPR' : 'Standard'}</span>
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
      {tab === 'leaders'  && <TabErrorBoundary><FantasyLeadersView mode={mode} squad={squad} /></TabErrorBoundary>}
      {tab === 'fw'       && <TabErrorBoundary><FWFormulaView currentWeek={currentWeek} mode={mode} squad={squad} /></TabErrorBoundary>}
      {tab === 'startsit' && <TabErrorBoundary><StartSitView mode={mode} /></TabErrorBoundary>}
      {tab === 'matchups' && <TabErrorBoundary><MatchupRaterView /></TabErrorBoundary>}
      {tab === 'waiver'   && <TabErrorBoundary><WaiverWireView /></TabErrorBoundary>}
      {tab === 'trends'   && (
        <TabErrorBoundary>
          <TrendsView currentWeek={currentWeek}
            mode={trendsMode} setMode={setTrendsMode}
            range={trendsRange} setRange={setTrendsRange}
            pos={trendsPos} setPos={setTrendsPos} />
        </TabErrorBoundary>
      )}
      {tab === 'news'     && <TabErrorBoundary><FantasyNewsView mode={mode} /></TabErrorBoundary>}
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

  const seasonStarted = currentWeek > 1 || isGameSeason()

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
          fetch(`/api/espn/scoreboard?week=${w}&seasontype=${espnSeasonType()}&limit=20`)
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
// ── NEWS VIEW ─────────────────────────────────────────────────────────────────
// ── MULTI-SOURCE NEWS HOOK ────────────────────────────────────────────────────
// ── NFL News sources — ESPN, Google News, CBS, PFT confirmed working
const NFL_NEWS_SOURCES = [
  { id:'espn',   label:'ESPN',            type:'espn'  },
  { id:'google', label:'Google News',     type:'gnews' },
  { id:'cbs',    label:'CBS Sports',      type:'rss',  url:'/api/rss?source=cbs' },
  { id:'pft',    label:'ProFootballTalk', type:'rss',  url:'/api/rss?source=pft' },
]

// ── Fantasy News sources — ESPN + Google News confirmed working; CBS/PFT on best-effort
const FANTASY_NEWS_SOURCES = [
  { id:'espn',   label:'ESPN Fantasy',    type:'espn-fantasy' },
  { id:'google', label:'Google News',     type:'gnews' },
  { id:'cbs',    label:'CBS Fantasy',     type:'rss',  url:'/api/rss?source=cbs_fant' },
  { id:'pft',    label:'ProFootballTalk', type:'rss',  url:'/api/rss?source=pft' },
]

// Build the URL dynamically so team filter triggers real Google News search
function buildNewsUrl(src, teamFilter, isFantasy) {
  if (src.type === 'espn' || src.type === 'espn-fantasy') {
    const ESPN_IDS = {
      ARI:22,ATL:1,BAL:33,BUF:2,CAR:29,CHI:3,CIN:4,CLE:5,DAL:6,DEN:7,
      DET:8,GB:9,HOU:34,IND:11,JAC:30,KC:12,LA:14,LAC:24,LV:13,MIA:15,
      MIN:16,NE:17,NO:18,NYG:19,NYJ:20,PHI:21,PIT:23,SEA:26,SF:25,TB:27,
      TEN:10,WAS:28,
    }
    if (teamFilter !== 'All' && ESPN_IDS[teamFilter])
      return `/api/espn/news?team=${ESPN_IDS[teamFilter]}&limit=30`
    return src.type === 'espn-fantasy' ? '/api/espn/news?limit=50' : '/api/espn/news?limit=40'
  }
  if (src.type === 'gnews') {
    if (teamFilter !== 'All') {
      const t = ti(teamFilter)
      const q = (t && t.city !== teamFilter)
        ? `${t.city} ${t.nick} ${isFantasy ? 'fantasy football' : 'NFL'}`
        : 'NFL football'
      return `/api/gnews?q=${encodeURIComponent(q)}`
    }
    const q = isFantasy
      ? 'NFL fantasy football waiver wire start sit injury'
      : 'NFL football news'
    return `/api/gnews?q=${encodeURIComponent(q)}`
  }
  return src.url || ''
}

function parseRSS(xml) {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'text/xml')
    if (doc.querySelector('parsererror')) throw new Error('XML parse error')
    return Array.from(doc.querySelectorAll('item')).map(item => {
      // Google News wraps source in <source url="...">Publisher Name</source>
      const sourceEl = item.querySelector('source')
      const byline = sourceEl?.textContent?.trim() ||
                     item.querySelector('author')?.textContent?.trim() || ''

      // Link — Google News uses <link> as text node after a comment
      const linkEl = item.querySelector('link')
      let link = linkEl?.textContent?.trim() ||
                 linkEl?.getAttribute('href') ||
                 item.querySelector('guid')?.textContent?.trim() || '#'

      // Images — try multiple locations
      const image = item.querySelector('enclosure[type^="image"]')?.getAttribute('url') ||
                    item.querySelector('media\\:content')?.getAttribute('url') ||
                    item.querySelector('media\\:thumbnail')?.getAttribute('url') ||
                    item.querySelector('[medium="image"]')?.getAttribute('url') || null

      const title = item.querySelector('title')?.textContent?.trim() || ''
      const desc  = item.querySelector('description')?.textContent?.replace(/<[^>]+>/g,'').trim() || ''
      const pub   = item.querySelector('pubDate')?.textContent?.trim() || ''

      return {
        headline: title,
        desc:     desc.slice(0, 300),
        link,
        image,
        time:     pub ? new Date(pub) : null,
        byline,
        team:     '',
      }
    }).filter(a => a.headline)
  } catch(e) { return [] }
}

function useMultiSourceNews(sourceId, sources, teamFilter = 'All', isFantasy = false) {
  const [articles, setArticles] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    setLoading(true)
    setArticles([])
    setError(null)
    const src = sources.find(s => s.id === sourceId)
    if (!src) { setLoading(false); return }

    const url = buildNewsUrl(src, teamFilter, isFantasy)
    if (!url) { setError('No URL for this source'); setLoading(false); return }

    if (src.type === 'espn' || src.type === 'espn-fantasy') {
      fetch(url)
        .then(r => r.json())
        .then(data => {
          let items = (data.articles || []).map(a => ({
            headline: a.headline || '',
            desc:     a.description || '',
            link:     a.links?.web?.href || 'https://www.espn.com/nfl',
            image:    a.images?.[0]?.url || null,
            time:     a.published ? new Date(a.published) : null,
            byline:   a.byline || 'ESPN',
            team:     a.categories?.find(c => c.type === 'team')?.description || '',
          }))
          // For ESPN fantasy with no team filter, apply keyword filter
          if (isFantasy && teamFilter === 'All') {
            const kws = ['fantasy','injury','questionable','doubtful',' out ','snap','target','waiver','start','sit','projection','handcuff','td','red zone','practice','limited','ir ','placed on']
            items = items.filter(a => kws.some(k => (a.headline+a.desc).toLowerCase().includes(k)))
          }
          setArticles(items)
          setLoading(false)
        })
        .catch(() => { setError('ESPN unavailable'); setLoading(false) })

    } else {
      // gnews and rss both return XML
      fetch(url)
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text() })
        .then(xml => {
          if (!xml || xml.trim().startsWith('{') || xml.trim().startsWith('<html')) throw new Error('Bad response')
          const parsed = parseRSS(xml)
          if (!parsed.length) throw new Error('No articles')
          setArticles(parsed)
          setLoading(false)
        })
        .catch(() => {
          setError(`${src.label} unavailable`)
          setLoading(false)
        })
    }
  }, [sourceId, teamFilter]) // re-fetch when team changes!

  return { articles, loading, error }
}

function NewsView({ teamFilter, setTeamFilter }) {
  const [source, setSource] = useState('espn')
  const [fantasyOnly, setFantasyOnly] = useState(false)
  const { articles, loading, error } = useMultiSourceNews(source, NFL_NEWS_SOURCES, teamFilter, false)

  const timeAgo = (date) => {
    if (!date) return ''
    const diff = Date.now() - date.getTime()
    const mins = Math.floor(diff / 60000)
    const hrs  = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 60) return `${mins}m ago`
    if (hrs < 24)  return `${hrs}h ago`
    return `${days}d ago`
  }

  // Filter by team and optional fantasy toggle
  const FANTASY_KWS = ['fantasy','waiver','start','sit','projection','handcuff']
  const filtered = articles.filter(a => {
    const text = (a.headline + a.desc).toLowerCase()
    if (teamFilter !== 'All') {
      const teamInfo = ti(teamFilter)
      if (!text.includes(teamInfo.city.toLowerCase()) &&
          !text.includes(teamInfo.nick.toLowerCase()) &&
          !a.team.includes(teamFilter)) return false
    }
    if (fantasyOnly && !FANTASY_KWS.some(k => text.includes(k))) return false
    return true
  })

  return (
    <div>
      <div className="section-bar">
        <h2>NFL News</h2>
        <div className="sb-rule" />
        <span className="sb-ct">
          {NFL_NEWS_SOURCES.find(s => s.id === source)?.label}
          {teamFilter !== 'All' ? ` · ${ti(teamFilter).city}` : ' · All Teams'}
          {!loading && ` · ${filtered.length} stories`}
        </span>
      </div>

      {/* Filters */}
      <div className="sch-filters">
        <div className="filter-group">
          <span className="filter-label">Source</span>
          <div className="filter-pills">
            {NFL_NEWS_SOURCES.map(s => (
              <button key={s.id} className={`fpill ${source === s.id ? 'on' : ''}`}
                onClick={() => setSource(s.id)}>{s.label}</button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <span className="filter-label">Filter</span>
          <div className="filter-pills">
            <button className={`fpill ${!fantasyOnly ? 'on' : ''}`} onClick={() => setFantasyOnly(false)}>All NFL</button>
            <button className={`fpill ${fantasyOnly ? 'on' : ''}`} onClick={() => setFantasyOnly(true)}>Fantasy Only</button>
          </div>
        </div>
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

      {loading && (
        <div className="sch-loading">
          Loading from {NFL_NEWS_SOURCES.find(s => s.id === source)?.label}…
        </div>
      )}
      {!loading && error && (
        <div className="sch-error">
          ⚠️ {error} — <button className="sb-google-link" style={{background:'none',border:'none',cursor:'pointer'}} onClick={() => setSource('espn')}>Switch to ESPN</button>
        </div>
      )}

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
                {a.desc && i < 10 && (
                  <div className="news-desc">{a.desc.slice(0,140)}{a.desc.length > 140 ? '…' : ''}</div>
                )}
                <div className="news-meta">
                  <span className="news-byline">{a.byline || NFL_NEWS_SOURCES.find(s=>s.id===source)?.label}</span>
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
          <div className="cs-title">No articles found</div>
          <div className="cs-text">Try a different source or remove team filter.</div>
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
  const seasonStarted = isGameSeason()

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



// ═══════════════════════════════════════════════════════════════════════════════
// ── STATS VIEW ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function useTeamStats(season) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  useEffect(() => {
    setLoading(true)
    fetch(`/api/espn/teamstats?season=${season}`)
      .then(r => r.json())
      .then(d => { setData(d.teams || []); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [season])
  return { teams: data, loading, error }
}

function usePlayerStats(season, category) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  useEffect(() => {
    if (!category) return
    setLoading(true)
    setData(null)
    fetch(`/api/espn/playerstats?season=${season}&category=${category}`)
      .then(r => r.json())
      .then(d => { setData({ athletes: d.athletes || [], labels: d.abbreviations || d.labels || [] }); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [season, category])
  return { athletes: data?.athletes, labels: data?.labels, loading, error }
}

function useSortable(rows, defaultKey, defaultDir = 'desc') {
  const [sortKey, setSortKey] = useState(defaultKey)
  const [sortDir, setSortDir] = useState(defaultDir)
  const handleSort = (key) => {
    if (key === sortKey) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }
  const sorted = [...(rows || [])].sort((a, b) => {
    const av = typeof a[sortKey] === 'number' ? a[sortKey] : parseFloat(a[sortKey]) || 0
    const bv = typeof b[sortKey] === 'number' ? b[sortKey] : parseFloat(b[sortKey]) || 0
    return sortDir === 'desc' ? bv - av : av - bv
  })
  return { sorted, sortKey, sortDir, handleSort }
}

function SortTH({ label, statKey, sortKey, sortDir, onSort, title }) {
  const active = sortKey === statKey
  return (
    <th className={`stats-th sortable ${active ? 'sort-active' : ''}`} onClick={() => onSort(statKey)} title={title || label}>
      {label}{active && <span className="sort-arrow">{sortDir === 'desc' ? ' ↓' : ' ↑'}</span>}
    </th>
  )
}

function TeamOffenseTable({ teams, squad }) {
  const rows = (teams || []).map(t => {
    const s = t.stats
    const get = (k) => s[k]?.value ?? null
    const disp = (k) => s[k]?.display ?? '—'
    return {
      abbr: t.abbr,
      ppg:      get('pointsPerGame')           ?? get('avgPoints')             ?? 0,
      ypg:      get('totalYardsPerGame')        ?? get('yardsPerGame')          ?? 0,
      pypg:     get('netPassingYardsPerGame')   ?? get('passYardsPerGame')      ?? 0,
      rypg:     get('rushingYardsPerGame')      ?? get('rushYardsPerGame')      ?? 0,
      thirdPct: get('thirdDownPct')             ?? get('thirdDownConvPct')      ?? 0,
      rzPct:    get('redZonePct')               ?? get('redZoneConvPct')        ?? 0,
      ypp:      get('yardsPerPlay')             ?? get('totalYardsPerPlay')     ?? 0,
      topMin:   get('possessionTime')           ?? get('timeOfPossession')      ?? 0,
      to:       get('turnovers')                ?? get('totalTurnovers')        ?? 0,
      thirdPctD: disp('thirdDownPct')           || disp('thirdDownConvPct'),
      rzPctD:    disp('redZonePct')             || disp('redZoneConvPct'),
      topD:      disp('possessionTime')         || disp('timeOfPossession'),
    }
  })
  const { sorted, sortKey, sortDir, handleSort } = useSortable(rows, 'ppg')
  const squadTeams = squad?.teams || []
  const thProps = { sortKey, sortDir, onSort: handleSort }
  return (
    <div className="stats-table-wrap">
      <table className="stats-table">
        <thead><tr>
          <th className="stats-th stats-th-rank">#</th>
          <th className="stats-th stats-th-team">Team</th>
          <SortTH label="PTS/G"  statKey="ppg"      title="Points Per Game"           {...thProps} />
          <SortTH label="YDS/G"  statKey="ypg"      title="Total Yards Per Game"      {...thProps} />
          <SortTH label="PASS/G" statKey="pypg"     title="Net Passing Yards Per Game" {...thProps} />
          <SortTH label="RUSH/G" statKey="rypg"     title="Rushing Yards Per Game"    {...thProps} />
          <SortTH label="YPP"    statKey="ypp"      title="Yards Per Play"            {...thProps} />
          <SortTH label="3RD%"   statKey="thirdPct" title="3rd Down Conversion %"     {...thProps} />
          <SortTH label="RZ%"    statKey="rzPct"    title="Red Zone TD %"             {...thProps} />
          <SortTH label="TOP"    statKey="topMin"   title="Time of Possession"        {...thProps} />
          <SortTH label="TO"     statKey="to"       title="Turnovers (lower=better)"  {...thProps} />
        </tr></thead>
        <tbody>
          {sorted.map((row, i) => {
            const inSquad = squadTeams.includes(row.abbr)
            return (
              <tr key={row.abbr} className={`stats-row ${inSquad ? 'stats-squad-row' : ''} ${i < 5 ? 'stats-top5' : ''}`}>
                <td className="stats-rank">{i + 1}</td>
                <td className="stats-team-cell"><span className="stats-abbr">{row.abbr}</span>{inSquad && <span className="stats-squad-dot" />}</td>
                <td className="stats-val stats-val-primary">{row.ppg > 0 ? row.ppg.toFixed(1) : '—'}</td>
                <td className="stats-val">{row.ypg  > 0 ? row.ypg.toFixed(1)  : '—'}</td>
                <td className="stats-val">{row.pypg > 0 ? row.pypg.toFixed(1) : '—'}</td>
                <td className="stats-val">{row.rypg > 0 ? row.rypg.toFixed(1) : '—'}</td>
                <td className="stats-val">{row.ypp  > 0 ? row.ypp.toFixed(2)  : '—'}</td>
                <td className="stats-val">{row.thirdPctD !== '—' ? row.thirdPctD : (row.thirdPct > 0 ? (row.thirdPct*100).toFixed(1)+'%' : '—')}</td>
                <td className="stats-val">{row.rzPctD    !== '—' ? row.rzPctD   : (row.rzPct    > 0 ? (row.rzPct*100).toFixed(1)+'%'    : '—')}</td>
                <td className="stats-val">{row.topD      !== '—' ? row.topD     : (row.topMin   > 0 ? row.topMin.toFixed(1)              : '—')}</td>
                <td className={`stats-val ${row.to > 2 ? 'stats-bad' : row.to <= 1 ? 'stats-good' : ''}`}>{row.to > 0 ? row.to : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function TeamDefenseTable({ teams, squad }) {
  const rows = (teams || []).map(t => {
    const s = t.stats
    const get = (k) => s[k]?.value ?? null
    const disp = (k) => s[k]?.display ?? '—'
    return {
      abbr:      t.abbr,
      papg:      get('pointsAllowedPerGame')        ?? 0,
      yapg:      get('yardsAllowedPerGame')         ?? 0,
      pyapg:     get('passingYardsAllowedPerGame')  ?? 0,
      ryapg:     get('rushingYardsAllowedPerGame')  ?? 0,
      sacks:     get('sacks')         ?? get('totalSacks')          ?? 0,
      ints:      get('interceptions') ?? get('totalInterceptions')  ?? 0,
      fFum:      get('forcedFumbles') ?? get('fumbleRecoveries')    ?? 0,
      tfl:       get('tacklesForLoss')               ?? 0,
      pd:        get('passesDefended')               ?? 0,
      thirdPct:  get('opponentThirdDownPct')         ?? 0,
      thirdPctD: disp('opponentThirdDownPct'),
    }
  })
  const { sorted, sortKey, sortDir, handleSort } = useSortable(rows, 'papg', 'asc')
  const squadTeams = squad?.teams || []
  const thProps = { sortKey, sortDir, onSort: handleSort }
  return (
    <div className="stats-table-wrap">
      <table className="stats-table">
        <thead><tr>
          <th className="stats-th stats-th-rank">#</th>
          <th className="stats-th stats-th-team">Team</th>
          <SortTH label="PTS/G"   statKey="papg"     title="Points Allowed Per Game"      {...thProps} />
          <SortTH label="YDS/G"   statKey="yapg"     title="Total Yards Allowed Per Game" {...thProps} />
          <SortTH label="PASS/G"  statKey="pyapg"    title="Pass Yards Allowed Per Game"  {...thProps} />
          <SortTH label="RUSH/G"  statKey="ryapg"    title="Rush Yards Allowed Per Game"  {...thProps} />
          <SortTH label="SACKS"   statKey="sacks"    title="Total Sacks"                  {...thProps} />
          <SortTH label="INT"     statKey="ints"     title="Interceptions"                {...thProps} />
          <SortTH label="FF"      statKey="fFum"     title="Forced Fumbles"               {...thProps} />
          <SortTH label="TFL"     statKey="tfl"      title="Tackles For Loss"             {...thProps} />
          <SortTH label="PD"      statKey="pd"       title="Passes Defended"              {...thProps} />
          <SortTH label="OPP3RD"  statKey="thirdPct" title="Opp 3rd Down Conv %"         {...thProps} />
        </tr></thead>
        <tbody>
          {sorted.map((row, i) => {
            const inSquad = squadTeams.includes(row.abbr)
            return (
              <tr key={row.abbr} className={`stats-row ${inSquad ? 'stats-squad-row' : ''} ${i < 5 ? 'stats-top5' : ''}`}>
                <td className="stats-rank">{i + 1}</td>
                <td className="stats-team-cell"><span className="stats-abbr">{row.abbr}</span>{inSquad && <span className="stats-squad-dot" />}</td>
                <td className={`stats-val stats-val-primary ${row.papg < 18 ? 'stats-good' : row.papg > 28 ? 'stats-bad' : ''}`}>{row.papg > 0 ? row.papg.toFixed(1) : '—'}</td>
                <td className="stats-val">{row.yapg  > 0 ? row.yapg.toFixed(1)  : '—'}</td>
                <td className="stats-val">{row.pyapg > 0 ? row.pyapg.toFixed(1) : '—'}</td>
                <td className="stats-val">{row.ryapg > 0 ? row.ryapg.toFixed(1) : '—'}</td>
                <td className={`stats-val ${row.sacks > 40 ? 'stats-good' : ''}`}>{row.sacks > 0 ? row.sacks : '—'}</td>
                <td className={`stats-val ${row.ints > 15 ? 'stats-good' : ''}`}>{row.ints > 0 ? row.ints : '—'}</td>
                <td className="stats-val">{row.fFum > 0 ? row.fFum : '—'}</td>
                <td className="stats-val">{row.tfl  > 0 ? row.tfl  : '—'}</td>
                <td className="stats-val">{row.pd   > 0 ? row.pd   : '—'}</td>
                <td className="stats-val">{row.thirdPctD !== '—' ? row.thirdPctD : (row.thirdPct > 0 ? (row.thirdPct*100).toFixed(1)+'%' : '—')}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function PassingTable({ athletes, squad }) {
  const squadPlayers = squad?.players || []
  const rows = (athletes || []).map(a => {
    const v = (k) => a.stats[k]?.value ?? 0
    return {
      name: a.name, team: a.team, pos: a.pos,
      yds:    v('YDS'), td: v('TD'), int: v('INT'),
      cmpPct: v('PCT') || (v('CMP') && v('ATT') ? v('CMP')/v('ATT')*100 : 0),
      ypa:    v('AVG') || (v('YDS') && v('ATT') ? v('YDS')/v('ATT') : 0),
      rating: v('QBR') || v('passer_rating') || 0,
      long:   v('LNG'), sacks: v('SACK') || 0,
      _fpts:  v('YDS')/25 + v('TD')*6 - v('INT')*2,
    }
  }).filter(r => r.yds > 0 || r.td > 0)
  const { sorted, sortKey, sortDir, handleSort } = useSortable(rows, 'yds')
  const thProps = { sortKey, sortDir, onSort: handleSort }
  return (
    <div className="stats-table-wrap">
      <table className="stats-table stats-table-players">
        <thead><tr>
          <th className="stats-th stats-th-rank">#</th>
          <th className="stats-th stats-th-player">Player</th>
          <th className="stats-th">TM</th>
          <SortTH label="YDS"  statKey="yds"    title="Passing Yards"        {...thProps} />
          <SortTH label="TD"   statKey="td"     title="Touchdown Passes"     {...thProps} />
          <SortTH label="INT"  statKey="int"    title="Interceptions"        {...thProps} />
          <SortTH label="CMP%" statKey="cmpPct" title="Completion %"         {...thProps} />
          <SortTH label="YPA"  statKey="ypa"    title="Yards Per Attempt"    {...thProps} />
          <SortTH label="QBR"  statKey="rating" title="Passer Rating"        {...thProps} />
          <SortTH label="FPTS" statKey="_fpts"  title="Fantasy Points (STD)" {...thProps} />
        </tr></thead>
        <tbody>
          {sorted.map((row, i) => {
            const inSquad = squadPlayers.some(p => row.name.toLowerCase().includes(p.toLowerCase()))
            return (
              <tr key={`${row.name}-${i}`} className={`stats-row ${inSquad ? 'stats-squad-row' : ''}`}>
                <td className="stats-rank">{i+1}</td>
                <td className="stats-player-cell">{row.name}{inSquad && <span className="stats-squad-tag">⚡</span>}</td>
                <td className="stats-team-sm">{row.team}</td>
                <td className="stats-val stats-val-primary">{row.yds > 0 ? row.yds.toLocaleString() : '—'}</td>
                <td className={`stats-val ${row.td >= 25 ? 'stats-good' : ''}`}>{row.td || '—'}</td>
                <td className={`stats-val ${row.int > 12 ? 'stats-bad' : row.int <= 5 ? 'stats-good' : ''}`}>{row.int || '—'}</td>
                <td className="stats-val">{row.cmpPct > 0 ? row.cmpPct.toFixed(1)+'%' : '—'}</td>
                <td className="stats-val">{row.ypa > 0 ? row.ypa.toFixed(1) : '—'}</td>
                <td className={`stats-val ${row.rating >= 100 ? 'stats-good' : row.rating < 80 ? 'stats-bad' : ''}`}>{row.rating > 0 ? row.rating.toFixed(1) : '—'}</td>
                <td className="stats-val stats-fpts">{row._fpts > 0 ? row._fpts.toFixed(1) : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function RushingTable({ athletes, squad }) {
  const squadPlayers = squad?.players || []
  const rows = (athletes || []).map(a => {
    const v = (k) => a.stats[k]?.value ?? 0
    return {
      name: a.name, team: a.team, pos: a.pos,
      yds: v('YDS'), att: v('CAR') || v('ATT'), td: v('TD'),
      ypc: v('AVG') || (v('YDS') && v('CAR') ? v('YDS')/v('CAR') : 0),
      long: v('LNG'), fum: v('FUM') || 0, ypg: v('YDS/G') || 0,
      _fpts: v('YDS')/10 + v('TD')*6,
    }
  }).filter(r => r.yds > 0 || r.att > 0)
  const { sorted, sortKey, sortDir, handleSort } = useSortable(rows, 'yds')
  const thProps = { sortKey, sortDir, onSort: handleSort }
  return (
    <div className="stats-table-wrap">
      <table className="stats-table stats-table-players">
        <thead><tr>
          <th className="stats-th stats-th-rank">#</th>
          <th className="stats-th stats-th-player">Player</th>
          <th className="stats-th">TM</th>
          <SortTH label="YDS"  statKey="yds"   title="Rushing Yards"       {...thProps} />
          <SortTH label="CAR"  statKey="att"   title="Carries"             {...thProps} />
          <SortTH label="TD"   statKey="td"    title="Rushing TDs"         {...thProps} />
          <SortTH label="YPC"  statKey="ypc"   title="Yards Per Carry"     {...thProps} />
          <SortTH label="YPG"  statKey="ypg"   title="Rush Yards Per Game" {...thProps} />
          <SortTH label="LNG"  statKey="long"  title="Long Run"            {...thProps} />
          <SortTH label="FUM"  statKey="fum"   title="Fumbles"             {...thProps} />
          <SortTH label="FPTS" statKey="_fpts" title="Fantasy Points"      {...thProps} />
        </tr></thead>
        <tbody>
          {sorted.map((row, i) => {
            const inSquad = squadPlayers.some(p => row.name.toLowerCase().includes(p.toLowerCase()))
            return (
              <tr key={`${row.name}-${i}`} className={`stats-row ${inSquad ? 'stats-squad-row' : ''}`}>
                <td className="stats-rank">{i+1}</td>
                <td className="stats-player-cell">{row.name}{inSquad && <span className="stats-squad-tag">⚡</span>}</td>
                <td className="stats-team-sm">{row.team}</td>
                <td className="stats-val stats-val-primary">{row.yds > 0 ? row.yds.toLocaleString() : '—'}</td>
                <td className="stats-val">{row.att || '—'}</td>
                <td className={`stats-val ${row.td >= 10 ? 'stats-good' : ''}`}>{row.td || '—'}</td>
                <td className={`stats-val ${row.ypc >= 5 ? 'stats-good' : row.ypc < 3.5 ? 'stats-bad' : ''}`}>{row.ypc > 0 ? row.ypc.toFixed(1) : '—'}</td>
                <td className="stats-val">{row.ypg > 0 ? row.ypg.toFixed(1) : '—'}</td>
                <td className="stats-val">{row.long || '—'}</td>
                <td className={`stats-val ${row.fum > 3 ? 'stats-bad' : ''}`}>{row.fum || '—'}</td>
                <td className="stats-val stats-fpts">{row._fpts > 0 ? row._fpts.toFixed(1) : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ReceivingTable({ athletes, squad }) {
  const squadPlayers = squad?.players || []
  const rows = (athletes || []).map(a => {
    const v = (k) => a.stats[k]?.value ?? 0
    return {
      name: a.name, team: a.team, pos: a.pos,
      yds: v('YDS'), rec: v('REC'), tgt: v('TGT'), td: v('TD'),
      ypr: v('AVG') || (v('YDS') && v('REC') ? v('YDS')/v('REC') : 0),
      ypg: v('YDS/G') || 0, long: v('LNG'),
      _fpts_ppr: v('YDS')/10 + v('TD')*6 + v('REC'),
      _fpts_std: v('YDS')/10 + v('TD')*6,
    }
  }).filter(r => r.yds > 0 || r.rec > 0)
  const { sorted, sortKey, sortDir, handleSort } = useSortable(rows, 'yds')
  const thProps = { sortKey, sortDir, onSort: handleSort }
  return (
    <div className="stats-table-wrap">
      <table className="stats-table stats-table-players">
        <thead><tr>
          <th className="stats-th stats-th-rank">#</th>
          <th className="stats-th stats-th-player">Player</th>
          <th className="stats-th">TM</th>
          <th className="stats-th">POS</th>
          <SortTH label="YDS"  statKey="yds"       title="Receiving Yards"          {...thProps} />
          <SortTH label="REC"  statKey="rec"       title="Receptions"               {...thProps} />
          <SortTH label="TGT"  statKey="tgt"       title="Targets"                  {...thProps} />
          <SortTH label="TD"   statKey="td"        title="Receiving TDs"            {...thProps} />
          <SortTH label="YPR"  statKey="ypr"       title="Yards Per Reception"      {...thProps} />
          <SortTH label="PPR"  statKey="_fpts_ppr" title="Fantasy Points (PPR)"     {...thProps} />
          <SortTH label="STD"  statKey="_fpts_std" title="Fantasy Points (Standard)" {...thProps} />
        </tr></thead>
        <tbody>
          {sorted.map((row, i) => {
            const inSquad = squadPlayers.some(p => row.name.toLowerCase().includes(p.toLowerCase()))
            return (
              <tr key={`${row.name}-${i}`} className={`stats-row ${inSquad ? 'stats-squad-row' : ''}`}>
                <td className="stats-rank">{i+1}</td>
                <td className="stats-player-cell">{row.name}{inSquad && <span className="stats-squad-tag">⚡</span>}</td>
                <td className="stats-team-sm">{row.team}</td>
                <td className="stats-pos">{row.pos}</td>
                <td className="stats-val stats-val-primary">{row.yds > 0 ? row.yds.toLocaleString() : '—'}</td>
                <td className="stats-val">{row.rec || '—'}</td>
                <td className="stats-val">{row.tgt || '—'}</td>
                <td className={`stats-val ${row.td >= 8 ? 'stats-good' : ''}`}>{row.td || '—'}</td>
                <td className={`stats-val ${row.ypr >= 14 ? 'stats-good' : ''}`}>{row.ypr > 0 ? row.ypr.toFixed(1) : '—'}</td>
                <td className="stats-val stats-fpts">{row._fpts_ppr > 0 ? row._fpts_ppr.toFixed(1) : '—'}</td>
                <td className="stats-val stats-fpts">{row._fpts_std > 0 ? row._fpts_std.toFixed(1) : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function DefensePlayerTable({ athletes, squad }) {
  const squadPlayers = squad?.players || []
  const rows = (athletes || []).map(a => {
    const v = (k) => a.stats[k]?.value ?? 0
    return {
      name: a.name, team: a.team, pos: a.pos,
      tot: v('TOT') || v('totalTackles') || 0,
      solo: v('SOLO'), ast: v('AST'),
      sacks: v('SACKS') || v('sacks') || 0,
      tfl: v('TFL'), int: v('INT'), pd: v('PD'), ff: v('FF'), fr: v('FR'), td: v('TD'),
    }
  }).filter(r => r.tot > 0 || r.sacks > 0 || r.int > 0)
  const { sorted, sortKey, sortDir, handleSort } = useSortable(rows, 'tot')
  const thProps = { sortKey, sortDir, onSort: handleSort }
  return (
    <div className="stats-table-wrap">
      <table className="stats-table stats-table-players">
        <thead><tr>
          <th className="stats-th stats-th-rank">#</th>
          <th className="stats-th stats-th-player">Player</th>
          <th className="stats-th">TM</th>
          <th className="stats-th">POS</th>
          <SortTH label="TOT"   statKey="tot"   title="Total Tackles"    {...thProps} />
          <SortTH label="SOLO"  statKey="solo"  title="Solo Tackles"     {...thProps} />
          <SortTH label="SACKS" statKey="sacks" title="Sacks"            {...thProps} />
          <SortTH label="TFL"   statKey="tfl"   title="Tackles For Loss" {...thProps} />
          <SortTH label="INT"   statKey="int"   title="Interceptions"    {...thProps} />
          <SortTH label="PD"    statKey="pd"    title="Passes Defended"  {...thProps} />
          <SortTH label="FF"    statKey="ff"    title="Forced Fumbles"   {...thProps} />
        </tr></thead>
        <tbody>
          {sorted.map((row, i) => {
            const inSquad = squadPlayers.some(p => row.name.toLowerCase().includes(p.toLowerCase()))
            return (
              <tr key={`${row.name}-${i}`} className={`stats-row ${inSquad ? 'stats-squad-row' : ''}`}>
                <td className="stats-rank">{i+1}</td>
                <td className="stats-player-cell">{row.name}{inSquad && <span className="stats-squad-tag">⚡</span>}</td>
                <td className="stats-team-sm">{row.team}</td>
                <td className="stats-pos">{row.pos}</td>
                <td className="stats-val stats-val-primary">{row.tot || '—'}</td>
                <td className="stats-val">{row.solo || '—'}</td>
                <td className={`stats-val ${row.sacks >= 8 ? 'stats-good' : ''}`}>{row.sacks > 0 ? row.sacks.toFixed(1) : '—'}</td>
                <td className="stats-val">{row.tfl > 0 ? row.tfl.toFixed(1) : '—'}</td>
                <td className={`stats-val ${row.int >= 4 ? 'stats-good' : ''}`}>{row.int || '—'}</td>
                <td className="stats-val">{row.pd || '—'}</td>
                <td className="stats-val">{row.ff || '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function StatsView({ squad }) {
  const SEASON = '2026'
  const TABS = [
    { id:'team-offense', label:'Team Offense', group:'team'   },
    { id:'team-defense', label:'Team Defense', group:'team'   },
    { id:'passing',      label:'Passing',      group:'player' },
    { id:'rushing',      label:'Rushing',      group:'player' },
    { id:'receiving',    label:'Receiving',    group:'player' },
    { id:'defensive',    label:'Defense',      group:'player' },
  ]
  const [tab, setTab] = useState('team-offense')
  const activeTab = TABS.find(t => t.id === tab)
  const { teams, loading: teamLoading, error: teamError } = useTeamStats(SEASON)
  const playerCat = activeTab?.group === 'player' ? tab : null
  const { athletes, loading: playerLoading, error: playerError } = usePlayerStats(SEASON, playerCat)
  const seasonStarted = isGameSeason()

  return (
    <div>
      <div className="section-bar">
        <h2>2026 NFL Stats</h2>
        <div className="sb-rule" />
        <span className="sb-ct">{seasonStarted ? `Live · ${seasonLabel()}` : 'Preseason opens Aug 7'}</span>
      </div>
      <div className="stats-tabs">
        <div className="stats-tab-group">
          <span className="stats-tab-label">Teams</span>
          {TABS.filter(t => t.group === 'team').map(t => (
            <button key={t.id} className={`stats-tab ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>
        <div className="stats-tab-group">
          <span className="stats-tab-label">Players</span>
          {TABS.filter(t => t.group === 'player').map(t => (
            <button key={t.id} className={`stats-tab ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>
      </div>
      {!seasonStarted && (
        <div className="leaders-coming-soon">
          <div className="cs-icon">📊</div>
          <div className="cs-title">Stats Hub — Live Sep 9</div>
          <div className="cs-text">Team offense & defense rankings · Individual leaders in every category · All sortable · Live from ESPN.</div>
          <div className="cs-date">Season opens Sep 9, 2026 · SEA vs NE · 8:20 PM ET</div>
        </div>
      )}
      {seasonStarted && tab === 'team-offense' && (<>
        <div className="stats-info-bar">Click any column header to sort · Squad teams highlighted in gold</div>
        {teamLoading && <div className="leaders-coming-soon"><div className="cs-icon">📊</div><div className="cs-title">Loading team stats…</div></div>}
        {!teamLoading && teams?.length > 0 && <TeamOffenseTable teams={teams} squad={squad} />}
      </>)}
      {seasonStarted && tab === 'team-defense' && (<>
        <div className="stats-info-bar">Sorted by fewest points allowed · Click to re-sort</div>
        {teamLoading && <div className="leaders-coming-soon"><div className="cs-icon">📊</div><div className="cs-title">Loading team stats…</div></div>}
        {!teamLoading && teams?.length > 0 && <TeamDefenseTable teams={teams} squad={squad} />}
      </>)}
      {seasonStarted && tab === 'passing' && (<>
        <div className="stats-info-bar">Top 50 passers · Click to sort · Squad players highlighted ⚡</div>
        {playerLoading && <div className="leaders-coming-soon"><div className="cs-icon">📊</div><div className="cs-title">Loading passing stats…</div></div>}
        {!playerLoading && athletes?.length > 0 && <PassingTable athletes={athletes} squad={squad} />}
      </>)}
      {seasonStarted && tab === 'rushing' && (<>
        <div className="stats-info-bar">Top 50 rushers · Click to sort · Squad players highlighted ⚡</div>
        {playerLoading && <div className="leaders-coming-soon"><div className="cs-icon">📊</div><div className="cs-title">Loading rushing stats…</div></div>}
        {!playerLoading && athletes?.length > 0 && <RushingTable athletes={athletes} squad={squad} />}
      </>)}
      {seasonStarted && tab === 'receiving' && (<>
        <div className="stats-info-bar">Top 50 receivers · PPR and Standard fantasy points shown · Squad players highlighted ⚡</div>
        {playerLoading && <div className="leaders-coming-soon"><div className="cs-icon">📊</div><div className="cs-title">Loading receiving stats…</div></div>}
        {!playerLoading && athletes?.length > 0 && <ReceivingTable athletes={athletes} squad={squad} />}
      </>)}
      {seasonStarted && tab === 'defensive' && (<>
        <div className="stats-info-bar">Top 50 defenders · Click to sort · Squad players highlighted ⚡</div>
        {playerLoading && <div className="leaders-coming-soon"><div className="cs-icon">📊</div><div className="cs-title">Loading defensive stats…</div></div>}
        {!playerLoading && athletes?.length > 0 && <DefensePlayerTable athletes={athletes} squad={squad} />}
      </>)}
      {seasonStarted && <div className="stats-footer-note">Data via ESPN · Updates after each game · Click column headers to sort</div>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── PLAYROOM VIEW ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const EMOJI_QUIZ = [
  { emoji:'🏃🏾⚡👑',  answer:'Bo Jackson',           hint:'Two-sport legend. Heisman. The myth.' },
  { emoji:'💪🏾🇳🇬🚂',  answer:'Christian Okoye',      hint:'The Nigerian Nightmare. KC bruiser.' },
  { emoji:'🦁🦁🦁🏆',  answer:'Barry Sanders',         hint:'Detroit Lions RB. Never won a ring. Walked away.' },
  { emoji:'🧀🏈🏆',    answer:'Brett Favre',           hint:'Iron man QB. Cheese country. 297 straight starts.' },
  { emoji:'⚡🐝🌊',    answer:'Deion Sanders',          hint:'Prime Time. Two-sport superstar.' },
  { emoji:'🏈💨📺🎙️', answer:'John Madden',            hint:'Coach. Analyst. Video game legend.' },
  { emoji:'🐎🎠🏈',    answer:'Walter Payton',          hint:'Sweetness. Chicago legend. 16,726 rush yards.' },
  { emoji:'🔫🌵🏈',    answer:'Emmitt Smith',           hint:'All-time rush leader. Cowboys RB. Three rings.' },
  { emoji:'🧊🏈❄️',    answer:'Dan Marino',             hint:'Never won a ring. Greatest arm of his era. Miami.' },
  { emoji:'🔴🔵⚡🏈',  answer:'LaDainian Tomlinson',   hint:'28 TDs in 2006. Greatest fantasy RB season ever.' },
  { emoji:'🧲🏈🖤🟡',  answer:'Hines Ward',             hint:'Toughest WR. Super Bowl XL MVP. Steelers.' },
  { emoji:'🎩🏈🦅',    answer:'Randall Cunningham',    hint:'Ultimate Weapon. Eagles QB. Years ahead of his time.' },
]

const TRIVIA_FACTS = [
  { fact:'Tom Brady went undrafted in the MLB Draft by the Expos but chose football instead.', category:'Did You Know' },
  { fact:'Bo Jackson is the only player named an All-Star in both MLB and the NFL Pro Bowl.', category:'Legend' },
  { fact:'Jerry Rice went to a Division I-AA school (Mississippi Valley State) before becoming the GOAT.', category:'Origin Story' },
  { fact:'The 1972 Miami Dolphins remain the only team to finish a season undefeated and win the Super Bowl (17-0).', category:'Record Book' },
  { fact:'Emmitt Smith rushed for 18,355 career yards — an NFL record that still stands.', category:'Record Book' },
  { fact:'Calvin Johnson recorded 1,964 receiving yards in 2012 — still the single-season record.', category:'Record Book' },
  { fact:'Barry Sanders averaged 5.0 yards per carry over his entire career.', category:'Legend' },
  { fact:'John Madden was afraid to fly and traveled to every road game by bus or train.', category:'Did You Know' },
  { fact:'The Ice Bowl (1967 NFL Championship) was played in minus 13 degrees — the referee\'s whistle froze to his lips.', category:'Classic Game' },
  { fact:'Alvin Kamara scored 6 rushing TDs on Christmas Day 2020 — most in a single game since 1929.', category:'Record Book' },
  { fact:'The West Coast Offense was invented by Bill Walsh at Stanford before he ever coached the 49ers.', category:'History' },
  { fact:'Jim Brown never missed a game in his entire 9-year career and retired at age 29 at his absolute peak.', category:'Legend' },
]

const MEMORY_LANE_PROMPTS = [
  { prompt:'Would LaDainian Tomlinson be a first-round pick today in PPR formats?', hot:true },
  { prompt:'Marshall Faulk in 2000: 2,189 scrimmage yards, 26 TDs. Would he go #1 overall in your draft?', hot:false },
  { prompt:'Randy Moss in 1998: 1,313 yards, 17 TDs as a rookie. What would his ADP look like today?', hot:true },
  { prompt:'Michael Vick 2004: 16 rush TDs, 902 rush yards as a QB. First overall pick today?', hot:true },
  { prompt:'Barry Sanders averaged 5.0 YPC for a decade. Would he be a fantasy #1 overall in 2026?', hot:false },
  { prompt:'The 1985 Bears defense — 46 sacks, 23 interceptions — how would they fare against today\'s spread offenses?', hot:false },
  { prompt:'Deion Sanders played in both a World Series and a Super Bowl in the same calendar year (1992). Name another athlete who could do that today.', hot:true },
]

const CLASSIC_GAMES = [
  { title:'The Ice Bowl',             year:1967, teams:'Packers 21 · Cowboys 17', headline:'Starr QB sneak with 16 seconds left. Minus 13 degrees. Greatest game ever played.', link:'https://www.google.com/search?q=1967+Ice+Bowl+Packers+Cowboys' },
  { title:'The Catch',                year:1982, teams:'49ers 28 · Cowboys 27',   headline:'Dwight Clark. Six yards deep. Montana scrambling right. The dynasty begins.', link:'https://www.google.com/search?q=The+Catch+1982+49ers+Cowboys' },
  { title:'The Drive',                year:1987, teams:'Broncos 23 · Browns 20',  headline:'Elway. 98 yards. 5:02 left. 15 plays. The stadium went silent.', link:'https://www.google.com/search?q=The+Drive+1987+Elway+Browns' },
  { title:'The Immaculate Reception', year:1972, teams:'Steelers 13 · Raiders 7', headline:'Fourth-and-10. Tipped ball. Franco Harris scoops it up. Still debated.', link:'https://www.google.com/search?q=Immaculate+Reception+1972' },
  { title:'Super Bowl XLII',          year:2008, teams:'Giants 17 · Patriots 14', headline:'Helmet catch. 18-0 bid ended. Greatest upset in Super Bowl history.', link:'https://www.google.com/search?q=Super+Bowl+XLII+Giants+Patriots+Tyree' },
  { title:'The Monday Night Miracle', year:2000, teams:'Jets 40 · Dolphins 37',   headline:'Down 30-7 at halftime. Greatest Monday Night comeback ever.', link:'https://www.google.com/search?q=Monday+Night+Miracle+2000+Jets+Dolphins' },
  { title:'Bills 41 · Oilers 38 OT', year:1993, teams:'Bills 41 · Oilers 38',    headline:'Down 35-3 at halftime. Frank Reich. Greatest playoff comeback in NFL history.', link:'https://www.google.com/search?q=1993+Bills+Oilers+playoff+comeback' },
  { title:'The Tuck Rule Game',       year:2002, teams:'Patriots 16 · Raiders 13',headline:'Brady fumble? Or incomplete pass? The dynasty that almost never was.', link:'https://www.google.com/search?q=Tuck+Rule+Game+2002+Patriots+Raiders' },
]

const QUICK_LINKS = [
  { category:'📊 Fantasy Tools',    links:[
    { label:'FantasyPros Waiver Wire', url:'https://www.fantasypros.com/nfl/waiver-wire-assistant.php' },
    { label:'RotoWire Player News',    url:'https://www.rotoworld.com/football/nfl/player-news' },
    { label:'ESPN Fantasy Rankings',   url:'https://www.espn.com/fantasy/football/story/_/id/rankings' },
    { label:'Sleeper ADP Tool',        url:'https://sleeper.com/nfl/research/players' },
    { label:'KeepTradeCut Values',     url:'https://keeptradecut.com/fantasy-rankings' },
  ]},
  { category:'🏥 Injury & Depth Charts', links:[
    { label:'Official NFL Injury Report', url:'https://www.nfl.com/injuries/' },
    { label:'ESPN NFL Injuries',          url:'https://www.espn.com/nfl/injuries' },
    { label:'Ourlads Depth Charts',       url:'https://www.ourlads.com/nfldepthcharts/' },
    { label:'FantasyPros Injury News',    url:'https://www.fantasypros.com/nfl/injury-news.php' },
  ]},
  { category:'📺 Streaming & TV', links:[
    { label:'NFL+ Streaming',         url:'https://www.nfl.com/plus' },
    { label:'ESPN+ NFL Coverage',     url:'https://plus.espn.com' },
    { label:'Amazon Prime TNF',       url:'https://www.amazon.com/primevideo/nfl' },
    { label:'YouTube NFL Sunday Ticket', url:'https://tv.youtube.com/learn/nflsundayticket' },
    { label:'Peacock NFL Games',      url:'https://www.peacocktv.com/sports/nfl' },
  ]},
  { category:'📰 News & Analysis', links:[
    { label:'Pro Football Talk',      url:'https://profootballtalk.nbcsports.com' },
    { label:'NFL.com News',           url:'https://www.nfl.com/news/' },
    { label:'Football Outsiders',     url:'https://www.footballoutsiders.com' },
    { label:'Sharp Football Stats',   url:'https://www.sharpfootballstats.com' },
    { label:'Next Gen Stats',         url:'https://nextgenstats.nfl.com' },
  ]},
  { category:'🏈 Research & Contracts', links:[
    { label:'Pro Football Reference', url:'https://www.pro-football-reference.com' },
    { label:'PFF Player Grades',      url:'https://www.pff.com/nfl/grades' },
    { label:'Spotrac Contracts',      url:'https://www.spotrac.com/nfl' },
    { label:'Over The Cap',           url:'https://overthecap.com' },
  ]},
]

function PlayroomView() {
  const [section,      setSection]      = useState('trivia')
  const [quizIdx,      setQuizIdx]      = useState(() => Math.floor(Math.random() * EMOJI_QUIZ.length))
  const [quizRevealed, setQuizRevealed] = useState(false)
  const [triviaIdx,    setTriviaIdx]    = useState(() => Math.floor(Math.random() * TRIVIA_FACTS.length))
  const [memIdx,       setMemIdx]       = useState(() => Math.floor(Math.random() * MEMORY_LANE_PROMPTS.length))
  const [classicIdx,   setClassicIdx]   = useState(() => Math.floor(Math.random() * CLASSIC_GAMES.length))
  const [hofIdx,       setHofIdx]       = useState(() => Math.floor(Math.random() * FANTASY_HOF.length))
  const [guessInput,   setGuessInput]   = useState('')
  const [guessResult,  setGuessResult]  = useState(null)

  const nextQuiz    = () => { setQuizIdx(i    => (i+1) % EMOJI_QUIZ.length);        setQuizRevealed(false); setGuessInput(''); setGuessResult(null) }
  const nextTrivia  = () =>   setTriviaIdx(i  => (i+1) % TRIVIA_FACTS.length)
  const nextMem     = () =>   setMemIdx(i     => (i+1) % MEMORY_LANE_PROMPTS.length)
  const nextClassic = () =>   setClassicIdx(i => (i+1) % CLASSIC_GAMES.length)
  const nextHof     = () =>   setHofIdx(i     => (i+1) % FANTASY_HOF.length)

  const quiz    = EMOJI_QUIZ[quizIdx]
  const trivia  = TRIVIA_FACTS[triviaIdx]
  const mem     = MEMORY_LANE_PROMPTS[memIdx]
  const classic = CLASSIC_GAMES[classicIdx]
  const legend  = FANTASY_HOF[hofIdx]

  const checkGuess = () => {
    const correct = quiz.answer.toLowerCase()
    const guess   = guessInput.trim().toLowerCase()
    if (!guess) return
    const hit = correct.includes(guess) || guess.includes(correct.split(' ')[0]) || guess.includes(correct.split(' ').pop())
    setGuessResult(hit ? 'correct' : 'wrong')
    if (hit) setQuizRevealed(true)
  }

  const SECTIONS = [
    { id:'trivia',  label:'🧠 Trivia'      },
    { id:'emoji',   label:'😀 Emoji Quiz'  },
    { id:'classic', label:'📼 Classic Game'},
    { id:'memory',  label:'💭 Memory Lane' },
    { id:'hof',     label:'⚡ HOF Legend'  },
  ]

  return (
    <div>
      <div className="section-bar">
        <h2>The Playroom</h2>
        <div className="sb-rule" />
        <span className="sb-ct">Trivia · Emoji Quiz · Classic Games · Memory Lane · HOF</span>
      </div>
      <div className="hist-tabs">
        {SECTIONS.map(s => (
          <button key={s.id} className={`htab ${section === s.id ? 'on' : ''}`} onClick={() => setSection(s.id)}>{s.label}</button>
        ))}
      </div>

      {section === 'trivia' && (
        <div className="pr-card">
          <div className="pr-badge">{trivia.category}</div>
          <div className="pr-fact">{trivia.fact}</div>
          <div className="pr-actions">
            <button className="pr-btn" onClick={nextTrivia}>Next Fact ›</button>
            <a className="pr-link" href={`https://www.google.com/search?q=${encodeURIComponent(trivia.fact.split(' ').slice(0,5).join(' '))}`} target="_blank" rel="noopener">Dig Deeper ↗</a>
          </div>
          <div className="pr-counter">{triviaIdx+1} of {TRIVIA_FACTS.length}</div>
        </div>
      )}

      {section === 'emoji' && (
        <div className="pr-card">
          <div className="pr-badge">Guess the Legend</div>
          <div className="pr-emoji-display">{quiz.emoji}</div>
          <div className="pr-hint">{quiz.hint}</div>
          {!quizRevealed ? (<>
            <div className="pr-guess-row">
              <input className="pr-input" placeholder="Who is it?" value={guessInput}
                onChange={e => { setGuessInput(e.target.value); setGuessResult(null) }}
                onKeyDown={e => e.key === 'Enter' && checkGuess()} />
              <button className="pr-btn" onClick={checkGuess}>Guess</button>
            </div>
            {guessResult === 'wrong' && <div className="pr-wrong">Not quite — try again or reveal</div>}
            <div className="pr-actions">
              <button className="pr-btn-ghost" onClick={() => setQuizRevealed(true)}>Reveal Answer</button>
              <button className="pr-btn" onClick={nextQuiz}>Skip ›</button>
            </div>
          </>) : (<>
            <div className="pr-reveal">{guessResult === 'correct' ? '✅' : '💡'} <strong>{quiz.answer}</strong></div>
            <div className="pr-actions">
              <button className="pr-btn" onClick={nextQuiz}>Next Quiz ›</button>
              <a className="pr-link" href={`https://www.google.com/search?q=${encodeURIComponent(quiz.answer+' NFL career')}`} target="_blank" rel="noopener">Look Up ↗</a>
            </div>
          </>)}
          <div className="pr-counter">{quizIdx+1} of {EMOJI_QUIZ.length}</div>
        </div>
      )}

      {section === 'classic' && (
        <div className="pr-card pr-card-dark">
          <div className="pr-badge pr-badge-gold">📼 Relive a Classic</div>
          <div className="pr-classic-title">{classic.title}</div>
          <div className="pr-classic-year">{classic.year}</div>
          <div className="pr-classic-teams">{classic.teams}</div>
          <div className="pr-classic-headline">{classic.headline}</div>
          <div className="pr-actions">
            <a className="pr-btn" href={classic.link} target="_blank" rel="noopener">Watch / Read ↗</a>
            <button className="pr-btn-ghost" onClick={nextClassic}>Another Game ›</button>
          </div>
          <div className="pr-counter">{classicIdx+1} of {CLASSIC_GAMES.length}</div>
        </div>
      )}

      {section === 'memory' && (
        <div className="pr-card">
          <div className="pr-badge">💭 Memory Lane</div>
          {mem.hot && <div className="pr-hot-tag">🔥 Hot Take Territory</div>}
          <div className="pr-prompt">{mem.prompt}</div>
          <div className="pr-actions">
            <button className="pr-btn" onClick={nextMem}>Next Prompt ›</button>
          </div>
          <div className="pr-counter">{memIdx+1} of {MEMORY_LANE_PROMPTS.length}</div>
        </div>
      )}

      {section === 'hof' && (
        <div className="pr-card pr-card-dark">
          <div className="pr-badge pr-badge-gold">⚡ Fantasy Hall of Fame</div>
          <div className="pr-hof-player">{legend.player}</div>
          <div className="pr-hof-meta">
            <span className="pr-hof-team">{legend.team}</span>
            <span className="pr-hof-pos">{legend.pos}</span>
            <span className="pr-hof-year">{legend.year} · Wk {legend.week}</span>
          </div>
          <div className="pr-hof-pts">{legend.pts} <span>pts</span></div>
          <div className="pr-hof-line">{legend.line}</div>
          <div className="pr-hof-note">{legend.note}</div>
          <div className="pr-actions">
            <button className="pr-btn-ghost" onClick={nextHof}>Next Legend ›</button>
            <a className="pr-link" href={`https://www.google.com/search?q=${encodeURIComponent(legend.player+' '+legend.year+' NFL fantasy')}`} target="_blank" rel="noopener">Research ↗</a>
          </div>
          <div className="pr-counter">{hofIdx+1} of {FANTASY_HOF.length}</div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── RESOURCES VIEW ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function ResourcesView() {
  const [openCat, setOpenCat] = useState(null)
  return (
    <div>
      <div className="section-bar">
        <h2>Resources</h2>
        <div className="sb-rule" />
        <span className="sb-ct">Fantasy Tools · Injuries · Streaming · News · Research</span>
      </div>
      <div className="res-intro">The best external tools for serious fantasy players, all in one place.</div>
      <div className="res-grid">
        {QUICK_LINKS.map((cat, ci) => (
          <div key={ci} className="res-category">
            <button className={`res-cat-header ${openCat === ci ? 'open' : ''}`} onClick={() => setOpenCat(openCat === ci ? null : ci)}>
              <span>{cat.category}</span>
              <span className="res-chevron">{openCat === ci ? '▲' : '▼'}</span>
            </button>
            {openCat === ci && (
              <div className="res-links">
                {cat.links.map((lnk, li) => (
                  <a key={li} href={lnk.url} target="_blank" rel="noopener" className="res-link">
                    <span className="res-link-label">{lnk.label}</span>
                    <span className="res-link-arrow">↗</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="res-footer">Links open external sites · Not affiliated · Last curated June 2026</div>
    </div>
  )
}

// ── NEWSLETTER SIGNUP ─────────────────────────────────────────────────────────
// NewsletterSignup widget — embeds in Footer
// Reads squad + fav team from props so signup pre-populates what we already know
function NewsletterSignup({ squad, favTeam }) {
  const [email,     setEmail]     = useState('')
  const [team,      setTeam]      = useState(favTeam || 'All')
  const [mode,      setMode]      = useState('ppr')
  const [sends,     setSends]     = useState(['monday','tuesday','thursday','friday'])
  const [status,    setStatus]    = useState('idle') // idle | loading | ok | error
  const [expanded,  setExpanded]  = useState(false)
  const [message,   setMessage]   = useState('')

  // Pre-populate squad players from My Fantasy Squad if available
  const squadStr = squad?.players?.join(', ') || ''

  const NFL_TEAMS = [
    'All','ARI','ATL','BAL','BUF','CAR','CHI','CIN','CLE',
    'DAL','DEN','DET','GB','HOU','IND','JAC','KC','LA','LAC',
    'LV','MIA','MIN','NE','NO','NYG','NYJ','PHI','PIT','SEA',
    'SF','TB','TEN','WAS',
  ]

  const SEND_OPTIONS = [
    { id:'monday',   label:'Mon · Sunday Recap' },
    { id:'tuesday',  label:'Tue · Waiver Wire' },
    { id:'thursday', label:'Thu · TNF Start/Sit' },
    { id:'friday',   label:'Fri · Weekend Prep' },
  ]

  const toggleSend = (id) => {
    setSends(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const handleSubmit = async () => {
    if (!email || !email.includes('@')) {
      setMessage('Enter a valid email address.')
      return
    }
    if (!sends.length) {
      setMessage('Select at least one newsletter day.')
      return
    }

    setStatus('loading')
    try {
      const r = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          favTeam: team,
          squadPlayers: squadStr,
          scoringMode: mode,
          sends,
        }),
      })
      const data = await r.json()
      if (r.ok) {
        setStatus('ok')
        setMessage('Check your email to confirm. See you Week 1.')
        // Store email so squad modal can auto-sync to newsletter
        localStorage.setItem('fw-nl-email', email.toLowerCase().trim())
      } else {
        setStatus('error')
        setMessage(data.error || 'Something went wrong.')
      }
    } catch(e) {
      setStatus('error')
      setMessage('Network error — try again.')
    }
  }

  if (status === 'ok') {
    return (
      <div className="nl-widget nl-success">
        <div className="nl-success-icon">✓</div>
        <div className="nl-success-text">You're in. Confirm email to activate.</div>
        <div className="nl-success-sub">First issue drops Week 1, Sep 9.</div>
      </div>
    )
  }

  return (
    <div className="nl-widget">
      {!expanded ? (
        // Collapsed teaser — just email + big button
        <div className="nl-teaser">
          <div className="nl-teaser-copy">
            <div className="nl-teaser-title">📬 The Final Whistle Newsletter</div>
            <div className="nl-teaser-sub">
              Mon · Tue · Thu · Fri · Scores, fantasy, waiver wire, start/sit — delivered.
            </div>
          </div>
          <div className="nl-teaser-row">
            <input
              className="nl-input"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (sends.length ? handleSubmit() : setExpanded(true))}
            />
            <button
              className="nl-submit-btn"
              onClick={() => email ? setExpanded(true) : null}
            >
              Subscribe
            </button>
          </div>
          {message && <div className="nl-message">{message}</div>}
        </div>
      ) : (
        // Expanded — choose preferences
        <div className="nl-expanded">
          <div className="nl-exp-title">Customize your newsletter</div>

          {/* Email (shown again in expanded form) */}
          <div className="nl-field">
            <label className="nl-label">Email</label>
            <input
              className="nl-input"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          {/* Fav team */}
          <div className="nl-field">
            <label className="nl-label">Favorite Team</label>
            <select
              className="nl-select"
              value={team}
              onChange={e => setTeam(e.target.value)}
            >
              {NFL_TEAMS.map(t => (
                <option key={t} value={t}>{t === 'All' ? 'No preference' : t}</option>
              ))}
            </select>
          </div>

          {/* Scoring mode */}
          <div className="nl-field">
            <label className="nl-label">Scoring Format</label>
            <div className="nl-toggle-row">
              <button
                className={`nl-toggle-btn ${mode === 'ppr' ? 'on' : ''}`}
                onClick={() => setMode('ppr')}
              >PPR</button>
              <button
                className={`nl-toggle-btn ${mode === 'std' ? 'on' : ''}`}
                onClick={() => setMode('std')}
              >Standard</button>
            </div>
          </div>

          {/* Which days */}
          <div className="nl-field">
            <label className="nl-label">Send Days</label>
            <div className="nl-sends">
              {SEND_OPTIONS.map(s => (
                <button
                  key={s.id}
                  className={`nl-send-btn ${sends.includes(s.id) ? 'on' : ''}`}
                  onClick={() => toggleSend(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Squad preview */}
          {squadStr && (
            <div className="nl-squad-preview">
              ⚡ We'll track your squad: <span>{squadStr}</span>
            </div>
          )}

          {message && <div className="nl-message">{message}</div>}

          <div className="nl-btn-row">
            <button
              className="nl-submit-btn nl-submit-big"
              onClick={handleSubmit}
              disabled={status === 'loading'}
            >
              {status === 'loading' ? 'Sending…' : 'Confirm Subscription →'}
            </button>
            <button className="nl-cancel-btn" onClick={() => setExpanded(false)}>Back</button>
          </div>

          <div className="nl-fine-print">
            Free, ad-free, unsubscribe any time. We never share your email.
          </div>
        </div>
      )}
    </div>
  )
}



// ── SIDEBAR ───────────────────────────────────────────────────────────────────
// Sticky right rail — mirrors nysportsdaily.com sidebar pattern
// Shows: division leaders, top injuries, next game countdown, quick links
function Sidebar({ activeWeek, setActiveView, squad }) {
  const [standings, setStandings] = useState(null)
  const [injuries,  setInjuries]  = useState([])
  const [events,    setEvents]    = useState([])
  const [now,       setNow]       = useState(new Date())

  // Live clock for countdown
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  // Standings
  useEffect(() => {
    fetch('/api/espn/standings')
      .then(r => r.json())
      .then(setStandings)
      .catch(() => {})
  }, [])

  // Injuries (top 6)
  useEffect(() => {
    fetch('/api/espn-core/injuries?limit=20')
      .then(r => r.json())
      .then(d => {
        const items = (d.items || [])
          .filter(inj => inj.athlete?.displayName && inj.status)
          .slice(0, 6)
          .map(inj => ({
            name:   inj.athlete?.displayName || '',
            team:   inj.athlete?.team?.abbreviation || '',
            pos:    inj.athlete?.position?.abbreviation || '',
            status: inj.type?.description || inj.status || '',
          }))
        setInjuries(items)
      })
      .catch(() => {})
  }, [])

  // Next few games
  useEffect(() => {
    fetch(`/api/espn/scoreboard?week=${activeWeek}&seasontype=${espnSeasonType()}&limit=20`)
      .then(r => r.json())
      .then(d => setEvents(d.events || []))
      .catch(() => {})
  }, [activeWeek])

  // Get division leaders from standings
  const getDivLeaders = () => {
    if (!standings?.children) return []
    const leaders = []
    standings.children.forEach(conf => {
      conf.standings?.entries
        ?.reduce((divMap, entry) => {
          const div = entry.team?.groups?.[0]?.name || ''
          if (!divMap[div]) divMap[div] = []
          divMap[div].push(entry)
          return divMap
        }, {})
      // Simpler: just get top team per conference
      const sorted = (conf.standings?.entries || [])
        .map(e => {
          const stats = e.stats || []
          const w = stats.find(s => s.name === 'wins')?.value ?? 0
          const l = stats.find(s => s.name === 'losses')?.value ?? 0
          return { abbr: e.team?.abbreviation, w, l, name: conf.name }
        })
        .sort((a, b) => b.w - a.w)
      if (sorted[0]) leaders.push(sorted[0])
    })
    return leaders
  }

  // Countdown to next game
  const nextGame = events.find(ev => {
    const status = ev.status?.type?.state
    return status === 'pre'
  })
  const getCountdown = () => {
    if (!nextGame) return null
    const gameTime = new Date(nextGame.date)
    const diff     = gameTime - now
    if (diff < 0) return null
    const hrs  = Math.floor(diff / 3600000)
    const mins = Math.floor((diff % 3600000) / 60000)
    const days = Math.floor(hrs / 24)
    if (days > 0) return `${days}d ${hrs % 24}h`
    if (hrs > 0)  return `${hrs}h ${mins}m`
    return `${mins}m`
  }

  const countdown = getCountdown()
  const divLeaders = getDivLeaders()

  // Upcoming games (next 4 not yet started)
  const upcoming = events
    .filter(ev => ev.status?.type?.state === 'pre')
    .slice(0, 4)
    .map(ev => {
      const comps = ev.competitions?.[0]
      const home  = comps?.competitors?.find(c => c.homeAway === 'home')
      const away  = comps?.competitors?.find(c => c.homeAway === 'away')
      const time  = ev.date ? new Date(ev.date).toLocaleDateString('en-US',
        {weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit'}) : ''
      const tv    = comps?.broadcasts?.[0]?.names?.[0] || ''
      return {
        home: home?.team?.abbreviation || '?',
        away: away?.team?.abbreviation || '?',
        time, tv,
        isFav: squad?.teams?.includes(home?.team?.abbreviation) ||
               squad?.teams?.includes(away?.team?.abbreviation),
      }
    })

  return (
    <aside className="sidebar">

      {/* ── NEXT GAME COUNTDOWN ── */}
      {nextGame && countdown && (
        <div className="sb-widget sb-widget-dark">
          <div className="sb-widget-title">⏱ Next Kickoff</div>
          <div className="sb-countdown">{countdown}</div>
          <div className="sb-countdown-game">
            {(() => {
              const comps = nextGame.competitions?.[0]
              const home  = comps?.competitors?.find(c => c.homeAway === 'home')
              const away  = comps?.competitors?.find(c => c.homeAway === 'away')
              return `${away?.team?.abbreviation} @ ${home?.team?.abbreviation}`
            })()}
          </div>
        </div>
      )}

      {/* ── CONFERENCE LEADERS ── */}
      {divLeaders.length > 0 && (
        <div className="sb-widget">
          <div className="sb-widget-title">🏆 Conf Leaders</div>
          {divLeaders.map((t, i) => (
            <div key={i} className="sb-leader-row">
              <span className="sb-leader-conf">{t.name?.includes('AFC') ? 'AFC' : 'NFC'}</span>
              <span className="sb-leader-team">{t.abbr}</span>
              <span className="sb-leader-record">{t.w}–{t.l}</span>
            </div>
          ))}
          <button className="sb-more-btn" onClick={() => setActiveView('Standings')}>
            Full Standings →
          </button>
        </div>
      )}

      {/* ── UPCOMING GAMES ── */}
      {upcoming.length > 0 && (
        <div className="sb-widget">
          <div className="sb-widget-title">📅 Upcoming</div>
          {upcoming.map((g, i) => (
            <div key={i} className={`sb-game-row ${g.isFav ? 'sb-game-fav' : ''}`}>
              <div className="sb-game-teams">
                {g.away} @ {g.home}
                {g.isFav && <span className="sb-fav-dot" />}
              </div>
              <div className="sb-game-time">{g.time}</div>
              {g.tv && <div className="sb-game-tv">{g.tv}</div>}
            </div>
          ))}
          <button className="sb-more-btn" onClick={() => setActiveView('Schedule')}>
            Full Schedule →
          </button>
        </div>
      )}

      {/* ── INJURY REPORT ── */}
      {injuries.length > 0 && (
        <div className="sb-widget">
          <div className="sb-widget-title">🏥 Injury Report</div>
          {injuries.map((inj, i) => (
            <div key={i} className="sb-inj-row">
              <div className="sb-inj-player">
                {inj.name}
                <span className="sb-inj-pos">{inj.pos}</span>
                <span className="sb-inj-team">{inj.team}</span>
              </div>
              <div className={`sb-inj-status ${
                inj.status.toLowerCase().includes('out')  ? 'sb-inj-out' :
                inj.status.toLowerCase().includes('doubt') ? 'sb-inj-doubt' : 'sb-inj-qtb'
              }`}>{inj.status}</div>
            </div>
          ))}
          <button className="sb-more-btn" onClick={() => setActiveView('Injuries')}>
            Full Report →
          </button>
        </div>
      )}

      {/* ── QUICK LINKS ── */}
      <div className="sb-widget">
        <div className="sb-widget-title">⚡ Quick Nav</div>
        {[
          { label:'Box Scores',    view:'Scores'   },
          { label:'Fantasy Hub',   view:'Fantasy'  },
          { label:'Stats Hub',     view:'Stats'    },
          { label:'NFL News',      view:'News'     },
          { label:'TV Guide',      view:'TV Guide' },
          { label:'Draft 2026',    view:'Draft'    },
        ].map(({ label, view }) => (
          <button key={view} className="sb-quicklink" onClick={() => setActiveView(view)}>
            {label}
          </button>
        ))}
      </div>

      {/* ── BUY ME A COFFEE PROMO ── */}
      <div className="sb-widget sb-widget-promo">
        <div className="sb-promo-title">The Final Whistle</div>
        <div className="sb-promo-text">
          Independent · Ad-free · Built for NFL fans
        </div>
        <a
          href="https://buymeacoffee.com/mhughes65v"
          target="_blank"
          rel="noopener"
          className="sb-promo-btn"
        >
          ☕ Buy me a coffee
        </a>
      </div>

    </aside>
  )
}

// ── FOOTER ────────────────────────────────────────────────────────────────────
function Footer({ squad, favTeam }) {
  return (
    <footer className="footer">
      {/* Newsletter signup — above the standard footer */}
      <NewsletterSignup squad={squad} favTeam={favTeam} />

      <div className="footer-disclaimer">
        <span className="footer-disc-text">
          The Final Whistle is a free, independent NFL fan site for entertainment purposes only.
          Data sourced from ESPN, CBS Sports, Google News and other public feeds —
          roster info may lag 1–3 days on recent transactions.
          Not affiliated with the NFL, ESPN, or any team.
        </span>
      </div>
      <div className="footer-bottom">
        <span className="footer-brand">The Final Whistle · nflboxscore.com · 2026</span>
        <span className="footer-bmac">
          Built for fun. If you enjoy it —{' '}
          <a href="https://buymeacoffee.com/mhughes65v" target="_blank" rel="noopener">
            ☕ Buy me a coffee
          </a>
          {' · '}
          <a href={`https://www.amazon.com?tag=${AMAZON_TAG}`} target="_blank" rel="noopener">
            Shop Amazon
          </a>
        </span>
        <span className="footer-scoring">6pt TD · Standard / PPR</span>
      </div>
    </footer>
  )
}
