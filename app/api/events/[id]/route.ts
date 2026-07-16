import { NextResponse } from 'next/server'
import { createAdminClient as createClient } from '@/lib/supabase/admin'
import { updateInGCal, deleteInGCal } from '@/lib/auto-gcal'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json()
  const supabase = createClient()

  // Fetch current event to get GCal IDs
  const { data: current } = await supabase
    .from('events')
    .select('google_event_id, google_account_id')
    .eq('id', params.id)
    .single()

  const { data, error } = await supabase
    .from('events')
    .update(body)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sync to Google Calendar if linked
  const gcalId = (current as { google_event_id?: string | null } | null)?.google_event_id
  const accountId = (current as { google_account_id?: string | null } | null)?.google_account_id
  if (gcalId && accountId) {
    const date = body.starts_at ? (body.starts_at as string).split('T')[0] : undefined
    updateInGCal(accountId, gcalId, {
      title: body.title,
      date,
      description: body.description,
    }).catch(() => {})
  }

  return NextResponse.json(data)
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()

  // Fetch GCal IDs before deleting
  const { data: current } = await supabase
    .from('events')
    .select('google_event_id, google_account_id')
    .eq('id', params.id)
    .single()

  const { error } = await supabase.from('events').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sync deletion to Google Calendar
  const gcalId = (current as { google_event_id?: string | null } | null)?.google_event_id
  const accountId = (current as { google_account_id?: string | null } | null)?.google_account_id
  if (gcalId && accountId) {
    deleteInGCal(accountId, gcalId).catch(() => {})
  }

  return new NextResponse(null, { status: 204 })
}
