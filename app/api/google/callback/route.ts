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

  const upsertData: Record<string, unknown> = {
    email,
    label: stateData.label,
    color: stateData.color,
    access_token: tokens.access_token,
    token_expiry: expiry.toISOString(),
  }
  // refresh_token only comes on first authorization or when prompt=consent
  // Only include it if present so we don't overwrite a valid existing one
  if (tokens.refresh_token) {
    upsertData.refresh_token = tokens.refresh_token
  }

  const { error: dbError } = await supabase
    .from('google_accounts')
    .upsert(upsertData, { onConflict: 'email' })

  if (dbError) {
    console.error('Google account save error:', dbError)
    return NextResponse.redirect(`${appUrl}/settings?error=db_${dbError.code}`)
  }

  cookieStore.delete('google_oauth_state')
  return NextResponse.redirect(`${appUrl}/settings?connected=${encodeURIComponent(email)}`)
}
