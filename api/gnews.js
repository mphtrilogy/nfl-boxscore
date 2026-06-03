// Vercel Serverless Function — Google News RSS proxy
// Runs at the edge, bypasses IP blocks that affect simple rewrites

export const config = { runtime: 'edge' }

export default async function handler(req) {
  const url = new URL(req.url)
  const q    = url.searchParams.get('q')    || 'NFL football'
  const type = url.searchParams.get('type') || 'search' // 'search' | 'topic'

  // Google News topic IDs for stable, high-quality feeds
  const TOPICS = {
    nfl:     'CAAqIQgKIhtDQkFTRGdvSUwyMHZNREp5ZVdFU0FtVnVLQUFQAQ',
    fantasy: 'CAAqJggKIiBDQkFTRWdvSUwyMHZNREp5ZVdFU0FtVnVHZ0pWVXlnQVAB',
    sports:  'CAAqJggKIiBDQkFTRWdvSUwyMHZNREoyZFdNU0FtVnVHZ0pWVXlnQVAB',
  }

  let rssUrl
  if (type === 'topic' && TOPICS[q]) {
    rssUrl = `https://news.google.com/rss/topics/${TOPICS[q]}?hl=en-US&gl=US&ceid=US:en`
  } else {
    rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`
  }

  try {
    const res = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
    })

    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Google News returned ${res.status}` }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const xml = await res.text()
    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300', // cache 5 mins
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
}
