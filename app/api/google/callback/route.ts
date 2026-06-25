import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAppUrl } from '@/lib/google-calendar'

export async function GET(request: Request) {
  const appUrl = getAppUrl(request)
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const stateParam = searchParams.get('state')
  const error = searchParams.get('error')

  if (error || !code || !stateParam) {
    return NextResponse.redirect(`${appUrl}/settings?error=${error ?? 'missing_params'}`)
  }

  // Parse state and verify nonce
  let stateData: { nonce: string; label: string; color: string }
  try { stateData = JSON.parse(stateParam) }
  catch { return NextResponse.redirect(`${appUrl}/settings?error=invalid_state`) }

  const cookieStore = cookies()
  const storedNonce = cookieStore.get('google_oauth_state')?.value
  if (!storedNonce || storedNonce !== stateData.nonce) {
    return NextResponse.redirect(`${appUrl}/settings?error=state_mismatch`)
  }

  // Exchange code for tokens
  const redirectUri = `${appUrl}/api/google/callback`
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appUrl}/settings?error=token_exchange`)
  }

  const tokens = await tokenRes.json()

  // Get user info
  const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  const userInfo = await userRes.json()
  const email: string = userInfo.email

  // Save to Supabase
  const supabase = createAdminClient()
  const expiry = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000)

  await supabase.from('google_accounts').upsert({
    email,
    label: stateData.label,
    color: stateData.color,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    token_expiry: expiry.toISOString(),
  }, { onConflict: 'email' })

  cookieStore.delete('google_oauth_state')
  return NextResponse.redirect(`${appUrl}/settings?connected=${encodeURIComponent(email)}`)
}
