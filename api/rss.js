// Vercel Edge Function — Generic RSS proxy with browser-like headers
// Handles CBS Sports, ProFootballTalk, and other feeds that block simple rewrites

export const config = { runtime: 'edge' }

const FEEDS = {
  // NFL News
  pft:      'https://profootballtalk.nbcsports.com/feed/',
  cbs:      'https://www.cbssports.com/rss/headlines/nfl/',
  si:       'https://www.si.com/rss/si_nfl.rss',
  ringer:   'https://www.theringer.com/rss/nfl.xml',
  usa:      'https://sports.usatoday.com/rss/nfl',
  ap:       'https://rsshub.app/apnews/topics/sports',
  // Fantasy
  rotoworld: 'https://www.rotowire.com/football/rss-news.php',
  fp:        'https://www.fantasypros.com/nfl/news/feed.xml',
  cbs_fant:  'https://www.cbssports.com/rss/headlines/fantasy/football/',
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
    const res = await fetch(FEEDS[source], {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Referer': 'https://www.google.com/',
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
