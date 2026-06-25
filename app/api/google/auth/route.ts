import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'
import { getAppUrl } from '@/lib/google-calendar'

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ')

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const label = searchParams.get('label') ?? 'Google Account'
  const color = searchParams.get('color') ?? '#0891b2'

  const nonce = randomBytes(16).toString('hex')
  const state = JSON.stringify({ nonce, label, color })

  const cookieStore = cookies()
  cookieStore.set('google_oauth_state', nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    sameSite: 'lax',
    path: '/',
  })

  const appUrl = getAppUrl(request)
  const redirectUri = `${appUrl}/api/google/callback`

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', SCOPES)
  authUrl.searchParams.set('access_type', 'offline')
  authUrl.searchParams.set('prompt', 'consent select_account')
  authUrl.searchParams.set('state', state)

  return NextResponse.redirect(authUrl.toString())
}
