import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const supabase = createAdminClient()

  const { data: pillar, error } = await supabase
    .from('pillars')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('pillar_id', params.id)
    .order('created_at', { ascending: false })

  const { data: allTasks } = await supabase
    .from('tasks')
    .select('*')
    .in('project_id', (projects ?? []).map(p => p.id))

  const taskList = allTasks ?? []
  const completed = taskList.filter(t => t.status === 'completed').length
  const total = taskList.length

  const projectsWithStats = (projects ?? []).map(p => {
    const ptasks = taskList.filter(t => t.project_id === p.id)
    const pc = ptasks.filter(t => t.status === 'completed').length
    return {
      ...p,
      total_tasks: ptasks.length,
      completed_tasks: pc,
      pending_tasks: ptasks.length - pc,
      completion_rate: ptasks.length > 0 ? Math.round((pc / ptasks.length) * 100) : 0,
    }
  })

  // Weekly velocity for pillar (last 4 weeks)
  const now = new Date()
  const weekly_velocity = [0, 1, 2, 3].map(w => {
    const start = new Date(now); start.setDate(start.getDate() - (w + 1) * 7)
    const end = new Date(now); end.setDate(end.getDate() - w * 7)
    return taskList.filter(t =>
      t.status === 'completed' && t.updated_at &&
      new Date(t.updated_at) >= start && new Date(t.updated_at) < end
    ).length
  }).reverse()

  return NextResponse.json({
    ...pillar,
    projects: projectsWithStats,
    metrics: {
      total_projects: (projects ?? []).length,
      total_tasks: total,
      completed_tasks: completed,
      pending_tasks: total - completed,
      completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
      weekly_velocity,
    },
  })
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('pillars')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('pillars').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
