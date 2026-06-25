import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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
  const body: CreateEventInput = await request.json()

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
  return NextResponse.json(data, { status: 201 })
}
