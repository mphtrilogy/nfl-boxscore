// Team info lookup
export const TEAMS = {
  ARI: { city: 'Arizona',      nick: 'Cardinals',   conf: 'NFC', div: 'NFC West'  },
  ATL: { city: 'Atlanta',      nick: 'Falcons',     conf: 'NFC', div: 'NFC South' },
  BAL: { city: 'Baltimore',    nick: 'Ravens',      conf: 'AFC', div: 'AFC North' },
  BUF: { city: 'Buffalo',      nick: 'Bills',       conf: 'AFC', div: 'AFC East'  },
  CAR: { city: 'Carolina',     nick: 'Panthers',    conf: 'NFC', div: 'NFC South' },
  CHI: { city: 'Chicago',      nick: 'Bears',       conf: 'NFC', div: 'NFC North' },
  CIN: { city: 'Cincinnati',   nick: 'Bengals',     conf: 'AFC', div: 'AFC North' },
  CLE: { city: 'Cleveland',    nick: 'Browns',      conf: 'AFC', div: 'AFC North' },
  DAL: { city: 'Dallas',       nick: 'Cowboys',     conf: 'NFC', div: 'NFC East'  },
  DEN: { city: 'Denver',       nick: 'Broncos',     conf: 'AFC', div: 'AFC West'  },
  DET: { city: 'Detroit',      nick: 'Lions',       conf: 'NFC', div: 'NFC North' },
  GB:  { city: 'Green Bay',    nick: 'Packers',     conf: 'NFC', div: 'NFC North' },
  HOU: { city: 'Houston',      nick: 'Texans',      conf: 'AFC', div: 'AFC South' },
  IND: { city: 'Indianapolis', nick: 'Colts',       conf: 'AFC', div: 'AFC South' },
  JAC: { city: 'Jacksonville', nick: 'Jaguars',     conf: 'AFC', div: 'AFC South' },
  KC:  { city: 'Kansas City',  nick: 'Chiefs',      conf: 'AFC', div: 'AFC West'  },
  LA:  { city: 'Los Angeles',  nick: 'Rams',        conf: 'NFC', div: 'NFC West'  },
  LAC: { city: 'Los Angeles',  nick: 'Chargers',    conf: 'AFC', div: 'AFC West'  },
  LV:  { city: 'Las Vegas',    nick: 'Raiders',     conf: 'AFC', div: 'AFC West'  },
  MIA: { city: 'Miami',        nick: 'Dolphins',    conf: 'AFC', div: 'AFC East'  },
  MIN: { city: 'Minnesota',    nick: 'Vikings',     conf: 'NFC', div: 'NFC North' },
  NE:  { city: 'New England',  nick: 'Patriots',    conf: 'AFC', div: 'AFC East'  },
  NO:  { city: 'New Orleans',  nick: 'Saints',      conf: 'NFC', div: 'NFC South' },
  NYG: { city: 'New York',     nick: 'Giants',      conf: 'NFC', div: 'NFC East'  },
  NYJ: { city: 'New York',     nick: 'Jets',        conf: 'AFC', div: 'AFC East'  },
  PHI: { city: 'Philadelphia', nick: 'Eagles',      conf: 'NFC', div: 'NFC East'  },
  PIT: { city: 'Pittsburgh',   nick: 'Steelers',    conf: 'AFC', div: 'AFC North' },
  SEA: { city: 'Seattle',      nick: 'Seahawks',    conf: 'NFC', div: 'NFC West'  },
  SF:  { city: 'San Francisco',nick: '49ers',       conf: 'NFC', div: 'NFC West'  },
  TB:  { city: 'Tampa Bay',    nick: 'Buccaneers',  conf: 'NFC', div: 'NFC South' },
  TEN: { city: 'Tennessee',    nick: 'Titans',      conf: 'AFC', div: 'AFC South' },
  WAS: { city: 'Washington',   nick: 'Commanders',  conf: 'NFC', div: 'NFC East'  },
}

export function ti(abbr) {
  return TEAMS[abbr] || { city: abbr, nick: abbr, conf: '?', div: '?' }
}

// Division order for standings display
export const DIVISION_ORDER = [
  'AFC East', 'AFC North', 'AFC South', 'AFC West',
  'NFC East', 'NFC North', 'NFC South', 'NFC West',
]

// ESPN team abbreviation map (ESPN uses different abbrs for some teams)
export const ESPN_TO_ABBR = {
  'LAR': 'LA',   // Rams
  'WSH': 'WAS',  // Commanders  
  'JAX': 'JAC',  // Jaguars
  'LV':  'LV',
  'LAC': 'LAC',
}
export function normalizeAbbr(espnAbbr) {
  return ESPN_TO_ABBR[espnAbbr] || espnAbbr
}

// ── FANTASY SCORING ────────────────────────────────────────────────────────
export function calcStd(p) {
  let pts = 0
  pts += (p.passYds  || 0) / 25
  pts += (p.passTD   || 0) * 6
  pts -= (p.passInt  || 0) * 2
  pts += (p.rushYds  || 0) / 10
  pts += (p.rushTD   || 0) * 6
  pts += (p.recYds   || 0) / 10
  pts += (p.recTD    || 0) * 6
  pts += (p.retTD    || 0) * 6
  pts -= (p.fumLost  || 0) * 2
  return Math.round(pts * 10) / 10
}

export function calcPPR(p) {
  return Math.round((calcStd(p) + (p.recs || 0)) * 10) / 10
}

// Format helpers
export function fmt(n, d = 0) {
  if (n == null || isNaN(n)) return '—'
  return Number(n).toFixed(d)
}

export function formatDate(dateStr) {
  // "Sep 13" -> nice display
  return dateStr
}

// Network badge colors
export const NETWORK_COLORS = {
  'NBC':         { bg: '#d4a017', text: '#000' },
  'NBC/SNF':     { bg: '#d4a017', text: '#000' },
  'ESPN/MNF':    { bg: '#c00', text: '#fff' },
  'ESPN':        { bg: '#c00', text: '#fff' },
  'CBS':         { bg: '#00529b', text: '#fff' },
  'Fox':         { bg: '#003366', text: '#fff' },
  'Fox/SNF':     { bg: '#003366', text: '#fff' },
  'Amazon/TNF':  { bg: '#1a7a4a', text: '#fff' },
  'Amazon':      { bg: '#1a7a4a', text: '#fff' },
  'Netflix':     { bg: '#e50914', text: '#fff' },
  'NFL Network': { bg: '#0a1845', text: '#fff' },
  'default':     { bg: '#555', text: '#fff' },
}
export function networkColor(net) {
  return NETWORK_COLORS[net] || NETWORK_COLORS.default
}
