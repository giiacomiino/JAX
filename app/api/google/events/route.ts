import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getValidToken, listCalendarEvents, type GoogleAccount, type GoogleCalendarEvent, type RawGoogleEvent } from '@/lib/google-calendar'
import { subMonths, addMonths, startOfMonth } from 'date-fns'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const timeMin = searchParams.get('timeMin')
      ?? subMonths(startOfMonth(new Date()), 1).toISOString()
    const timeMax = searchParams.get('timeMax')
      ?? addMonths(new Date(), 4).toISOString()

    const supabase = createAdminClient()
    const { data: accounts } = await supabase.from('google_accounts').select('*')

    if (!accounts || accounts.length === 0) return NextResponse.json([])

    const allEvents: GoogleCalendarEvent[] = []

    for (const account of accounts as GoogleAccount[]) {
      const token = await getValidToken(account)
      if (!token) continue

      const raw = await listCalendarEvents(token, timeMin, timeMax)
      for (const ev of raw as RawGoogleEvent[]) {
        const dateStr = ev.start?.date ?? ev.start?.dateTime?.split('T')[0] ?? ''
        if (!dateStr) continue
        allEvents.push({
          id: `gcal-${account.id}-${ev.id}`,
          title: ev.summary ?? '(Sin título)',
          date: dateStr,
          endDate: ev.end?.date ?? ev.end?.dateTime?.split('T')[0],
          color: account.color,
          source: 'google' as const,
          accountEmail: account.email,
          accountLabel: account.label,
          allDay: !!ev.start?.date,
          description: ev.description,
          location: ev.location,
        })
      }
    }

    return NextResponse.json(allEvents)
  } catch {
    return NextResponse.json([])
  }
}
