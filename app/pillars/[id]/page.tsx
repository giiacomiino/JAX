'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { ProjectWithStats, CreateProjectInput } from '@/types'

const PROJECT_COLORS = ['#0058bc','#7c3aed','#059669','#dc2626','#d97706','#0891b2','#be185d','#374151']

interface PillarDetail {
  id: string; name: string; description: string | null; color: string
  projects: ProjectWithStats[]
  metrics: {
    total_projects: number
    total_tasks: number
    completed_tasks: number
    pending_tasks: number
    completion_rate: number
    weekly_velocity: number[]
  }
}

function NewProjectForm({ pillarId, pillarColor, onSubmit, onCancel }: {
  pillarId: string; pillarColor: string
  onSubmit: (d: CreateProjectInput) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(pillarColor)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    await onSubmit({ name, description, color, status: 'active', pillar_id: pillarId })
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface rounded-2xl border-2 p-5 space-y-4" style={{ borderColor: pillarColor + '40' }}>
      <h3 className="font-display font-bold text-label-lg text-on-surface">Nuevo proyecto</h3>
      <input
        type="text" placeholder="Nombre del proyecto" value={name} onChange={e => setName(e.target.value)} required autoFocus
        className="w-full px-0 py-2 bg-transparent border-b-2 border-outline-variant text-on-surface text-body-md font-semibold focus:outline-none focus:border-primary transition-colors placeholder:text-outline"
      />
      <input
        type="text" placeholder="Descripción (opcional)" value={description} onChange={e => setDescription(e.target.value)}
        className="w-full px-0 py-1 bg-transparent border-0 text-on-surface-variant text-body-sm focus:outline-none placeholder:text-outline-variant"
      />
      <div className="space-y-2">
        <p className="text-label-sm text-on-surface-variant font-medium">Color</p>
        <div className="flex gap-2">
          {PROJECT_COLORS.map(c => (
            <button key={c} type="button" onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full transition-all ${color === c ? 'scale-125 ring-2 ring-offset-1 ring-primary' : 'hover:scale-110'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-3 py-2 rounded-xl text-label-md text-on-surface-variant hover:bg-surface-container">Cancelar</button>
        <button type="submit" disabled={loading || !name.trim()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-label-md font-semibold hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: pillarColor }}>
          <span className="material-symbols-outlined text-[15px]">{loading ? 'progress_activity' : 'add'}</span>
          Crear
        </button>
      </div>
    </form>
  )
}

const STATUS_LABEL: Record<string, string> = { active: 'Activo', paused: 'Pausado', completed: 'Completado' }

export default function PillarDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [pillar, setPillar] = useState<PillarDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showNewProject, setShowNewProject] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/pillars/${id}`)
    if (res.ok) setPillar(await res.json())
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleCreateProject(data: CreateProjectInput) {
    await fetch('/api/projects', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    })
    setShowNewProject(false)
    load()
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar el pilar "${pillar?.name}"? Los proyectos quedarán sin pilar.`)) return
    await fetch(`/api/pillars/${id}`, { method: 'DELETE' })
    router.push('/pillars')
  }

  if (loading) return (
    <div className="flex justify-center py-24">
      <span className="material-symbols-outlined text-[32px] text-primary animate-spin">progress_activity</span>
    </div>
  )

  if (!pillar) return <div className="text-center py-24 text-on-surface-variant">Pilar no encontrado</div>

  const { metrics, projects } = pillar
  const activeProjects = projects.filter(p => p.status === 'active')
  const otherProjects = projects.filter(p => p.status !== 'active')

  return (
    <div className="max-w-5xl mx-auto space-y-7">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/pillars" className="mt-1 w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors flex-shrink-0">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: pillar.color + '15' }}>
              <span className="material-symbols-outlined text-[24px]" style={{ color: pillar.color }}>workspaces</span>
            </div>
            <div>
              <h1 className="font-display text-display-sm font-extrabold text-on-surface" style={{ letterSpacing: '-0.03em' }}>{pillar.name}</h1>
              {pillar.description && <p className="text-label-md text-on-surface-variant mt-0.5">{pillar.description}</p>}
            </div>
          </div>
        </div>
        <button onClick={handleDelete} className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors flex-shrink-0">
          <span className="material-symbols-outlined text-[18px]">delete</span>
        </button>
      </div>

      {/* Métricas agregadas del pilar */}
      <div className="bg-surface rounded-3xl border border-outline-variant p-6 zen-shadow">
        <p className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-4">Métricas del pilar</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          {[
            { label: 'Proyectos', value: metrics.total_projects, icon: 'folder' },
            { label: 'Total tareas', value: metrics.total_tasks, icon: 'task_alt' },
            { label: 'Pendientes', value: metrics.pending_tasks, icon: 'hourglass_empty' },
            { label: 'Completadas', value: metrics.completed_tasks, icon: 'check_circle' },
          ].map(s => (
            <div key={s.label} className="text-center bg-surface-container rounded-2xl p-3">
              <span className="material-symbols-outlined text-[18px]" style={{ color: pillar.color }}>{s.icon}</span>
              <p className="font-display font-extrabold text-title-lg text-on-surface mt-1">{s.value}</p>
              <p className="text-label-sm text-on-surface-variant">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-label-sm text-on-surface-variant">
            <span>Progreso general</span>
            <span className="font-bold" style={{ color: pillar.color }}>{metrics.completion_rate}%</span>
          </div>
          <div className="w-full bg-surface-container-high rounded-full h-3">
            <div className="h-3 rounded-full transition-all duration-700" style={{ width: `${metrics.completion_rate}%`, backgroundColor: pillar.color }} />
          </div>
        </div>
      </div>

      {/* Velocidad semanal */}
      <div className="bg-surface rounded-2xl border border-outline-variant p-5 zen-shadow">
        <p className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-4">Velocidad semanal (últimas 4 semanas)</p>
        <div className="flex items-end gap-3 h-20">
          {metrics.weekly_velocity.map((v, i) => {
            const max = Math.max(...metrics.weekly_velocity, 1)
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-label-sm font-bold text-on-surface">{v}</span>
                <div className="w-full rounded-t-lg" style={{ height: `${Math.max((v / max) * 100, 6)}%`, backgroundColor: pillar.color + (i === 3 ? 'ff' : '50') }} />
                <span className="text-label-sm text-on-surface-variant">S-{3 - i}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Proyectos */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-extrabold text-headline-md text-on-surface">Proyectos</h2>
          <button onClick={() => setShowNewProject(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-label-md font-semibold hover:opacity-90 transition-opacity"
            style={{ backgroundColor: pillar.color }}>
            <span className="material-symbols-outlined text-[16px]">add</span>
            Nuevo proyecto
          </button>
        </div>

        {showNewProject && (
          <NewProjectForm
            pillarId={id} pillarColor={pillar.color}
            onSubmit={handleCreateProject}
            onCancel={() => setShowNewProject(false)}
          />
        )}

        {projects.length === 0 && !showNewProject && (
          <div className="text-center py-12 bg-surface rounded-2xl border border-outline-variant">
            <span className="material-symbols-outlined text-[40px] text-outline-variant block mb-2">folder_open</span>
            <p className="text-label-md text-on-surface-variant">Sin proyectos en este pilar</p>
          </div>
        )}

        {/* Proyectos activos */}
        {activeProjects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeProjects.map(p => <ProjectCard key={p.id} project={p} />)}
          </div>
        )}

        {/* Otros */}
        {otherProjects.length > 0 && (
          <div className="space-y-3 pt-2">
            <p className="text-label-sm text-on-surface-variant font-medium uppercase tracking-wide">Pausados / Completados</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {otherProjects.map(p => <ProjectCard key={p.id} project={p} />)}
            </div>
          </div>
        )}

        {/* Comparación por proyecto */}
        {projects.length > 1 && (
          <div className="bg-surface rounded-2xl border border-outline-variant p-5 zen-shadow mt-2">
            <p className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-4">Comparación de proyectos</p>
            <div className="space-y-3">
              {[...projects].sort((a, b) => b.completion_rate - a.completion_rate).map(p => (
                <div key={p.id} className="space-y-1">
                  <div className="flex justify-between text-label-sm">
                    <span className="text-on-surface font-medium truncate">{p.name}</span>
                    <span className="text-on-surface-variant ml-2 flex-shrink-0">{p.completion_rate}% · {p.pending_tasks} pendientes</span>
                  </div>
                  <div className="w-full bg-surface-container-high rounded-full h-1.5">
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${p.completion_rate}%`, backgroundColor: p.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ProjectCard({ project: p }: { project: ProjectWithStats }) {
  return (
    <Link href={`/projects/${p.id}`}
      className="block bg-surface rounded-2xl border border-outline-variant p-5 zen-shadow hover:shadow-md hover:-translate-y-0.5 transition-all group">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: p.color + '20' }}>
            <span className="material-symbols-outlined text-[18px]" style={{ color: p.color }}>folder</span>
          </div>
          <div>
            <h3 className="font-display font-bold text-label-lg text-on-surface group-hover:text-primary transition-colors">{p.name}</h3>
            {p.description && <p className="text-label-sm text-on-surface-variant line-clamp-1">{p.description}</p>}
          </div>
        </div>
        <span className={`text-label-sm px-2 py-0.5 rounded-full border ${
          p.status === 'active' ? 'border-transparent text-xs' : 'bg-surface-container-high text-on-surface-variant border-outline-variant'
        }`}>
          {p.status !== 'active' && STATUS_LABEL[p.status]}
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-label-sm text-on-surface-variant">
          <span>{p.completed_tasks}/{p.total_tasks} tareas</span>
          <span className="font-bold" style={{ color: p.color }}>{p.completion_rate}%</span>
        </div>
        <div className="w-full bg-surface-container-high rounded-full h-1.5">
          <div className="h-1.5 rounded-full" style={{ width: `${p.completion_rate}%`, backgroundColor: p.color }} />
        </div>
      </div>

      <div className="flex justify-between items-center mt-4 pt-3 border-t border-outline-variant">
        <span className="text-label-sm text-on-surface-variant">{p.pending_tasks} pendientes</span>
        <span className="material-symbols-outlined text-[15px] text-outline-variant group-hover:text-primary transition-colors">arrow_forward</span>
      </div>
    </Link>
  )
}
