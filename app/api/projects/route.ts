import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { CreateProjectInput } from '@/types'

export async function GET() {
  const supabase = createAdminClient()
  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, status, project_id')
    .not('project_id', 'is', null)

  const withStats = (projects ?? []).map(p => {
    const projectTasks = (tasks ?? []).filter(t => t.project_id === p.id)
    const completed = projectTasks.filter(t => t.status === 'completed').length
    const total = projectTasks.length
    return {
      ...p,
      total_tasks: total,
      completed_tasks: completed,
      pending_tasks: total - completed,
      completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  })

  return NextResponse.json(withStats)
}

export async function POST(request: Request) {
  const body: CreateProjectInput = await request.json()
  if (!body.name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('projects')
    .insert({
      name: body.name.trim(),
      description: body.description?.trim() || null,
      color: body.color || '#0058bc',
      status: body.status || 'active',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
