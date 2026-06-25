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

const PRIORITY_COLOR: Record<Priority, string> = { high: 'text-red-500', medium: 'text-amber-500', low: 'text-on-surface-variant' }
const PRIORITY_ICON: Record<Priority, string> = { high: 'priority_high', medium: 'remove', low: 'arrow_downward' }

type Tab = 'tareas' | 'archivos' | 'metricas'

function TaskItem({ task, projectColor, onToggle, onDelete, onEdit }: {
  task: Task
  projectColor: string
  onToggle: (id: string, status: string) => void
  onDelete: (id: string) => void
  onEdit: (id: string, title: string, priority: Priority, due_date: string | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [editPriority, setEditPriority] = useState<Priority>(task.priority as Priority)
  const [editDate, setEditDate] = useState(task.due_date ?? '')

  async function saveEdit() {
    await onEdit(task.id, editTitle, editPriority, editDate || null)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="p-3 bg-surface rounded-xl border-2 space-y-2" style={{ borderColor: projectColor + '40' }}>
        <input
          autoFocus value={editTitle} onChange={e => setEditTitle(e.target.value)}
          className="w-full bg-transparent text-label-md text-on-surface focus:outline-none font-medium"
          onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(false) }}
        />
        <div className="flex items-center gap-3">
          <select value={editPriority} onChange={e => setEditPriority(e.target.value as Priority)}
            className="text-label-sm px-2 py-1 rounded-lg bg-surface-container border border-outline-variant text-on-surface focus:outline-none">
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
          <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
            className="text-label-sm px-2 py-1 rounded-lg bg-surface-container border border-outline-variant text-on-surface focus:outline-none" />
          <div className="ml-auto flex gap-2">
            <button onClick={() => setEditing(false)} className="px-3 py-1 rounded-lg text-label-sm text-on-surface-variant hover:bg-surface-container">Cancelar</button>
            <button onClick={saveEdit} className="px-3 py-1 rounded-lg text-label-sm text-on-primary font-semibold" style={{ backgroundColor: projectColor }}>Guardar</button>
          </div>
        </div>
      </div>
    )
  }

  const done = task.status === 'completed'
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors group ${done ? 'bg-surface-container border-transparent opacity-60' : 'bg-surface border-outline-variant hover:border-primary/30'}`}>
      <button onClick={() => onToggle(task.id, task.status)}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${done ? 'border-transparent' : 'border-outline-variant hover:border-primary'}`}
        style={done ? { backgroundColor: projectColor } : {}}>
        {done && <span className="material-symbols-outlined text-[12px] text-white">check</span>}
      </button>
      <span className={`material-symbols-outlined text-[13px] ${PRIORITY_COLOR[task.priority as Priority]}`}>{PRIORITY_ICON[task.priority as Priority]}</span>
      <p className={`flex-1 text-label-md ${done ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>{task.title}</p>
      {task.due_date && !done && (
        <span className="text-label-sm text-on-surface-variant">{task.due_date}</span>
      )}
      {!done && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => { setEditing(true); setEditTitle(task.title); setEditPriority(task.priority as Priority); setEditDate(task.due_date ?? '') }}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[15px]">edit</span>
          </button>
          <button onClick={() => onDelete(task.id)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors">
            <span className="material-symbols-outlined text-[15px]">delete</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [tab, setTab] = useState<Tab>('tareas')
  const [loading, setLoading] = useState(true)
  const [newTask, setNewTask] = useState('')
  const [newPriority, setNewPriority] = useState<Priority>('medium')
  const [newDate, setNewDate] = useState('')
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
      body: JSON.stringify({ title: newTask.trim(), priority: newPriority, category: 'work', due_date: newDate || undefined, project_id: id }),
    })
    setNewTask(''); setNewDate('')
    setSaving(false)
    load()
  }

  async function handleToggle(taskId: string, status: string) {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: status === 'completed' ? 'pending' : 'completed' }),
    })
    load()
  }

  async function handleDelete(taskId: string) {
    await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
    load()
  }

  async function handleEdit(taskId: string, title: string, priority: Priority, due_date: string | null) {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, priority, due_date }),
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

  async function handleDeleteProject() {
    if (!confirm('¿Eliminar este proyecto y todas sus tareas?')) return
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
        <button onClick={handleDeleteProject} className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors">
          <span className="material-symbols-outlined text-[18px]">delete</span>
        </button>
      </div>

      {/* Metrics summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: metrics.total_tasks, icon: 'task_alt' },
          { label: 'Completadas', value: metrics.completed_tasks, icon: 'check_circle' },
          { label: 'Progreso', value: `${metrics.completion_rate}%`, icon: 'trending_up' },
        ].map(s => (
          <div key={s.label} className="bg-surface rounded-2xl border border-outline-variant p-4 zen-shadow text-center">
            <span className="material-symbols-outlined text-[18px]" style={{ color: project.color }}>{s.icon}</span>
            <p className="font-display text-title-lg font-extrabold text-on-surface mt-1">{s.value}</p>
            <p className="text-label-sm text-on-surface-variant">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="bg-surface rounded-2xl border border-outline-variant p-4 zen-shadow">
        <div className="flex justify-between text-label-sm text-on-surface-variant mb-2">
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
          <form onSubmit={handleAddTask} className="flex gap-2 flex-wrap">
            <input
              type="text" value={newTask} onChange={e => setNewTask(e.target.value)}
              placeholder="Nueva tarea..."
              className="flex-1 min-w-48 px-4 py-2.5 rounded-xl bg-surface border border-outline-variant text-on-surface text-label-md focus:outline-none focus:border-primary transition-colors placeholder:text-outline"
            />
            <select value={newPriority} onChange={e => setNewPriority(e.target.value as Priority)}
              className="px-3 py-2.5 rounded-xl bg-surface border border-outline-variant text-on-surface text-label-sm focus:outline-none">
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </select>
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-surface border border-outline-variant text-on-surface text-label-sm focus:outline-none" />
            <button type="submit" disabled={!newTask.trim() || saving}
              className="px-4 py-2.5 rounded-xl text-white text-label-md font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
              style={{ backgroundColor: project.color }}>
              <span className="material-symbols-outlined text-[18px]">add</span>
            </button>
          </form>

          {tasks.length === 0 && (
            <div className="text-center py-10 text-on-surface-variant text-label-md">Sin tareas — agrega la primera arriba</div>
          )}

          <div className="space-y-2">
            {pendingTasks.map(t => (
              <TaskItem key={t.id} task={t} projectColor={project.color}
                onToggle={handleToggle} onDelete={handleDelete} onEdit={handleEdit} />
            ))}
          </div>

          {completedTasks.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-label-sm text-on-surface-variant font-medium uppercase tracking-wide">Completadas ({completedTasks.length})</p>
              {completedTasks.map(t => (
                <TaskItem key={t.id} task={t} projectColor={project.color}
                  onToggle={handleToggle} onDelete={handleDelete} onEdit={handleEdit} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Archivos */}
      {tab === 'archivos' && (
        <div className="space-y-4">
          <button onClick={() => setShowFileForm(true)}
            className="flex items-center gap-2 text-label-md font-semibold hover:opacity-70 transition-opacity" style={{ color: project.color }}>
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
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl text-white text-label-md font-semibold" style={{ backgroundColor: project.color }}>Guardar</button>
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
                      <span className="material-symbols-outlined text-[16px]" style={{ color: project.color }}>description</span>
                      <p className="text-label-md font-semibold text-on-surface">{f.name}</p>
                    </div>
                    <button onClick={() => handleDeleteFile(f.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors">
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                  <p className="text-label-sm text-on-surface-variant whitespace-pre-wrap">{f.content}</p>
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
            <div>
              <h3 className="font-display font-bold text-label-lg text-on-surface">Velocidad semanal</h3>
              <p className="text-label-sm text-on-surface-variant">Tareas completadas · últimas 4 semanas</p>
            </div>
            <div className="flex items-end gap-3 h-28">
              {metrics.weekly_velocity.map((v, i) => {
                const max = Math.max(...metrics.weekly_velocity, 1)
                const pct = (v / max) * 100
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-label-sm font-bold text-on-surface">{v}</span>
                    <div className="w-full rounded-t-lg transition-all" style={{ height: `${Math.max(pct, 6)}%`, backgroundColor: project.color + (i === 3 ? 'ff' : '50') }} />
                    <span className="text-label-sm text-on-surface-variant">S-{3 - i}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface rounded-2xl border border-outline-variant p-4 zen-shadow">
              <p className="text-label-sm text-on-surface-variant">Completitud</p>
              <p className="font-display text-display-sm font-extrabold mt-1" style={{ color: project.color }}>{metrics.completion_rate}%</p>
              <p className="text-label-sm text-on-surface-variant mt-1">{metrics.completed_tasks}/{metrics.total_tasks} tareas</p>
            </div>
            <div className="bg-surface rounded-2xl border border-outline-variant p-4 zen-shadow">
              <p className="text-label-sm text-on-surface-variant">Pendientes</p>
              <p className="font-display text-display-sm font-extrabold text-on-surface mt-1">{metrics.pending_tasks}</p>
              <p className="text-label-sm text-on-surface-variant mt-1">por completar</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
