import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .order('reminder_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const body = await request.json()

  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'El título es requerido' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('reminders')
    .insert({
      title: body.title.trim(),
      description: body.description ?? null,
      reminder_at: body.reminder_at,
      is_recurring: body.is_recurring ?? false,
      recurrence_pattern: body.recurrence_pattern ?? null,
      is_done: false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
