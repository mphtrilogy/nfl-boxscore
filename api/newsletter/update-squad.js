// api/newsletter/update-squad.js
// Called automatically when user saves their My Fantasy Squad
// Updates squad_players and fav_team in Supabase for confirmed subscribers
// Silent fail — never blocks the squad save

export const config = { runtime: 'edge' }

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

export default async function handler(req) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { ...headers, 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
  }

  try {
    const { email, squadPlayers, favTeam } = await req.json()

    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Valid email required' }), { status: 400, headers })
    }

    // Only update confirmed subscribers — don't create new rows
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/fw_subscribers?email=eq.${encodeURIComponent(email.toLowerCase().trim())}&confirmed=eq.true`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          squad_players: squadPlayers || '',
          fav_team:      favTeam      || 'All',
        }),
      }
    )

    // 204 = updated, 200 = ok, anything else = not found or error
    if (r.status === 204 || r.status === 200) {
      return new Response(JSON.stringify({ ok: true }), { headers })
    }

    // No confirmed subscriber found with that email — that's fine, silent fail
    return new Response(JSON.stringify({ ok: false, reason: 'not-subscribed' }), { status: 404, headers })

  } catch (err) {
    // Always silent fail — never block the squad save
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers })
  }
}
