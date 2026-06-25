// api/newsletter/unsubscribe.js
// One-click unsubscribe — no login required

export const config = { runtime: 'edge' }

const SUPABASE_URL  = process.env.SUPABASE_URL
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_KEY
const SITE_URL      = 'https://nflboxscore.com'

export default async function handler(req) {
  const url   = new URL(req.url)
  const email = url.searchParams.get('email')

  if (!email) {
    return Response.redirect(`${SITE_URL}?nl=unsub-err`, 302)
  }

  await fetch(
    `${SUPABASE_URL}/rest/v1/fw_subscribers?email=eq.${encodeURIComponent(email)}`,
    {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      }
    }
  )

  return Response.redirect(`${SITE_URL}?nl=unsubscribed`, 302)
}
