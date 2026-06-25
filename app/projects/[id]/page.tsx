'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Task, ProjectFile, Priority } from '@/types'

interface ProjectDetail {
  id: string; name: string; description: string | null; color: string; status: string
  tasks: Task[]; files: ProjectFile[]
  metrics: { total_tasks: number; completed_tasks: number; pending_tasks: number; completion_rate: number; weekly_velocity: number[] }
}

const PRIORITY_COLOR: Record<Priority, string> = { high: 'text-error', medium: 'text-secondary', low: 'text-on-surface-variant' }
const PRIORITY_ICON: Record<Priority, string> = { high: 'priority_high', medium: 'remove', low: 'arrow_downward' }

type Tab = 'tareas' | 'archivos' | 'metricas'

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [tab, setTab] = useState<Tab>('tareas')
  const [loading, setLoading] = useState(true)
  const [newTask, setNewTask] = useState('')
  const [newFileName, setNewFileName] = useState('')
  const [newFileContent, setNewFileContent] = useState('')
  const [showFileForm, setShowFileForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${id}`)
    if (res.ok) setProject(await res.json())
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTask.trim()) return
    setSaving(true)
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTask.trim(), priority: 'medium', category: 'work', project_id: id }),
    })
    setNewTask('')
    setSaving(false)
    load()
  }

  async function handleToggleTask(taskId: string, status: string) {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: status === 'completed' ? 'pending' : 'completed' }),
    })
    load()
  }

  async function handleAddFile(e: React.FormEvent) {
    e.preventDefault()
    if (!newFileName.trim() || !newFileContent.trim()) return
    setSaving(true)
    await fetch(`/api/projects/${id}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newFileName.trim(), content: newFileContent.trim() }),
    })
    setNewFileName(''); setNewFileContent(''); setShowFileForm(false)
    setSaving(false)
    load()
  }

  async function handleDeleteFile(fileId: string) {
    await fetch(`/api/projects/${id}/files`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId }),
    })
    load()
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar este proyecto?')) return
    await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    router.push('/projects')
  }

  if (loading) return (
    <div className="flex justify-center py-24">
      <span className="material-symbols-outlined text-[32px] text-primary animate-spin">progress_activity</span>
    </div>
  )

  if (!project) return <div className="text-center py-24 text-on-surface-variant">Proyecto no encontrado</div>

  const { metrics, tasks, files } = project
  const pendingTasks = tasks.filter(t => t.status === 'pending')
  const completedTasks = tasks.filter(t => t.status === 'completed')

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/projects" className="mt-1 w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: project.color + '20' }}>
              <span className="material-symbols-outlined text-[20px]" style={{ color: project.color }}>folder</span>
            </div>
            <div>
              <h1 className="font-display text-headline-lg font-extrabold text-on-surface" style={{ letterSpacing: '-0.02em' }}>{project.name}</h1>
              {project.description && <p className="text-label-md text-on-surface-variant">{project.description}</p>}
            </div>
          </div>
        </div>
        <button onClick={handleDelete} className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors">
          <span className="material-symbols-outlined text-[18px]">delete</span>
        </button>
      </div>

      {/* Metrics summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total tareas', value: metrics.total_tasks, icon: 'task_alt' },
          { label: 'Completadas', value: metrics.completed_tasks, icon: 'check_circle' },
          { label: 'Progreso', value: `${metrics.completion_rate}%`, icon: 'trending_up' },
        ].map(s => (
          <div key={s.label} className="bg-surface rounded-2xl border border-outline-variant p-4 zen-shadow text-center">
            <span className="material-symbols-outlined text-[20px]" style={{ color: project.color }}>{s.icon}</span>
            <p className="font-display text-title-lg font-extrabold text-on-surface mt-1">{s.value}</p>
            <p className="text-label-sm text-on-surface-variant">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="bg-surface rounded-2xl border border-outline-variant p-4 zen-shadow space-y-2">
        <div className="flex justify-between text-label-sm text-on-surface-variant">
          <span>Progreso general</span>
          <span className="font-semibold" style={{ color: project.color }}>{metrics.completion_rate}%</span>
        </div>
        <div className="w-full bg-surface-container-high rounded-full h-2">
          <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${metrics.completion_rate}%`, backgroundColor: project.color }} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-container rounded-xl p-1">
        {(['tareas', 'archivos', 'metricas'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-label-md font-semibold capitalize transition-all ${tab === t ? 'bg-surface text-on-surface zen-shadow' : 'text-on-surface-variant hover:text-on-surface'}`}>
            {t === 'tareas' ? `Tareas (${metrics.pending_tasks})` : t === 'archivos' ? `Archivos (${files.length})` : 'Métricas'}
          </button>
        ))}
      </div>

      {/* Tab: Tareas */}
      {tab === 'tareas' && (
        <div className="space-y-4">
          <form onSubmit={handleAddTask} className="flex gap-2">
            <input
              type="text" value={newTask} onChange={e => setNewTask(e.target.value)}
              placeholder="Agregar tarea al proyecto..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-surface border border-outline-variant text-on-surface text-label-md focus:outline-none focus:border-primary transition-colors placeholder:text-outline"
            />
            <button type="submit" disabled={!newTask.trim() || saving}
              className="px-4 py-2.5 rounded-xl bg-primary text-on-primary text-label-md font-semibold hover:opacity-90 disabled:opacity-50">
              <span className="material-symbols-outlined text-[18px]">add</span>
            </button>
          </form>

          {pendingTasks.length === 0 && completedTasks.length === 0 && (
            <div className="text-center py-10 text-on-surface-variant text-label-md">Sin tareas — agrega la primera arriba</div>
          )}

          <div className="space-y-2">
            {pendingTasks.map(t => (
              <div key={t.id} className="flex items-center gap-3 p-3 bg-surface rounded-xl border border-outline-variant hover:border-primary/30 transition-colors">
                <button onClick={() => handleToggleTask(t.id, t.status)} className="w-5 h-5 rounded-full border-2 border-outline-variant hover:border-primary transition-colors flex-shrink-0" />
                <span className={`material-symbols-outlined text-[14px] ${PRIORITY_COLOR[t.priority as Priority]}`}>{PRIORITY_ICON[t.priority as Priority]}</span>
                <p className="flex-1 text-label-md text-on-surface">{t.title}</p>
                {t.due_date && <p className="text-label-sm text-on-surface-variant">{t.due_date}</p>}
              </div>
            ))}
          </div>

          {completedTasks.length > 0 && (
            <div className="space-y-2">
              <p className="text-label-sm text-on-surface-variant font-medium">Completadas ({completedTasks.length})</p>
              {completedTasks.map(t => (
                <div key={t.id} className="flex items-center gap-3 p-3 bg-surface-container rounded-xl opacity-60">
                  <button onClick={() => handleToggleTask(t.id, t.status)} className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[12px] text-on-primary">check</span>
                  </button>
                  <p className="flex-1 text-label-md text-on-surface-variant line-through">{t.title}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Archivos */}
      {tab === 'archivos' && (
        <div className="space-y-4">
          <button onClick={() => setShowFileForm(true)}
            className="flex items-center gap-2 text-primary text-label-md font-semibold hover:opacity-70 transition-opacity">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Agregar contexto
          </button>

          {showFileForm && (
            <form onSubmit={handleAddFile} className="bg-surface rounded-2xl border border-outline-variant p-5 space-y-3">
              <input type="text" placeholder="Nombre del archivo" value={newFileName} onChange={e => setNewFileName(e.target.value)} required
                className="w-full px-0 py-2 bg-transparent border-b border-outline-variant text-on-surface text-label-md focus:outline-none focus:border-primary transition-colors placeholder:text-outline" />
              <textarea placeholder="Contenido, notas, contexto, brief..." value={newFileContent} onChange={e => setNewFileContent(e.target.value)} required rows={5}
                className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant text-on-surface text-label-md focus:outline-none focus:border-primary transition-colors resize-none placeholder:text-outline-variant" />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowFileForm(false)} className="px-4 py-2 rounded-xl text-label-md text-on-surface-variant hover:bg-surface-container">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-primary text-on-primary text-label-md font-semibold">Guardar</button>
              </div>
            </form>
          )}

          {files.length === 0 ? (
            <div className="text-center py-10 text-on-surface-variant text-label-md">Sin archivos de contexto</div>
          ) : (
            <div className="space-y-3">
              {files.map(f => (
                <div key={f.id} className="bg-surface rounded-2xl border border-outline-variant p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-primary">description</span>
                      <p className="text-label-md font-semibold text-on-surface">{f.name}</p>
                    </div>
                    <button onClick={() => handleDeleteFile(f.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors">
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                  <p className="text-label-sm text-on-surface-variant whitespace-pre-wrap line-clamp-3">{f.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Métricas */}
      {tab === 'metricas' && (
        <div className="space-y-4">
          <div className="bg-surface rounded-2xl border border-outline-variant p-5 space-y-4">
            <h3 className="font-display font-bold text-label-lg text-on-surface">Velocidad semanal</h3>
            <p className="text-label-sm text-on-surface-variant">Tareas completadas por semana (últimas 4 semanas)</p>
            <div className="flex items-end gap-3 h-24">
              {metrics.weekly_velocity.map((v, i) => {
                const max = Math.max(...metrics.weekly_velocity, 1)
                const h = (v / max) * 100
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-label-sm font-bold text-on-surface">{v}</span>
                    <div className="w-full rounded-t-lg transition-all" style={{ height: `${Math.max(h, 4)}%`, backgroundColor: project.color + (i === 3 ? 'ff' : '60') }} />
                    <span className="text-label-sm text-on-surface-variant">S{i + 1}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface rounded-2xl border border-outline-variant p-4 zen-shadow">
              <p className="text-label-sm text-on-surface-variant">Tasa de completitud</p>
              <p className="font-display text-display-sm font-extrabold mt-1" style={{ color: project.color }}>{metrics.completion_rate}%</p>
              <p className="text-label-sm text-on-surface-variant mt-1">{metrics.completed_tasks} de {metrics.total_tasks} tareas</p>
            </div>
            <div className="bg-surface rounded-2xl border border-outline-variant p-4 zen-shadow">
              <p className="text-label-sm text-on-surface-variant">Pendientes</p>
              <p className="font-display text-display-sm font-extrabold text-on-surface mt-1">{metrics.pending_tasks}</p>
              <p className="text-label-sm text-on-surface-variant mt-1">tareas por completar</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
