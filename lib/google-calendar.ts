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
  if (
    account.access_token &&
    account.token_expiry &&
    new Date(account.token_expiry).getTime() > Date.now() + 5 * 60 * 1000
  ) {
    return account.access_token
  }

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
  hangoutLink?: string
  start: { date?: string; dateTime?: string }
  end: { date?: string; dateTime?: string }
  attendees?: Array<{ email: string; displayName?: string; responseStatus?: string; self?: boolean }>
}

async function listCalendarIds(accessToken: string): Promise<string[]> {
  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=50',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) return ['primary']
  const data = await res.json()
  return (data.items ?? []).map((c: { id: string }) => c.id)
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

  const calendarIds = await listCalendarIds(accessToken)
  const allEvents: RawGoogleEvent[] = []
  const seen = new Set<string>()

  await Promise.all(calendarIds.map(async (calId) => {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!res.ok) return
    const data = await res.json()
    for (const ev of (data.items ?? []) as RawGoogleEvent[]) {
      if (!seen.has(ev.id)) {
        seen.add(ev.id)
        allEvents.push(ev)
      }
    }
  }))

  return allEvents
}

export async function createCalendarEvent(
  accessToken: string,
  event: {
    summary: string
    description?: string
    date: string        // yyyy-MM-dd
    time?: string       // HH:mm — if set, creates timed event (+1h duration)
    calendarId?: string // defaults to 'primary'
    colorId?: string
    timeZone?: string
  }
): Promise<{ ok: boolean; eventId: string | null }> {
  const calId = encodeURIComponent(event.calendarId ?? 'primary')
  const tz = event.timeZone ?? 'America/Mexico_City'

  let start: Record<string, string>
  let end: Record<string, string>

  if (event.time) {
    const [hh, mm] = event.time.split(':').map(Number)
    const endHour = String(hh + 1).padStart(2, '0')
    start = { dateTime: `${event.date}T${event.time}:00`, timeZone: tz }
    end   = { dateTime: `${event.date}T${endHour}:${String(mm).padStart(2, '0')}:00`, timeZone: tz }
  } else {
    start = { date: event.date }
    end   = { date: event.date }
  }

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calId}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: event.summary,
        description: event.description,
        start,
        end,
        colorId: event.colorId,
        source: { title: 'JAX', url: 'https://jax.vercel.app' },
      }),
    }
  )
  if (!res.ok) return { ok: false, eventId: null }
  const data = await res.json()
  return { ok: true, eventId: data.id ?? null }
}

export async function updateCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  event: { summary?: string; description?: string | null; date?: string; time?: string; timeZone?: string }
): Promise<boolean> {
  const tz = event.timeZone ?? 'America/Mexico_City'
  const body: Record<string, unknown> = {}
  if (event.summary !== undefined) body.summary = event.summary
  if (event.description !== undefined) body.description = event.description
  if (event.date) {
    if (event.time) {
      const [hh, mm] = event.time.split(':').map(Number)
      const endHour = String(hh + 1).padStart(2, '0')
      body.start = { dateTime: `${event.date}T${event.time}:00`, timeZone: tz }
      body.end   = { dateTime: `${event.date}T${endHour}:${String(mm).padStart(2, '0')}:00`, timeZone: tz }
    } else {
      body.start = { date: event.date }
      body.end   = { date: event.date }
    }
  }
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )
  return res.ok
}

export async function deleteCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<boolean> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )
  return res.ok || res.status === 404
}

export function getAppUrl(request: Request): string {
  const url = new URL(request.url)
  return process.env.NEXT_PUBLIC_APP_URL ?? `${url.protocol}//${url.host}`
}
