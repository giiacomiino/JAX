import { createAdminClient } from './supabase/admin'

export interface GoogleAccount {
  id: string
  email: string
  label: string
  color: string
  access_token: string | null
  refresh_token: string
  token_expiry: string | null
  created_at: string
}

export interface GoogleCalendarEvent {
  id: string
  title: string
  date: string
  endDate?: string
  color: string
  source: 'google'
  accountEmail: string
  accountLabel: string
  allDay: boolean
  description?: string
  location?: string
}

export async function getValidToken(account: GoogleAccount): Promise<string | null> {
  // Token still valid (5 min buffer)
  if (
    account.access_token &&
    account.token_expiry &&
    new Date(account.token_expiry).getTime() > Date.now() + 5 * 60 * 1000
  ) {
    return account.access_token
  }

  // Refresh
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: account.refresh_token,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) return null
  const data = await res.json()
  if (!data.access_token) return null

  const expiry = new Date(Date.now() + (data.expires_in ?? 3600) * 1000)
  const supabase = createAdminClient()
  await supabase.from('google_accounts').update({
    access_token: data.access_token,
    token_expiry: expiry.toISOString(),
  }).eq('id', account.id)

  return data.access_token
}

export interface RawGoogleEvent {
  id: string
  summary?: string
  description?: string
  location?: string
  start: { date?: string; dateTime?: string }
  end: { date?: string; dateTime?: string }
}

export async function listCalendarEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string
): Promise<RawGoogleEvent[]> {
  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '500',
    timeMin,
    timeMax,
  })

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!res.ok) return []
  const data = await res.json()
  return (data.items ?? []) as RawGoogleEvent[]
}

export async function createCalendarEvent(
  accessToken: string,
  event: { summary: string; description?: string; date: string; colorId?: string }
): Promise<boolean> {
  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: event.summary,
        description: event.description,
        start: { date: event.date },
        end: { date: event.date },
        colorId: event.colorId,
        source: { title: 'JAX', url: 'https://jax.vercel.app' },
      }),
    }
  )
  return res.ok
}

export function getAppUrl(request: Request): string {
  const url = new URL(request.url)
  return process.env.NEXT_PUBLIC_APP_URL ?? `${url.protocol}//${url.host}`
}
