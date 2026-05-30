# The Final Whistle · NFL

A newspaper-aesthetic NFL scores, box scores, standings, fantasy stats, and schedule app.
Independent & ad-free. Live data via ESPN's public API.

## Stack
- **React 18** + Vite
- **Vercel** (hosting + API proxy for ESPN)
- **ESPN Public API** (no key required, proxied via vercel.json)

## Setup

```bash
# 1. Clone / initialize
cd the-final-whistle
npm install

# 2. Dev server
npm run dev
# → http://localhost:5173

# 3. Build
npm run build
```

## Deploy to Vercel (same as your other apps)

```bash
# Option A: Vercel CLI
npx vercel
# Follow prompts — framework: Vite, build: npm run build, output: dist

# Option B: GitHub + Vercel dashboard (recommended)
# 1. Push to new GitHub repo: github.com/yourusername/the-final-whistle
# 2. Import in Vercel dashboard
# 3. Framework = Vite, Build = "npm run build", Output = "dist"
# 4. Deploy — Vercel auto-handles the rewrites in vercel.json
```

## How it works

### Live Data (Option C — Hybrid approach)
The `vercel.json` file proxies ESPN's free public API:
- `/api/espn/scoreboard?week=1&seasontype=2` → live scores
- `/api/espn/summary?event={gameId}` → box scores, player stats, scoring plays
- `/api/espn/standings` → division standings

**The proxy is essential** — ESPN blocks direct browser requests (CORS), but Vercel's
server-side rewrite fetches it cleanly. Zero API key needed.

### Schedule
`src/data/schedule2026.js` contains the full confirmed 2026 NFL schedule (all 18 weeks,
all 272 games) from the May 14 release. Teams, dates, times, networks, and international
games are all pre-populated.

When ESPN returns live data for a game, `App.jsx` merges it over the static schedule entry,
so scores fill in automatically as games are played.

### Weekly Updates
**You don't need to do anything each week.** The ESPN scoreboard auto-updates.

The only thing to update manually is `CURRENT_WEEK` in `App.jsx` (line ~10):
```js
const CURRENT_WEEK = 1  // Change to 2, 3, etc. each week
```
Or we can auto-detect this from ESPN's current week data — happy to add that.

### Fantasy Scoring
- Standard: Pass 1pt/25yds, 6pt TD, -2 INT; Rush/Rec 1pt/10yds, 6pt TD; -2 Fum
- PPR: Standard + 1pt per reception
- Calculated client-side from ESPN box score data

## Weekly Workflow (In-Season)

| Task | Frequency | Manual? |
|------|-----------|---------|
| Scores update | Every 60s during games | ❌ Auto |
| Box scores fill in | After game ends | ❌ Auto |
| Standings update | Daily | ❌ Auto |
| Player leaders | After each game | ❌ Auto |
| Change active week | Once/week | ✅ 1 line |
| Schedule data | Already loaded for all 18 weeks | ❌ Done |

## File Structure
```
the-final-whistle/
├── src/
│   ├── App.jsx              ← Main app, all views
│   ├── index.css            ← Full newspaper CSS
│   ├── main.jsx             ← Entry point
│   ├── hooks/
│   │   └── useESPN.js       ← ESPN API hooks + data parsers
│   ├── data/
│   │   └── schedule2026.js  ← Complete 2026 schedule (all 272 games)
│   └── utils/
│       └── teams.js         ← Team info, fantasy scoring, helpers
├── index.html
├── vite.config.js
├── vercel.json              ← ESPN proxy rewrites (CORS fix)
└── package.json
```

## Customization

### Buy Me a Coffee
Find and replace `mhughes65v` with your actual BMAC handle.

### Adding Player Leaders (post Week 1)
The Leaders view shows a "coming soon" placeholder until the season starts.
After Week 1 ESPN will have stat leaders — hook in:
```
/api/espn-core/seasons/2026/types/2/leaders
```

### Future features to add
- [ ] Player search
- [ ] Team pages (full schedule + roster)
- [ ] Playoff bracket (auto-generates from standings)
- [ ] Push notifications for score updates
- [ ] Historical seasons (2025-26 data already in the codebase)
