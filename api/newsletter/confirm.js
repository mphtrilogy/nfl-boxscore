// api/newsletter/confirm.js
// Handles the confirmation link click — sets confirmed = true, redirects to site

export const config = { runtime: 'edge' }

const SUPABASE_URL  = process.env.SUPABASE_URL
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_KEY
const SITE_URL      = 'https://nflboxscore.com'

async function sbConfirm(token) {
  // Find subscriber by token
  const findRes = await fetch(
    `${SUPABASE_URL}/rest/v1/fw_subscribers?confirm_token=eq.${token}&select=id,email,confirmed`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      }
    }
  )
  const rows = await findRes.json()
  if (!rows?.length) return { ok: false, reason: 'Token not found' }

  const sub = rows[0]
  if (sub.confirmed) return { ok: true, already: true, email: sub.email }

  // Mark confirmed
  await fetch(`${SUPABASE_URL}/rest/v1/fw_subscribers?id=eq.${sub.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ confirmed: true, confirm_token: null }),
  })

  return { ok: true, email: sub.email }
}

export default async function handler(req) {
  const url   = new URL(req.url)
  const token = url.searchParams.get('token')

  if (!token) {
    return Response.redirect(`${SITE_URL}?nl=invalid`, 302)
  }

  const result = await sbConfirm(token)

  if (!result.ok) {
    return Response.redirect(`${SITE_URL}?nl=invalid`, 302)
  }

  // Redirect to site with success flag — the app reads ?nl=confirmed and shows a toast
  return Response.redirect(`${SITE_URL}?nl=confirmed`, 302)
}
