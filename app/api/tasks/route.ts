import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CreateTaskInput } from '@/types'

export async function GET() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('due_date', { ascending: true, nullsFirst: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const body: CreateTaskInput = await request.json()

  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'El título es requerido' }, { status: 400 })
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: body.title.trim(),
      description: body.description ?? null,
      due_date: body.due_date ?? null,
      priority: body.priority,
      category: body.category,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
