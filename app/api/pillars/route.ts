import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { CreatePillarInput } from '@/types'

export async function GET() {
  const supabase = createAdminClient()

  const { data: pillars, error } = await supabase
    .from('pillars')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: projects } = await supabase
    .from('projects')
    .select('id, pillar_id')
    .not('pillar_id', 'is', null)

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, status, project_id')
    .not('project_id', 'is', null)

  const projectIds = new Set((projects ?? []).map(p => p.id))
  const pillarProjects = projects ?? []

  const withStats = (pillars ?? []).map(pillar => {
    const myProjects = pillarProjects.filter(p => p.pillar_id === pillar.id)
    const myProjectIds = new Set(myProjects.map(p => p.id))
    const myTasks = (tasks ?? []).filter(t => t.project_id && myProjectIds.has(t.project_id))
    const completed = myTasks.filter(t => t.status === 'completed').length
    const total = myTasks.length
    return {
      ...pillar,
      total_projects: myProjects.length,
      total_tasks: total,
      completed_tasks: completed,
      pending_tasks: total - completed,
      completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  })

  // suppress unused warning
  void projectIds

  return NextResponse.json(withStats)
}

export async function POST(request: Request) {
  const body: CreatePillarInput = await request.json()
  if (!body.name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('pillars')
    .insert({
      name: body.name.trim(),
      description: body.description?.trim() || null,
      color: body.color || '#0058bc',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
