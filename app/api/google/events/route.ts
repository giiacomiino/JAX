import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getValidToken, createCalendarEvent, type GoogleAccount, type RawGoogleEvent } from '@/lib/google-calendar'
import { subMonths, addMonths, startOfMonth } from 'date-fns'

async function fetchEventsForAccount(
  account: GoogleAccount,
  token: string,
  timeMin: string,
  timeMax: string
): Promise<{ events: object[]; error?: string }> {
  const listRes = await fetch(
    'https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=50',
    { headers: { Authorization: `Bearer ${token}` } }
  )

  if (!listRes.ok) {
    const txt = await listRes.text()
    return { events: [], error: `calendarList ${listRes.status}: ${txt.slice(0, 200)}` }
  }

  const listData = await listRes.json()
  const calendars: { id: string; summary: string }[] = listData.items ?? []

  if (calendars.length === 0) return { events: [], error: 'calendarList returned 0 calendars' }

  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '500',
    timeMin,
    timeMax,
  })

  const allEvents: object[] = []
  const seen = new Set<string>()
  const errors: string[] = []

  await Promise.all(calendars.map(async (cal) => {
    try {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) { errors.push(`cal[${cal.summary}] ${res.status}`); return }
      const data = await res.json()
      for (const ev of (data.items ?? []) as RawGoogleEvent[]) {
        if (seen.has(ev.id)) continue
        seen.add(ev.id)

        const dateStr = ev.start?.date ?? ev.start?.dateTime?.split('T')[0] ?? ''
        if (!dateStr) continue

        allEvents.push({
          id: `gcal-${account.id}-${ev.id}`,
          gcalId: ev.id,
          gcalAccountId: account.id,
          gcalCalendarId: cal.id,
          title: ev.summary ?? '(Sin título)',
          date: dateStr,
          endDate: ev.end?.date ?? ev.end?.dateTime?.split('T')[0],
          startDateTime: ev.start?.dateTime ?? null,
          endDateTime: ev.end?.dateTime ?? null,
          color: account.color,
          source: 'google',
          accountEmail: account.email,
          accountLabel: account.label,
          allDay: !!ev.start?.date,
          description: ev.description ?? null,
          location: ev.location ?? null,
          meetLink: ev.hangoutLink ?? null,
          attendees: ev.attendees ?? [],
        })
      }
    } catch (e) {
      errors.push(`cal[${cal.summary}] exception: ${String(e)}`)
    }
  }))

  return { events: allEvents, error: errors.length ? errors.join(' | ') : undefined }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const timeMin = searchParams.get('timeMin')
      ?? subMonths(startOfMonth(new Date()), 1).toISOString()
    const timeMax = searchParams.get('timeMax')
      ?? addMonths(new Date(), 4).toISOString()

    const supabase = createAdminClient()
    const { data: accounts, error: dbErr } = await supabase.from('google_accounts').select('*')
    if (dbErr) return NextResponse.json({ error: `db: ${dbErr.message}` }, { status: 500 })
    if (!accounts || accounts.length === 0) return NextResponse.json([])

    const allEvents: object[] = []
    const debug: Record<string, unknown> = {}

    for (const account of accounts as GoogleAccount[]) {
      const token = await getValidToken(account)
      if (!token) { debug[account.email] = 'no valid token'; continue }

      const { events, error } = await fetchEventsForAccount(account, token, timeMin, timeMax)
      debug[account.email] = error ?? `${events.length} events`
      allEvents.push(...events)
    }

    return NextResponse.json(allEvents, {
      headers: { 'x-google-debug': JSON.stringify(debug) }
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { accountId, calendarId, title, date, time, description } = body as {
      accountId: string
      calendarId?: string
      title: string
      date: string
      time?: string
      description?: string
    }

    if (!accountId || !title?.trim() || !date) {
      return NextResponse.json({ error: 'accountId, title y date son requeridos' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: account } = await supabase
      .from('google_accounts')
      .select('*')
      .eq('id', accountId)
      .single()

    if (!account) return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })

    const token = await getValidToken(account as GoogleAccount)
    if (!token) return NextResponse.json({ error: 'Token inválido — reconecta tu cuenta Google' }, { status: 401 })

    const result = await createCalendarEvent(token, {
      summary: title.trim(),
      description,
      date,
      time,
      calendarId: calendarId ?? 'primary',
    })

    if (!result.ok || !result.eventId) {
      return NextResponse.json({ error: 'Error al crear evento en Google Calendar' }, { status: 502 })
    }

    return NextResponse.json({
      gcalId: result.eventId,
      gcalAccountId: accountId,
      gcalCalendarId: calendarId ?? 'primary',
    }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
