import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('reminders')
    .update({
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.reminder_at !== undefined && { reminder_at: body.reminder_at }),
      ...(body.is_recurring !== undefined && { is_recurring: body.is_recurring }),
      ...(body.recurrence_pattern !== undefined && { recurrence_pattern: body.recurrence_pattern }),
      ...(body.is_done !== undefined && { is_done: body.is_done }),
      ...(body.google_event_id !== undefined && { google_event_id: body.google_event_id }),
      ...(body.google_account_id !== undefined && { google_account_id: body.google_account_id }),
    })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('reminders').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
