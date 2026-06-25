// api/newsletter/subscribe.js
// Vercel edge function — handles signup form POST
// Env vars needed: SUPABASE_URL, SUPABASE_SERVICE_KEY, RESEND_API_KEY
// (add these in Vercel Dashboard → Settings → Environment Variables)

export const config = { runtime: 'edge' }

const SUPABASE_URL      = process.env.SUPABASE_URL
const SUPABASE_KEY      = process.env.SUPABASE_SERVICE_KEY
const RESEND_KEY        = process.env.RESEND_API_KEY
const SITE_URL          = 'https://nflboxscore.com'
const FROM_EMAIL        = 'nfl@nysportsdaily.com'

// ── Supabase REST helper ──────────────────────────────────────────────────────
async function sbInsert(table, row) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(row),
  })
  return r.json()
}

async function sbUpsert(table, row, onConflict) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(row),
  })
  return r.json()
}

// ── Confirmation email ────────────────────────────────────────────────────────
async function sendConfirmEmail(email, token, favTeam) {
  const confirmUrl = `${SITE_URL}/api/newsletter/confirm?token=${token}`
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Georgia,serif">
  <div style="max-width:560px;margin:32px auto;background:#1a1209;border:3px double #c8a84b;padding:32px">
    <div style="font-family:'Georgia',serif;font-size:28px;font-weight:700;color:#c8a84b;letter-spacing:-.5px;margin-bottom:4px">
      The Final Whistle
    </div>
    <div style="font-family:monospace;font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.4);margin-bottom:24px">
      nflboxscore.com · Confirm Your Subscription
    </div>
    <p style="color:rgba(255,255,255,.85);font-size:15px;line-height:1.6;margin-bottom:20px">
      One click to confirm — then you're set for the season.
      ${favTeam && favTeam !== 'All' ? `We'll lead every recap with your <strong style="color:#c8a84b">${favTeam}</strong> coverage.` : ''}
    </p>
    <a href="${confirmUrl}"
       style="display:inline-block;background:#c8a84b;color:#1a1209;font-family:monospace;font-size:11px;
              font-weight:700;letter-spacing:.16em;text-transform:uppercase;padding:12px 28px;
              text-decoration:none;border-radius:2px;margin-bottom:24px">
      ✓ Confirm My Subscription
    </a>
    <p style="color:rgba(255,255,255,.35);font-size:10px;font-family:monospace;line-height:1.6;margin-top:20px">
      If you didn't sign up, ignore this email. No further action needed.<br>
      The Final Whistle · nflboxscore.com · Independent &amp; ad-free
    </p>
  </div>
</body>
</html>`

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_KEY}`,
    },
    body: JSON.stringify({
      from: `The Final Whistle <${FROM_EMAIL}>`,
      to: [email],
      subject: '✓ Confirm your Final Whistle newsletter',
      html,
    }),
  })
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  try {
    const body = await req.json()
    const { email, favTeam = 'All', squadPlayers = '', scoringMode = 'ppr', sends } = body

    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Valid email required' }), { status: 400 })
    }

    const token = crypto.randomUUID()

    const row = {
      email:         email.toLowerCase().trim(),
      fav_team:      favTeam,
      squad_players: squadPlayers,
      scoring_mode:  scoringMode,
      sends:         sends || ['monday', 'tuesday', 'thursday', 'friday'],
      confirmed:     false,
      confirm_token: token,
    }

    const result = await sbUpsert('fw_subscribers', row, 'email')

    // Always resend confirmation (handles re-subscribe case)
    await sendConfirmEmail(email, token, favTeam)

    return new Response(JSON.stringify({ ok: true, message: 'Check your email to confirm.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    console.error('subscribe error:', err)
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 })
  }
}
