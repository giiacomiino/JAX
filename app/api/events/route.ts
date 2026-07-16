import { NextResponse } from 'next/server'
import { createAdminClient as createClient } from '@/lib/supabase/admin'
import { scheduleInGCal } from '@/lib/auto-gcal'
import type { CreateEventInput } from '@/types'

export async function GET() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('starts_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const body: CreateEventInput & { pillar_id?: string } = await request.json()

  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'El título es requerido' }, { status: 400 })
  }
  if (!body.starts_at) {
    return NextResponse.json({ error: 'La fecha de inicio es requerida' }, { status: 400 })
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('events')
    .insert({
      title: body.title.trim(),
      description: body.description ?? null,
      starts_at: body.starts_at,
      ends_at: body.ends_at ?? null,
      reminder_minutes: body.reminder_minutes ?? 30,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-schedule in linked Google Calendar and store the GCal event ID
  if (body.pillar_id) {
    const date = body.starts_at.split('T')[0]
    scheduleInGCal(body.pillar_id, { title: body.title.trim(), date, description: body.description })
      .then(({ googleEventId, googleAccountId }) => {
        if (googleEventId) {
          void supabase.from('events').update({ google_event_id: googleEventId, google_account_id: googleAccountId }).eq('id', data.id)
        }
      })
      .catch(() => {})
  }

  return NextResponse.json(data, { status: 201 })
}
