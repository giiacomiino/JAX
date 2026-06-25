'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { ProjectWithStats, CreateProjectInput } from '@/types'

const PROJECT_COLORS = ['#0058bc','#7c3aed','#059669','#dc2626','#d97706','#0891b2','#be185d','#374151']

function ProjectForm({ onSubmit, onCancel }: { onSubmit: (d: CreateProjectInput) => Promise<void>; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#0058bc')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    await onSubmit({ name, description, color, status: 'active' })
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface rounded-2xl border border-outline-variant p-6 zen-shadow space-y-4">
      <h3 className="font-display font-bold text-label-lg text-on-surface">Nuevo proyecto</h3>
      <input
        type="text" placeholder="Nombre del proyecto" value={name} onChange={e => setName(e.target.value)} required autoFocus
        className="w-full px-0 py-2 bg-transparent border-b-2 border-outline-variant text-on-surface text-body-lg font-semibold focus:outline-none focus:border-primary transition-colors placeholder:text-outline"
      />
      <input
        type="text" placeholder="Descripción opcional..." value={description} onChange={e => setDescription(e.target.value)}
        className="w-full px-0 py-1.5 bg-transparent border-0 text-on-surface-variant text-body-md focus:outline-none placeholder:text-outline-variant"
      />
      <div className="space-y-2">
        <p className="text-label-sm text-on-surface-variant font-medium">Color</p>
        <div className="flex gap-2">
          {PROJECT_COLORS.map(c => (
            <button key={c} type="button" onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-2 ring-primary' : 'hover:scale-110'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl text-label-md text-on-surface-variant hover:bg-surface-container transition-colors">Cancelar</button>
        <button type="submit" disabled={loading || !name.trim()} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-on-primary text-label-md font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
          <span className="material-symbols-outlined text-[16px]">{loading ? 'progress_activity' : 'check'}</span>
          {loading ? 'Creando...' : 'Crear'}
        </button>
      </div>
    </form>
  )
}

const STATUS_LABEL: Record<string, string> = { active: 'Activo', paused: 'Pausado', completed: 'Completado' }
const STATUS_COLOR: Record<string, string> = {
  active: 'bg-primary/10 text-primary border-primary/20',
  paused: 'bg-surface-container-high text-on-surface-variant border-outline-variant',
  completed: 'bg-green-50 text-green-700 border-green-200',
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  async function load() {
    const res = await fetch('/api/projects')
    if (res.ok) setProjects(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleCreate(data: CreateProjectInput) {
    const res = await fetch('/api/projects', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    })
    if (res.ok) { setShowForm(false); load() }
  }

  const active = projects.filter(p => p.status === 'active')
  const others = projects.filter(p => p.status !== 'active')

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-display-sm font-extrabold text-on-surface" style={{ letterSpacing: '-0.03em' }}>Proyectos</h1>
          <p className="text-on-surface-variant text-label-md mt-1">{active.length} activos · {projects.length} total</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-xl text-label-md font-semibold hover:opacity-90 transition-opacity">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nuevo proyecto
        </button>
      </div>

      {showForm && <ProjectForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />}

      {loading ? (
        <div className="flex justify-center py-16"><span className="material-symbols-outlined text-[32px] text-primary animate-spin">progress_activity</span></div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 bg-surface rounded-3xl border border-outline-variant">
          <span className="material-symbols-outlined text-[48px] text-outline-variant mb-3 block">folder_open</span>
          <p className="text-body-lg text-on-surface-variant">Sin proyectos todavía</p>
          <button onClick={() => setShowForm(true)} className="mt-4 text-primary text-label-md font-semibold hover:opacity-70">Crear primero →</button>
        </div>
      ) : (
        <div className="space-y-8">
          {active.length > 0 && (
            <div className="space-y-3">
              <p className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Activos</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {active.map(p => <ProjectCard key={p.id} project={p} />)}
              </div>
            </div>
          )}
          {others.length > 0 && (
            <div className="space-y-3">
              <p className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Otros</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {others.map(p => <ProjectCard key={p.id} project={p} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ProjectCard({ project: p }: { project: ProjectWithStats }) {
  return (
    <Link href={`/projects/${p.id}`}
      className="block bg-surface rounded-2xl border border-outline-variant p-5 zen-shadow hover:shadow-md hover:-translate-y-0.5 transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: p.color + '20' }}>
            <span className="material-symbols-outlined text-[20px]" style={{ color: p.color }}>folder</span>
          </div>
          <div>
            <h3 className="font-display font-bold text-label-lg text-on-surface group-hover:text-primary transition-colors">{p.name}</h3>
            {p.description && <p className="text-label-sm text-on-surface-variant line-clamp-1">{p.description}</p>}
          </div>
        </div>
        <span className={`text-label-sm px-2 py-0.5 rounded-full border ${STATUS_COLOR[p.status]}`}>{STATUS_LABEL[p.status]}</span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-label-sm text-on-surface-variant">
          <span>{p.completed_tasks} de {p.total_tasks} tareas</span>
          <span className="font-semibold" style={{ color: p.color }}>{p.completion_rate}%</span>
        </div>
        <div className="w-full bg-surface-container-high rounded-full h-1.5">
          <div className="h-1.5 rounded-full transition-all" style={{ width: `${p.completion_rate}%`, backgroundColor: p.color }} />
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-outline-variant">
        <span className="text-label-sm text-on-surface-variant">{p.pending_tasks} pendientes</span>
        <span className="material-symbols-outlined text-[16px] text-outline-variant group-hover:text-primary transition-colors">arrow_forward</span>
      </div>
    </Link>
  )
}
