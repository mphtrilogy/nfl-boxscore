// 2026 NFL Schedule — confirmed from May 14 schedule release
// Key: status 'upcoming' for all pre-season games (scores filled in by ESPN live data)
// gameId will be populated from ESPN API once games are played
// intl: true = international game, with location

export const SCHEDULE_2026 = [
  // ── WEEK 1 · Sep 9–14, 2026 ─────────────────────────────────────────────
  // Wednesday night opener — Super Bowl LX rematch
  { week:1, date:'Sep 9',  day:'Wed', time:'8:20 PM', home:'SEA', away:'NE',  network:'NBC/Peacock',    status:'upcoming', intl:false, note:'Super Bowl LX Rematch · Season Opener' },
  // Thursday — international game (Melbourne, Australia)
  { week:1, date:'Sep 10', day:'Thu', time:'8:35 PM', home:'LA',  away:'SF',  network:'Netflix',        status:'upcoming', intl:true,  intlCity:'Melbourne, Australia', note:'International Series · Melbourne Cricket Ground' },
  // Sunday
  { week:1, date:'Sep 13', day:'Sun', time:'1:00 PM', home:'ATL', away:'PIT', network:'Fox',            status:'upcoming', intl:false },
  { week:1, date:'Sep 13', day:'Sun', time:'1:00 PM', home:'HOU', away:'TEN', network:'CBS',            status:'upcoming', intl:false },
  { week:1, date:'Sep 13', day:'Sun', time:'1:00 PM', home:'IND', away:'JAC', network:'CBS',            status:'upcoming', intl:false },
  { week:1, date:'Sep 13', day:'Sun', time:'1:00 PM', home:'MIA', away:'NYJ', network:'CBS',            status:'upcoming', intl:false },
  { week:1, date:'Sep 13', day:'Sun', time:'1:00 PM', home:'TB',  away:'CAR', network:'Fox',            status:'upcoming', intl:false },
  { week:1, date:'Sep 13', day:'Sun', time:'1:00 PM', home:'WAS', away:'DAL', network:'Fox',            status:'upcoming', intl:false },
  { week:1, date:'Sep 13', day:'Sun', time:'1:00 PM', home:'CLE', away:'CIN', network:'CBS',            status:'upcoming', intl:false },
  { week:1, date:'Sep 13', day:'Sun', time:'1:00 PM', home:'BUF', away:'MIA', network:'CBS',            status:'upcoming', intl:false },
  { week:1, date:'Sep 13', day:'Sun', time:'1:00 PM', home:'NO',  away:'ARI', network:'Fox',            status:'upcoming', intl:false },
  { week:1, date:'Sep 13', day:'Sun', time:'1:00 PM', home:'CHI', away:'MIN', network:'Fox',            status:'upcoming', intl:false },
  { week:1, date:'Sep 13', day:'Sun', time:'4:25 PM', home:'KC',  away:'DEN', network:'CBS',            status:'upcoming', intl:false },
  { week:1, date:'Sep 13', day:'Sun', time:'4:25 PM', home:'LV',  away:'LAC', network:'CBS',            status:'upcoming', intl:false },
  { week:1, date:'Sep 13', day:'Sun', time:'8:20 PM', home:'NYG', away:'DAL', network:'NBC/SNF',        status:'upcoming', intl:false },
  { week:1, date:'Sep 14', day:'Mon', time:'8:15 PM', home:'PHI', away:'GB',  network:'ESPN/MNF',       status:'upcoming', intl:false },

  // ── WEEK 2 · Sep 17–21 ──────────────────────────────────────────────────
  { week:2, date:'Sep 17', day:'Thu', time:'8:15 PM', home:'DET', away:'BAL', network:'Amazon/TNF',     status:'upcoming', intl:false },
  { week:2, date:'Sep 20', day:'Sun', time:'1:00 PM', home:'NE',  away:'PIT', network:'CBS',            status:'upcoming', intl:false },
  { week:2, date:'Sep 20', day:'Sun', time:'1:00 PM', home:'TEN', away:'HOU', network:'CBS',            status:'upcoming', intl:false },
  { week:2, date:'Sep 20', day:'Sun', time:'1:00 PM', home:'JAC', away:'IND', network:'CBS',            status:'upcoming', intl:false },
  { week:2, date:'Sep 20', day:'Sun', time:'1:00 PM', home:'CIN', away:'CLE', network:'CBS',            status:'upcoming', intl:false },
  { week:2, date:'Sep 20', day:'Sun', time:'1:00 PM', home:'NYJ', away:'MIA', network:'CBS',            status:'upcoming', intl:false },
  { week:2, date:'Sep 20', day:'Sun', time:'1:00 PM', home:'ATL', away:'CAR', network:'Fox',            status:'upcoming', intl:false },
  { week:2, date:'Sep 20', day:'Sun', time:'1:00 PM', home:'NO',  away:'TB',  network:'Fox',            status:'upcoming', intl:false },
  { week:2, date:'Sep 20', day:'Sun', time:'1:00 PM', home:'MIN', away:'GB',  network:'Fox',            status:'upcoming', intl:false },
  { week:2, date:'Sep 20', day:'Sun', time:'4:25 PM', home:'SEA', away:'ARI', network:'Fox',            status:'upcoming', intl:false },
  { week:2, date:'Sep 20', day:'Sun', time:'4:25 PM', home:'DEN', away:'LV',  network:'CBS',            status:'upcoming', intl:false },
  { week:2, date:'Sep 20', day:'Sun', time:'4:25 PM', home:'SF',  away:'LAC', network:'Fox',            status:'upcoming', intl:false },
  { week:2, date:'Sep 20', day:'Sun', time:'8:20 PM', home:'LA',  away:'NYG', network:'NBC/SNF',        status:'upcoming', intl:false },
  { week:2, date:'Sep 21', day:'Mon', time:'8:15 PM', home:'BUF', away:'KC',  network:'ESPN/MNF',       status:'upcoming', intl:false },

  // ── WEEK 3 · Sep 24–28 ──────────────────────────────────────────────────
  { week:3, date:'Sep 24', day:'Thu', time:'8:15 PM', home:'GB',  away:'ATL', network:'Amazon/TNF',     status:'upcoming', intl:false },
  // International — Rio de Janeiro
  { week:3, date:'Sep 27', day:'Sun', time:'1:00 PM', home:'DAL', away:'BAL', network:'CBS',            status:'upcoming', intl:true,  intlCity:'Rio de Janeiro, Brazil', note:'International Series · Estádio Nilton Santos' },
  { week:3, date:'Sep 27', day:'Sun', time:'1:00 PM', home:'NE',  away:'NYJ', network:'CBS',            status:'upcoming', intl:false },
  { week:3, date:'Sep 27', day:'Sun', time:'1:00 PM', home:'HOU', away:'IND', network:'CBS',            status:'upcoming', intl:false },
  { week:3, date:'Sep 27', day:'Sun', time:'1:00 PM', home:'PIT', away:'CLE', network:'CBS',            status:'upcoming', intl:false },
  { week:3, date:'Sep 27', day:'Sun', time:'1:00 PM', home:'TEN', away:'JAC', network:'CBS',            status:'upcoming', intl:false },
  { week:3, date:'Sep 27', day:'Sun', time:'1:00 PM', home:'TB',  away:'NO',  network:'Fox',            status:'upcoming', intl:false },
  { week:3, date:'Sep 27', day:'Sun', time:'1:00 PM', home:'DET', away:'MIN', network:'Fox',            status:'upcoming', intl:false },
  { week:3, date:'Sep 27', day:'Sun', time:'1:00 PM', home:'CAR', away:'ARI', network:'Fox',            status:'upcoming', intl:false },
  { week:3, date:'Sep 27', day:'Sun', time:'4:25 PM', home:'SEA', away:'SF',  network:'Fox',            status:'upcoming', intl:false },
  { week:3, date:'Sep 27', day:'Sun', time:'4:25 PM', home:'KC',  away:'LAC', network:'CBS',            status:'upcoming', intl:false },
  { week:3, date:'Sep 27', day:'Sun', time:'4:25 PM', home:'DEN', away:'LV',  network:'CBS',            status:'upcoming', intl:false },
  { week:3, date:'Sep 27', day:'Sun', time:'8:20 PM', home:'LA',  away:'DEN', network:'NBC/SNF',        status:'upcoming', intl:false },
  { week:3, date:'Sep 28', day:'Mon', time:'8:15 PM', home:'CHI', away:'PHI', network:'ESPN/MNF',       status:'upcoming', intl:false },

  // ── WEEK 4 · Oct 1–5 ────────────────────────────────────────────────────
  { week:4, date:'Oct 1',  day:'Thu', time:'8:15 PM', home:'MIA', away:'NE',  network:'Amazon/TNF',     status:'upcoming', intl:false },
  // International — London
  { week:4, date:'Oct 4',  day:'Sun', time:'9:30 AM', home:'WAS', away:'IND', network:'NFL Network',    status:'upcoming', intl:true,  intlCity:'London, UK', note:'International Series · Tottenham Hotspur Stadium' },
  { week:4, date:'Oct 4',  day:'Sun', time:'1:00 PM', home:'BUF', away:'NYJ', network:'CBS',            status:'upcoming', intl:false },
  { week:4, date:'Oct 4',  day:'Sun', time:'1:00 PM', home:'JAC', away:'HOU', network:'CBS',            status:'upcoming', intl:false },
  { week:4, date:'Oct 4',  day:'Sun', time:'1:00 PM', home:'CIN', away:'PIT', network:'CBS',            status:'upcoming', intl:false },
  { week:4, date:'Oct 4',  day:'Sun', time:'1:00 PM', home:'TEN', away:'CLE', network:'CBS',            status:'upcoming', intl:false },
  { week:4, date:'Oct 4',  day:'Sun', time:'1:00 PM', home:'ATL', away:'NO',  network:'Fox',            status:'upcoming', intl:false },
  { week:4, date:'Oct 4',  day:'Sun', time:'1:00 PM', home:'CHI', away:'DET', network:'Fox',            status:'upcoming', intl:false },
  { week:4, date:'Oct 4',  day:'Sun', time:'1:00 PM', home:'NYG', away:'PHI', network:'Fox',            status:'upcoming', intl:false },
  { week:4, date:'Oct 4',  day:'Sun', time:'4:25 PM', home:'SF',  away:'SEA', network:'Fox',            status:'upcoming', intl:false },
  { week:4, date:'Oct 4',  day:'Sun', time:'4:25 PM', home:'KC',  away:'LV',  network:'CBS',            status:'upcoming', intl:false },
  { week:4, date:'Oct 4',  day:'Sun', time:'4:25 PM', home:'LA',  away:'ARI', network:'Fox',            status:'upcoming', intl:false },
  { week:4, date:'Oct 4',  day:'Sun', time:'8:20 PM', home:'CAR', away:'DET', network:'NBC/SNF',        status:'upcoming', intl:false },
  { week:4, date:'Oct 5',  day:'Mon', time:'8:15 PM', home:'GB',  away:'NYG', network:'ESPN/MNF',       status:'upcoming', intl:false },

  // ── WEEK 5 · Oct 8–12 ───────────────────────────────────────────────────
  { week:5, date:'Oct 8',  day:'Thu', time:'8:15 PM', home:'TB',  away:'DAL', network:'Amazon/TNF',     status:'upcoming', intl:false },
  // International — London
  { week:5, date:'Oct 11', day:'Sun', time:'9:30 AM', home:'PHI', away:'JAC', network:'NFL Network',    status:'upcoming', intl:true,  intlCity:'London, UK', note:'International Series · Wembley Stadium' },
  { week:5, date:'Oct 11', day:'Sun', time:'1:00 PM', home:'NE',  away:'MIA', network:'CBS',            status:'upcoming', intl:false },
  { week:5, date:'Oct 11', day:'Sun', time:'1:00 PM', home:'IND', away:'TEN', network:'CBS',            status:'upcoming', intl:false },
  { week:5, date:'Oct 11', day:'Sun', time:'1:00 PM', home:'CLE', away:'CIN', network:'CBS',            status:'upcoming', intl:false },
  { week:5, date:'Oct 11', day:'Sun', time:'1:00 PM', home:'NYJ', away:'HOU', network:'CBS',            status:'upcoming', intl:false },
  { week:5, date:'Oct 11', day:'Sun', time:'1:00 PM', home:'MIN', away:'CHI', network:'Fox',            status:'upcoming', intl:false },
  { week:5, date:'Oct 11', day:'Sun', time:'1:00 PM', home:'LV',  away:'ARI', network:'Fox',            status:'upcoming', intl:false },
  { week:5, date:'Oct 11', day:'Sun', time:'1:00 PM', home:'NO',  away:'CAR', network:'Fox',            status:'upcoming', intl:false },
  { week:5, date:'Oct 11', day:'Sun', time:'4:25 PM', home:'SEA', away:'DEN', network:'Fox',            status:'upcoming', intl:false },
  { week:5, date:'Oct 11', day:'Sun', time:'4:25 PM', home:'LAC', away:'KC',  network:'CBS',            status:'upcoming', intl:false },
  { week:5, date:'Oct 11', day:'Sun', time:'8:20 PM', home:'LA',  away:'BUF', network:'NBC/SNF',        status:'upcoming', intl:false },
  { week:5, date:'Oct 12', day:'Mon', time:'8:15 PM', home:'LA',  away:'BUF', network:'ESPN/MNF',       status:'upcoming', intl:false },

  // ── WEEK 6 · Oct 15–19 ──────────────────────────────────────────────────
  { week:6, date:'Oct 15', day:'Thu', time:'8:15 PM', home:'DEN', away:'SEA', network:'Amazon/TNF',     status:'upcoming', intl:false, note:'AFC/NFC West clash' },
  { week:6, date:'Oct 18', day:'Sun', time:'1:00 PM', home:'BUF', away:'NE',  network:'CBS',            status:'upcoming', intl:false },
  { week:6, date:'Oct 18', day:'Sun', time:'1:00 PM', home:'PIT', away:'BAL', network:'CBS',            status:'upcoming', intl:false },
  { week:6, date:'Oct 18', day:'Sun', time:'1:00 PM', home:'JAC', away:'TEN', network:'CBS',            status:'upcoming', intl:false },
  { week:6, date:'Oct 18', day:'Sun', time:'1:00 PM', home:'IND', away:'NYJ', network:'CBS',            status:'upcoming', intl:false },
  { week:6, date:'Oct 18', day:'Sun', time:'1:00 PM', home:'ATL', away:'NO',  network:'Fox',            status:'upcoming', intl:false },
  { week:6, date:'Oct 18', day:'Sun', time:'1:00 PM', home:'MIN', away:'DET', network:'Fox',            status:'upcoming', intl:false },
  { week:6, date:'Oct 18', day:'Sun', time:'1:00 PM', home:'CHI', away:'GB',  network:'Fox',            status:'upcoming', intl:false },
  { week:6, date:'Oct 18', day:'Sun', time:'1:00 PM', home:'LV',  away:'KC',  network:'CBS',            status:'upcoming', intl:false },
  { week:6, date:'Oct 18', day:'Sun', time:'4:25 PM', home:'LA',  away:'ARI', network:'Fox',            status:'upcoming', intl:false },
  { week:6, date:'Oct 18', day:'Sun', time:'4:25 PM', home:'LAC', away:'LV',  network:'CBS',            status:'upcoming', intl:false },
  { week:6, date:'Oct 18', day:'Sun', time:'8:20 PM', home:'SF',  away:'WAS', network:'NBC/SNF',        status:'upcoming', intl:false },
  { week:6, date:'Oct 19', day:'Mon', time:'8:15 PM', home:'SF',  away:'WAS', network:'ESPN/MNF',       status:'upcoming', intl:false },

  // ── WEEK 7 · Oct 22–26 ──────────────────────────────────────────────────
  { week:7, date:'Oct 22', day:'Thu', time:'8:15 PM', home:'CHI', away:'NE',  network:'Amazon/TNF',     status:'upcoming', intl:false },
  // International — Paris
  { week:7, date:'Oct 25', day:'Sun', time:'3:00 PM', home:'NO',  away:'PIT', network:'NFL Network',    status:'upcoming', intl:true,  intlCity:'Paris, France', note:'International Series · Stade de France' },
  { week:7, date:'Oct 25', day:'Sun', time:'1:00 PM', home:'MIA', away:'BUF', network:'CBS',            status:'upcoming', intl:false },
  { week:7, date:'Oct 25', day:'Sun', time:'1:00 PM', home:'HOU', away:'TEN', network:'CBS',            status:'upcoming', intl:false },
  { week:7, date:'Oct 25', day:'Sun', time:'1:00 PM', home:'CIN', away:'CLE', network:'CBS',            status:'upcoming', intl:false },
  { week:7, date:'Oct 25', day:'Sun', time:'1:00 PM', home:'CAR', away:'ATL', network:'Fox',            status:'upcoming', intl:false },
  { week:7, date:'Oct 25', day:'Sun', time:'1:00 PM', home:'NYG', away:'WAS', network:'Fox',            status:'upcoming', intl:false },
  { week:7, date:'Oct 25', day:'Sun', time:'1:00 PM', home:'GB',  away:'MIN', network:'Fox',            status:'upcoming', intl:false },
  { week:7, date:'Oct 25', day:'Sun', time:'1:00 PM', home:'DAL', away:'PHI', network:'Fox',            status:'upcoming', intl:false },
  { week:7, date:'Oct 25', day:'Sun', time:'4:25 PM', home:'SEA', away:'KC',  network:'CBS',            status:'upcoming', intl:false },
  { week:7, date:'Oct 25', day:'Sun', time:'4:25 PM', home:'SF',  away:'LA',  network:'Fox',            status:'upcoming', intl:false },
  { week:7, date:'Oct 25', day:'Sun', time:'8:20 PM', home:'SEA', away:'KC',  network:'NBC/SNF',        status:'upcoming', intl:false },
  { week:7, date:'Oct 26', day:'Mon', time:'8:15 PM', home:'PHI', away:'DAL', network:'ESPN/MNF',       status:'upcoming', intl:false },

  // ── WEEK 8 · Oct 29 – Nov 2 ─────────────────────────────────────────────
  { week:8, date:'Oct 29', day:'Thu', time:'8:15 PM', home:'CAR', away:'GB',  network:'Amazon/TNF',     status:'upcoming', intl:false },
  { week:8, date:'Nov 1',  day:'Sun', time:'1:00 PM', home:'NYJ', away:'BUF', network:'CBS',            status:'upcoming', intl:false },
  { week:8, date:'Nov 1',  day:'Sun', time:'1:00 PM', home:'BAL', away:'NE',  network:'CBS',            status:'upcoming', intl:false },
  { week:8, date:'Nov 1',  day:'Sun', time:'1:00 PM', home:'PIT', away:'CIN', network:'CBS',            status:'upcoming', intl:false },
  { week:8, date:'Nov 1',  day:'Sun', time:'1:00 PM', home:'JAC', away:'HOU', network:'CBS',            status:'upcoming', intl:false },
  { week:8, date:'Nov 1',  day:'Sun', time:'1:00 PM', home:'TEN', away:'IND', network:'CBS',            status:'upcoming', intl:false },
  { week:8, date:'Nov 1',  day:'Sun', time:'1:00 PM', home:'ATL', away:'TB',  network:'Fox',            status:'upcoming', intl:false },
  { week:8, date:'Nov 1',  day:'Sun', time:'1:00 PM', home:'DET', away:'NO',  network:'Fox',            status:'upcoming', intl:false },
  { week:8, date:'Nov 1',  day:'Sun', time:'1:00 PM', home:'DAL', away:'WAS', network:'Fox',            status:'upcoming', intl:false },
  { week:8, date:'Nov 1',  day:'Sun', time:'4:25 PM', home:'KC',  away:'LV',  network:'CBS',            status:'upcoming', intl:false },
  { week:8, date:'Nov 1',  day:'Sun', time:'4:25 PM', home:'LAC', away:'DEN', network:'CBS',            status:'upcoming', intl:false },
  { week:8, date:'Nov 1',  day:'Sun', time:'4:25 PM', home:'ARI', away:'SEA', network:'Fox',            status:'upcoming', intl:false },
  { week:8, date:'Nov 1',  day:'Sun', time:'8:20 PM', home:'SEA', away:'CHI', network:'NBC/SNF',        status:'upcoming', intl:false },
  { week:8, date:'Nov 2',  day:'Mon', time:'8:15 PM', home:'WAS', away:'PHI', network:'ESPN/MNF',       status:'upcoming', intl:false },

  // ── WEEK 9 · Nov 5–9 ────────────────────────────────────────────────────
  // International — Madrid, Spain (Bengals vs Falcons)
  { week:9, date:'Nov 8',  day:'Sun', time:'2:00 PM', home:'ATL', away:'CIN', network:'NFL Network',    status:'upcoming', intl:true,  intlCity:'Madrid, Spain', note:'International Series · Estadio Santiago Bernabéu' },
  { week:9, date:'Nov 5',  day:'Thu', time:'8:15 PM', home:'SF',  away:'LA',  network:'Amazon/TNF',     status:'upcoming', intl:false },
  { week:9, date:'Nov 8',  day:'Sun', time:'1:00 PM', home:'NE',  away:'MIA', network:'CBS',            status:'upcoming', intl:false },
  { week:9, date:'Nov 8',  day:'Sun', time:'1:00 PM', home:'BUF', away:'NYJ', network:'CBS',            status:'upcoming', intl:false },
  { week:9, date:'Nov 8',  day:'Sun', time:'1:00 PM', home:'HOU', away:'JAC', network:'CBS',            status:'upcoming', intl:false },
  { week:9, date:'Nov 8',  day:'Sun', time:'1:00 PM', home:'CLE', away:'PIT', network:'CBS',            status:'upcoming', intl:false },
  { week:9, date:'Nov 8',  day:'Sun', time:'1:00 PM', home:'DET', away:'CHI', network:'Fox',            status:'upcoming', intl:false },
  { week:9, date:'Nov 8',  day:'Sun', time:'1:00 PM', home:'NO',  away:'CAR', network:'Fox',            status:'upcoming', intl:false },
  { week:9, date:'Nov 8',  day:'Sun', time:'4:25 PM', home:'DEN', away:'KC',  network:'CBS',            status:'upcoming', intl:false },
  { week:9, date:'Nov 8',  day:'Sun', time:'4:25 PM', home:'SEA', away:'ARI', network:'Fox',            status:'upcoming', intl:false },
  { week:9, date:'Nov 8',  day:'Sun', time:'8:20 PM', home:'TB',  away:'CHI', network:'NBC/SNF',        status:'upcoming', intl:false },
  { week:9, date:'Nov 9',  day:'Mon', time:'8:15 PM', home:'MIN', away:'BUF', network:'ESPN/MNF',       status:'upcoming', intl:false },

  // ── WEEK 10 · Nov 12–16 ─────────────────────────────────────────────────
  { week:10, date:'Nov 12', day:'Thu', time:'8:15 PM', home:'NYJ', away:'IND', network:'Amazon/TNF',    status:'upcoming', intl:false },
  // International — Munich, Germany (Lions vs Patriots)
  { week:10, date:'Nov 15', day:'Sun', time:'9:30 AM', home:'DET', away:'NE',  network:'Fox',           status:'upcoming', intl:true,  intlCity:'Munich, Germany', note:'International Series · Allianz Arena' },
  { week:10, date:'Nov 15', day:'Sun', time:'1:00 PM', home:'MIA', away:'HOU', network:'CBS',           status:'upcoming', intl:false },
  { week:10, date:'Nov 15', day:'Sun', time:'1:00 PM', home:'CIN', away:'BAL', network:'CBS',           status:'upcoming', intl:false },
  { week:10, date:'Nov 15', day:'Sun', time:'1:00 PM', home:'TEN', away:'CLE', network:'CBS',           status:'upcoming', intl:false },
  { week:10, date:'Nov 15', day:'Sun', time:'1:00 PM', home:'TB',  away:'ATL', network:'Fox',           status:'upcoming', intl:false },
  { week:10, date:'Nov 15', day:'Sun', time:'1:00 PM', home:'CAR', away:'DAL', network:'Fox',           status:'upcoming', intl:false },
  { week:10, date:'Nov 15', day:'Sun', time:'1:00 PM', home:'PHI', away:'NYG', network:'Fox',           status:'upcoming', intl:false },
  { week:10, date:'Nov 15', day:'Sun', time:'4:25 PM', home:'SEA', away:'SF',  network:'Fox',           status:'upcoming', intl:false },
  { week:10, date:'Nov 15', day:'Sun', time:'4:25 PM', home:'LV',  away:'LAC', network:'CBS',           status:'upcoming', intl:false },
  { week:10, date:'Nov 15', day:'Sun', time:'4:25 PM', home:'LA',  away:'DEN', network:'CBS',           status:'upcoming', intl:false },
  { week:10, date:'Nov 15', day:'Sun', time:'8:20 PM', home:'WAS', away:'NYG', network:'NBC/SNF',       status:'upcoming', intl:false },
  { week:10, date:'Nov 16', day:'Mon', time:'8:15 PM', home:'GB',  away:'MIN', network:'ESPN/MNF',       status:'upcoming', intl:false },

  // ── WEEK 11 · Nov 19–23 ─────────────────────────────────────────────────
  { week:11, date:'Nov 19', day:'Thu', time:'8:15 PM', home:'KC',  away:'LV',  network:'Amazon/TNF',    status:'upcoming', intl:false },
  // International — Mexico City (Vikings vs 49ers)
  { week:11, date:'Nov 22', day:'Sun', time:'8:20 PM', home:'MIN', away:'SF',  network:'NBC',           status:'upcoming', intl:true,  intlCity:'Mexico City, Mexico', note:'International Series · Estadio Azteca' },
  { week:11, date:'Nov 22', day:'Sun', time:'1:00 PM', home:'HOU', away:'NE',  network:'CBS',           status:'upcoming', intl:false },
  { week:11, date:'Nov 22', day:'Sun', time:'1:00 PM', home:'BAL', away:'PIT', network:'CBS',           status:'upcoming', intl:false },
  { week:11, date:'Nov 22', day:'Sun', time:'1:00 PM', home:'MIA', away:'BUF', network:'CBS',           status:'upcoming', intl:false },
  { week:11, date:'Nov 22', day:'Sun', time:'1:00 PM', home:'JAC', away:'TEN', network:'CBS',           status:'upcoming', intl:false },
  { week:11, date:'Nov 22', day:'Sun', time:'1:00 PM', home:'NO',  away:'ATL', network:'Fox',           status:'upcoming', intl:false },
  { week:11, date:'Nov 22', day:'Sun', time:'1:00 PM', home:'DET', away:'CAR', network:'Fox',           status:'upcoming', intl:false },
  { week:11, date:'Nov 22', day:'Sun', time:'1:00 PM', home:'WAS', away:'CIN', network:'Fox',           status:'upcoming', intl:false },
  { week:11, date:'Nov 22', day:'Sun', time:'1:00 PM', home:'GB',  away:'NYG', network:'Fox',           status:'upcoming', intl:false },
  { week:11, date:'Nov 22', day:'Sun', time:'4:25 PM', home:'SEA', away:'LAC', network:'CBS',           status:'upcoming', intl:false },
  { week:11, date:'Nov 22', day:'Sun', time:'4:25 PM', home:'ARI', away:'LA',  network:'Fox',           status:'upcoming', intl:false },
  { week:11, date:'Nov 23', day:'Mon', time:'8:15 PM', home:'PHI', away:'WAS', network:'ESPN/MNF',      status:'upcoming', intl:false },

  // ── WEEK 12 · Nov 25–30 (THANKSGIVING WEEK) ─────────────────────────────
  // Wednesday — Thanksgiving Eve (NEW!)
  { week:12, date:'Nov 25', day:'Wed', time:'8:00 PM', home:'LA',  away:'GB',  network:'Netflix',       status:'upcoming', intl:false, note:'Thanksgiving Eve · First ever Wed night NFL game' },
  // Thanksgiving Thursday
  { week:12, date:'Nov 26', day:'Thu', time:'12:30 PM',home:'DET', away:'CHI', network:'CBS',           status:'upcoming', intl:false, note:'Thanksgiving' },
  { week:12, date:'Nov 26', day:'Thu', time:'4:30 PM', home:'DAL', away:'PHI', network:'Fox',           status:'upcoming', intl:false, note:'Thanksgiving' },
  { week:12, date:'Nov 26', day:'Thu', time:'8:20 PM', home:'BUF', away:'KC',  network:'NBC',           status:'upcoming', intl:false, note:'Thanksgiving' },
  // Black Friday
  { week:12, date:'Nov 27', day:'Fri', time:'3:00 PM', home:'PIT', away:'DEN', network:'Amazon',        status:'upcoming', intl:false, note:'Black Friday' },
  // Sunday
  { week:12, date:'Nov 29', day:'Sun', time:'1:00 PM', home:'NE',  away:'MIA', network:'CBS',           status:'upcoming', intl:false },
  { week:12, date:'Nov 29', day:'Sun', time:'1:00 PM', home:'HOU', away:'JAC', network:'CBS',           status:'upcoming', intl:false },
  { week:12, date:'Nov 29', day:'Sun', time:'1:00 PM', home:'CLE', away:'CIN', network:'CBS',           status:'upcoming', intl:false },
  { week:12, date:'Nov 29', day:'Sun', time:'1:00 PM', home:'TEN', away:'BAL', network:'CBS',           status:'upcoming', intl:false },
  { week:12, date:'Nov 29', day:'Sun', time:'1:00 PM', home:'ATL', away:'CAR', network:'Fox',           status:'upcoming', intl:false },
  { week:12, date:'Nov 29', day:'Sun', time:'1:00 PM', home:'WAS', away:'NO',  network:'Fox',           status:'upcoming', intl:false },
  { week:12, date:'Nov 29', day:'Sun', time:'4:25 PM', home:'SEA', away:'SF',  network:'Fox',           status:'upcoming', intl:false },
  { week:12, date:'Nov 29', day:'Sun', time:'4:25 PM', home:'LAC', away:'LV',  network:'CBS',           status:'upcoming', intl:false },
  { week:12, date:'Nov 30', day:'Mon', time:'8:15 PM', home:'TB',  away:'CAR', network:'ESPN/MNF',      status:'upcoming', intl:false },

  // ── WEEK 13 · Dec 3–7 ───────────────────────────────────────────────────
  { week:13, date:'Dec 3',  day:'Thu', time:'8:15 PM', home:'LA',  away:'KC',  network:'Amazon/TNF',    status:'upcoming', intl:false },
  { week:13, date:'Dec 6',  day:'Sun', time:'1:00 PM', home:'BAL', away:'NE',  network:'CBS',           status:'upcoming', intl:false },
  { week:13, date:'Dec 6',  day:'Sun', time:'1:00 PM', home:'BUF', away:'MIA', network:'CBS',           status:'upcoming', intl:false },
  { week:13, date:'Dec 6',  day:'Sun', time:'1:00 PM', home:'PIT', away:'CIN', network:'CBS',           status:'upcoming', intl:false },
  { week:13, date:'Dec 6',  day:'Sun', time:'1:00 PM', home:'HOU', away:'TEN', network:'CBS',           status:'upcoming', intl:false },
  { week:13, date:'Dec 6',  day:'Sun', time:'1:00 PM', home:'NYJ', away:'JAC', network:'CBS',           status:'upcoming', intl:false },
  { week:13, date:'Dec 6',  day:'Sun', time:'1:00 PM', home:'NO',  away:'ATL', network:'Fox',           status:'upcoming', intl:false },
  { week:13, date:'Dec 6',  day:'Sun', time:'1:00 PM', home:'GB',  away:'CHI', network:'Fox',           status:'upcoming', intl:false },
  { week:13, date:'Dec 6',  day:'Sun', time:'1:00 PM', home:'NYG', away:'WAS', network:'Fox',           status:'upcoming', intl:false },
  { week:13, date:'Dec 6',  day:'Sun', time:'4:25 PM', home:'SEA', away:'DAL', network:'Fox',           status:'upcoming', intl:false },
  { week:13, date:'Dec 6',  day:'Sun', time:'4:25 PM', home:'DEN', away:'LV',  network:'CBS',           status:'upcoming', intl:false },
  { week:13, date:'Dec 6',  day:'Sun', time:'4:25 PM', home:'ARI', away:'LAC', network:'Fox',           status:'upcoming', intl:false },
  { week:13, date:'Dec 6',  day:'Sun', time:'8:20 PM', home:'SEA', away:'DAL', network:'NBC/SNF',       status:'upcoming', intl:false },
  { week:13, date:'Dec 7',  day:'Mon', time:'8:15 PM', home:'GB',  away:'DAL', network:'ESPN/MNF',      status:'upcoming', intl:false },

  // ── WEEK 14 · Dec 10–14 ─────────────────────────────────────────────────
  { week:14, date:'Dec 10', day:'Thu', time:'8:15 PM', home:'MIN', away:'NE',  network:'Amazon/TNF',    status:'upcoming', intl:false },
  { week:14, date:'Dec 13', day:'Sun', time:'1:00 PM', home:'MIA', away:'NYJ', network:'CBS',           status:'upcoming', intl:false },
  { week:14, date:'Dec 13', day:'Sun', time:'1:00 PM', home:'BUF', away:'IND', network:'CBS',           status:'upcoming', intl:false },
  { week:14, date:'Dec 13', day:'Sun', time:'1:00 PM', home:'BAL', away:'HOU', network:'CBS',           status:'upcoming', intl:false },
  { week:14, date:'Dec 13', day:'Sun', time:'1:00 PM', home:'TEN', away:'PIT', network:'CBS',           status:'upcoming', intl:false },
  { week:14, date:'Dec 13', day:'Sun', time:'1:00 PM', home:'JAC', away:'CLE', network:'CBS',           status:'upcoming', intl:false },
  { week:14, date:'Dec 13', day:'Sun', time:'1:00 PM', home:'DET', away:'GB',  network:'Fox',           status:'upcoming', intl:false },
  { week:14, date:'Dec 13', day:'Sun', time:'1:00 PM', home:'CAR', away:'NO',  network:'Fox',           status:'upcoming', intl:false },
  { week:14, date:'Dec 13', day:'Sun', time:'4:25 PM', home:'KC',  away:'SEA', network:'CBS',           status:'upcoming', intl:false },
  { week:14, date:'Dec 13', day:'Sun', time:'4:25 PM', home:'SF',  away:'LA',  network:'Fox',           status:'upcoming', intl:false },
  { week:14, date:'Dec 13', day:'Sun', time:'4:25 PM', home:'DEN', away:'ARI', network:'CBS',           status:'upcoming', intl:false },
  { week:14, date:'Dec 13', day:'Sun', time:'8:20 PM', home:'GB',  away:'BUF', network:'NBC/SNF',       status:'upcoming', intl:false },
  { week:14, date:'Dec 14', day:'Mon', time:'8:15 PM', home:'JAC', away:'PHI', network:'ESPN/MNF',      status:'upcoming', intl:false },

  // ── WEEK 15 · Dec 17–21 ─────────────────────────────────────────────────
  { week:15, date:'Dec 17', day:'Thu', time:'8:15 PM', home:'LAC', away:'SF',  network:'Amazon/TNF',    status:'upcoming', intl:false },
  { week:15, date:'Dec 20', day:'Sun', time:'1:00 PM', home:'NYJ', away:'NE',  network:'CBS',           status:'upcoming', intl:false },
  { week:15, date:'Dec 20', day:'Sun', time:'1:00 PM', home:'MIA', away:'BUF', network:'CBS',           status:'upcoming', intl:false },
  { week:15, date:'Dec 20', day:'Sun', time:'1:00 PM', home:'BAL', away:'CIN', network:'CBS',           status:'upcoming', intl:false },
  { week:15, date:'Dec 20', day:'Sun', time:'1:00 PM', home:'HOU', away:'PIT', network:'CBS',           status:'upcoming', intl:false },
  { week:15, date:'Dec 20', day:'Sun', time:'1:00 PM', home:'IND', away:'TEN', network:'CBS',           status:'upcoming', intl:false },
  { week:15, date:'Dec 20', day:'Sun', time:'1:00 PM', home:'ATL', away:'TB',  network:'Fox',           status:'upcoming', intl:false },
  { week:15, date:'Dec 20', day:'Sun', time:'1:00 PM', home:'CAR', away:'NO',  network:'Fox',           status:'upcoming', intl:false },
  { week:15, date:'Dec 20', day:'Sun', time:'1:00 PM', home:'WAS', away:'DAL', network:'Fox',           status:'upcoming', intl:false },
  { week:15, date:'Dec 20', day:'Sun', time:'4:25 PM', home:'KC',  away:'LAC', network:'CBS',           status:'upcoming', intl:false },
  { week:15, date:'Dec 20', day:'Sun', time:'4:25 PM', home:'LA',  away:'ARI', network:'Fox',           status:'upcoming', intl:false },
  { week:15, date:'Dec 20', day:'Sun', time:'8:20 PM', home:'DET', away:'MIN', network:'NBC/SNF',       status:'upcoming', intl:false },
  { week:15, date:'Dec 21', day:'Mon', time:'8:15 PM', home:'PHI', away:'SEA', network:'ESPN/MNF',       status:'upcoming', intl:false },

  // ── WEEK 16 · Dec 24–28 (CHRISTMAS WEEK) ────────────────────────────────
  // Christmas Eve — Thu
  { week:16, date:'Dec 24', day:'Thu', time:'8:15 PM', home:'PHI', away:'HOU', network:'Amazon',        status:'upcoming', intl:false, note:'Christmas Eve' },
  // Christmas Day — Fri
  { week:16, date:'Dec 25', day:'Fri', time:'1:00 PM', home:'SEA', away:'LA',  network:'Fox',           status:'upcoming', intl:false, note:'Christmas Day' },
  { week:16, date:'Dec 25', day:'Fri', time:'4:30 PM', home:'CHI', away:'GB',  network:'Netflix',       status:'upcoming', intl:false, note:'Christmas Day' },
  // Sunday
  { week:16, date:'Dec 27', day:'Sun', time:'1:00 PM', home:'NE',  away:'MIA', network:'CBS',           status:'upcoming', intl:false },
  { week:16, date:'Dec 27', day:'Sun', time:'1:00 PM', home:'BAL', away:'BUF', network:'CBS',           status:'upcoming', intl:false },
  { week:16, date:'Dec 27', day:'Sun', time:'1:00 PM', home:'CIN', away:'PIT', network:'CBS',           status:'upcoming', intl:false },
  { week:16, date:'Dec 27', day:'Sun', time:'1:00 PM', home:'JAC', away:'TEN', network:'CBS',           status:'upcoming', intl:false },
  { week:16, date:'Dec 27', day:'Sun', time:'1:00 PM', home:'NO',  away:'CAR', network:'Fox',           status:'upcoming', intl:false },
  { week:16, date:'Dec 27', day:'Sun', time:'1:00 PM', home:'MIN', away:'DET', network:'Fox',           status:'upcoming', intl:false },
  { week:16, date:'Dec 27', day:'Sun', time:'4:25 PM', home:'LV',  away:'DEN', network:'CBS',           status:'upcoming', intl:false },
  { week:16, date:'Dec 27', day:'Sun', time:'4:25 PM', home:'LAC', away:'KC',  network:'CBS',           status:'upcoming', intl:false },
  { week:16, date:'Dec 27', day:'Sun', time:'8:20 PM', home:'DET', away:'NYG', network:'NBC/SNF',       status:'upcoming', intl:false },
  { week:16, date:'Dec 28', day:'Mon', time:'8:15 PM', home:'BUF', away:'DEN', network:'ESPN/MNF',      status:'upcoming', intl:false, note:'SB LX Rematch' },

  // ── WEEK 17 · Dec 31 – Jan 4, 2027 ─────────────────────────────────────
  // New Year's Eve game
  { week:17, date:'Dec 31', day:'Thu', time:'8:15 PM', home:'NYJ', away:'MIA', network:'Amazon/TNF',    status:'upcoming', intl:false, note:"New Year's Eve" },
  // Championship rematches
  { week:17, date:'Jan 3',  day:'Sun', time:'1:00 PM', home:'NE',  away:'DEN', network:'CBS',           status:'upcoming', intl:false, note:'AFC Championship Rematch' },
  { week:17, date:'Jan 3',  day:'Sun', time:'1:00 PM', home:'MIA', away:'BUF', network:'CBS',           status:'upcoming', intl:false },
  { week:17, date:'Jan 3',  day:'Sun', time:'1:00 PM', home:'BAL', away:'PIT', network:'CBS',           status:'upcoming', intl:false },
  { week:17, date:'Jan 3',  day:'Sun', time:'1:00 PM', home:'HOU', away:'JAC', network:'CBS',           status:'upcoming', intl:false },
  { week:17, date:'Jan 3',  day:'Sun', time:'1:00 PM', home:'CLE', away:'TEN', network:'CBS',           status:'upcoming', intl:false },
  { week:17, date:'Jan 3',  day:'Sun', time:'1:00 PM', home:'NO',  away:'ATL', network:'Fox',           status:'upcoming', intl:false },
  { week:17, date:'Jan 3',  day:'Sun', time:'1:00 PM', home:'DAL', away:'NYG', network:'Fox',           status:'upcoming', intl:false },
  { week:17, date:'Jan 3',  day:'Sun', time:'4:25 PM', home:'KC',  away:'LV',  network:'CBS',           status:'upcoming', intl:false },
  { week:17, date:'Jan 3',  day:'Sun', time:'4:25 PM', home:'LAC', away:'ARI', network:'CBS',           status:'upcoming', intl:false },
  { week:17, date:'Jan 3',  day:'Sun', time:'8:20 PM', home:'GB',  away:'HOU', network:'NBC/SNF',       status:'upcoming', intl:false },
  { week:17, date:'Jan 4',  day:'Mon', time:'8:15 PM', home:'SF',  away:'PHI', network:'ESPN/MNF',      status:'upcoming', intl:false },

  // ── WEEK 18 · Jan 8–10, 2027 (ALL INTRA-DIVISION) ───────────────────────
  { week:18, date:'Jan 10', day:'Sun', time:'TBD',     home:'NE',  away:'MIA', network:'TBD',           status:'upcoming', intl:false, note:'All Week 18 games at same time' },
  { week:18, date:'Jan 10', day:'Sun', time:'TBD',     home:'BUF', away:'NYJ', network:'TBD',           status:'upcoming', intl:false },
  { week:18, date:'Jan 10', day:'Sun', time:'TBD',     home:'BAL', away:'CLE', network:'TBD',           status:'upcoming', intl:false },
  { week:18, date:'Jan 10', day:'Sun', time:'TBD',     home:'CIN', away:'PIT', network:'TBD',           status:'upcoming', intl:false },
  { week:18, date:'Jan 10', day:'Sun', time:'TBD',     home:'HOU', away:'TEN', network:'TBD',           status:'upcoming', intl:false },
  { week:18, date:'Jan 10', day:'Sun', time:'TBD',     home:'IND', away:'JAC', network:'TBD',           status:'upcoming', intl:false },
  { week:18, date:'Jan 10', day:'Sun', time:'TBD',     home:'DEN', away:'KC',  network:'TBD',           status:'upcoming', intl:false },
  { week:18, date:'Jan 10', day:'Sun', time:'TBD',     home:'LV',  away:'LAC', network:'TBD',           status:'upcoming', intl:false },
  { week:18, date:'Jan 10', day:'Sun', time:'TBD',     home:'DAL', away:'WAS', network:'TBD',           status:'upcoming', intl:false },
  { week:18, date:'Jan 10', day:'Sun', time:'TBD',     home:'PHI', away:'NYG', network:'TBD',           status:'upcoming', intl:false },
  { week:18, date:'Jan 10', day:'Sun', time:'TBD',     home:'CHI', away:'MIN', network:'TBD',           status:'upcoming', intl:false },
  { week:18, date:'Jan 10', day:'Sun', time:'TBD',     home:'DET', away:'GB',  network:'TBD',           status:'upcoming', intl:false },
  { week:18, date:'Jan 10', day:'Sun', time:'TBD',     home:'ATL', away:'NO',  network:'TBD',           status:'upcoming', intl:false },
  { week:18, date:'Jan 10', day:'Sun', time:'TBD',     home:'TB',  away:'CAR', network:'TBD',           status:'upcoming', intl:false },
  { week:18, date:'Jan 10', day:'Sun', time:'TBD',     home:'SEA', away:'LA',  network:'TBD',           status:'upcoming', intl:false, note:'NFC Championship Rematch' },
  { week:18, date:'Jan 10', day:'Sun', time:'TBD',     home:'SF',  away:'ARI', network:'TBD',           status:'upcoming', intl:false },
]

// Lookup by team — returns all games for a team in order
export function getTeamSchedule(abbr) {
  return SCHEDULE_2026.filter(g => g.home === abbr || g.away === abbr)
}

// Get games for a specific week
export function getWeekGames(week) {
  return SCHEDULE_2026.filter(g => g.week === week)
}

// All unique teams
export const ALL_TEAMS = [...new Set(
  SCHEDULE_2026.flatMap(g => [g.home, g.away])
)].sort()

// Week labels with dates
export const WEEK_META = {
  1:  { label: 'Week 1',  dates: 'Sep 9–14, 2026',  note: 'Season Opener' },
  2:  { label: 'Week 2',  dates: 'Sep 17–21, 2026' },
  3:  { label: 'Week 3',  dates: 'Sep 24–28, 2026' },
  4:  { label: 'Week 4',  dates: 'Oct 1–5, 2026' },
  5:  { label: 'Week 5',  dates: 'Oct 8–12, 2026' },
  6:  { label: 'Week 6',  dates: 'Oct 15–19, 2026' },
  7:  { label: 'Week 7',  dates: 'Oct 22–26, 2026' },
  8:  { label: 'Week 8',  dates: 'Oct 29 – Nov 2, 2026' },
  9:  { label: 'Week 9',  dates: 'Nov 5–9, 2026' },
  10: { label: 'Week 10', dates: 'Nov 12–16, 2026' },
  11: { label: 'Week 11', dates: 'Nov 19–23, 2026' },
  12: { label: 'Week 12', dates: 'Nov 25–30, 2026', note: 'Thanksgiving Week' },
  13: { label: 'Week 13', dates: 'Dec 3–7, 2026' },
  14: { label: 'Week 14', dates: 'Dec 10–14, 2026' },
  15: { label: 'Week 15', dates: 'Dec 17–21, 2026' },
  16: { label: 'Week 16', dates: 'Dec 24–28, 2026', note: 'Christmas Week' },
  17: { label: 'Week 17', dates: 'Dec 31 – Jan 4, 2027' },
  18: { label: 'Week 18', dates: 'Jan 8–10, 2027', note: 'Regular Season Final' },
}
