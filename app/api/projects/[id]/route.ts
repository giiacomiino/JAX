import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', params.id)
    .order('created_at', { ascending: false })

  const { data: files } = await supabase
    .from('project_files')
    .select('*')
    .eq('project_id', params.id)
    .order('created_at', { ascending: false })

  const taskList = tasks ?? []
  const completed = taskList.filter(t => t.status === 'completed').length

  // Weekly velocity: tasks completed per week for last 4 weeks
  const now = new Date()
  const weeks = [0, 1, 2, 3].map(w => {
    const start = new Date(now)
    start.setDate(start.getDate() - (w + 1) * 7)
    const end = new Date(now)
    end.setDate(end.getDate() - w * 7)
    return taskList.filter(t =>
      t.status === 'completed' && t.updated_at &&
      new Date(t.updated_at) >= start && new Date(t.updated_at) < end
    ).length
  }).reverse()

  return NextResponse.json({
    ...data,
    tasks: taskList,
    files: files ?? [],
    metrics: {
      total_tasks: taskList.length,
      completed_tasks: completed,
      pending_tasks: taskList.length - completed,
      completion_rate: taskList.length > 0 ? Math.round((completed / taskList.length) * 100) : 0,
      weekly_velocity: weeks,
    },
  })
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('projects')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('projects').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
