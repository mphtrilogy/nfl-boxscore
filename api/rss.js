// Vercel Edge Function — Generic RSS proxy with browser-like headers
// Handles CBS Sports, ProFootballTalk, and other feeds that block simple rewrites
export const config = { runtime: 'edge' }
const FEEDS = {
  // NFL News
  pft:      'https://profootballtalk.nbcsports.com/feed/',
  cbs:      'https://www.cbssports.com/rss/headlines/nfl',
  si:       'https://www.si.com/rss/si_nfl.rss',
  ringer:   'https://www.theringer.com/rss/nfl.xml',
  usa:      'https://sports.usatoday.com/rss/nfl',
  ap:       'https://rsshub.app/apnews/topics/sports',
  // Fantasy
  rotoworld: 'https://www.rotowire.com/football/rss-news.php',
  fp:        'https://www.fantasypros.com/nfl/news/feed.xml',
  // No currently-live dedicated CBS fantasy RSS URL could be confirmed —
  // the old fantasynews.cbssports.com feed references found are from
  // 2008-2013 era CBS site structure, long since restructured. Point at
  // the confirmed-working main NFL feed instead, which already carries
  // plenty of fantasy-relevant content (betting, waiver-style stories);
  // the app's existing keyword filter narrows it down client-side.
  cbs_fant:  'https://www.cbssports.com/rss/headlines/nfl',
  espn_fant: 'https://www.espn.com/espn/rss/fantasy/football/news',
}
export default async function handler(req) {
  const url    = new URL(req.url)
  const source = url.searchParams.get('source')
  if (!source || !FEEDS[source]) {
    return new Response(JSON.stringify({ error: 'Unknown source', available: Object.keys(FEEDS) }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
  try {
    // Verified directly: fetching CBS's feed plainly (no special headers)
    // returns valid RSS immediately — the trailing slash in the original
    // URL and the Googlebot-style headers weren't needed and may have been
    // triggering different (blocked) server-side handling on CBS's end.
    const res = await fetch(FEEDS[source], {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
      },
    })
    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Feed returned ${res.status}`, source }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }
    const xml = await res.text()
    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
}
