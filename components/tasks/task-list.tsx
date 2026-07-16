'use client'

import { useState, useEffect, useCallback } from 'react'
import { TaskCard } from './task-card'
import { TaskForm } from './task-form'
import type { Task, CreateTaskInput } from '@/types'

type Filter = 'pending' | 'all' | 'completed'

const FILTER_LABELS: Record<Filter, string> = {
  pending: 'Pendientes',
  all: 'Todas',
  completed: 'Hechas',
}

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [filter, setFilter] = useState<Filter>('pending')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchTasks = useCallback(async () => {
    const res = await fetch('/api/tasks')
    if (res.ok) setTasks(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  async function handleCreate(data: CreateTaskInput) {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const newTask = await res.json()
      setTasks(prev => [newTask, ...prev])
      setShowForm(false)
    }
  }

  async function handleComplete(id: string) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    })
    if (res.ok) {
      const updated = await res.json()
      setTasks(prev => prev.map(t => t.id === id ? updated : t))
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    if (res.ok) setTasks(prev => prev.filter(t => t.id !== id))
  }

  // Pending view: only current month or earlier + no-date tasks
  function isCurrentMonthOrEarlier(due_date: string | null): boolean {
    if (!due_date) return true
    const d = new Date(due_date.substring(0, 10) + 'T12:00:00')
    if (isNaN(d.getTime())) return true
    const now = new Date()
    return d.getFullYear() < now.getFullYear() ||
      (d.getFullYear() === now.getFullYear() && d.getMonth() <= now.getMonth())
  }

  const filtered = tasks.filter(t => {
    if (filter === 'all') return true
    if (filter === 'completed') return t.status === 'completed'
    return t.status === 'pending' && isCurrentMonthOrEarlier(t.due_date)
  }).sort((a, b) => {
    if (filter === 'completed') {
      return (b.updated_at ?? b.created_at ?? '').localeCompare(a.updated_at ?? a.created_at ?? '')
    }
    return 0
  })

  const pendingCount = tasks.filter(t => t.status === 'pending' && isCurrentMonthOrEarlier(t.due_date)).length
  const completedCount = tasks.filter(t => t.status === 'completed').length

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-1 bg-surface-container rounded-2xl p-1">
        {(['pending', 'all', 'completed'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-label-md transition-all ${
              filter === f
                ? 'bg-surface text-on-surface shadow-sm font-semibold'
                : 'text-on-surface-variant'
            }`}
          >
            {FILTER_LABELS[f]}
            {f === 'pending' && pendingCount > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                filter === f ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface-variant'
              }`}>
                {pendingCount}
              </span>
            )}
            {f === 'completed' && completedCount > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                filter === f ? 'bg-primary/20 text-primary' : 'bg-surface-container-high text-on-surface-variant'
              }`}>
                {completedCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {showForm && (
        <TaskForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-surface rounded-2xl border border-outline-variant animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <span className="material-symbols-outlined text-[48px] text-outline-variant block mb-3">task_alt</span>
          <p className="text-label-md font-semibold text-on-surface-variant">
            {filter === 'pending' ? '¡Sin pendientes este mes!' : 'Sin tareas'}
          </p>
          {filter === 'pending' && (
            <p className="text-label-sm text-on-surface-variant mt-1 opacity-70">Las de meses futuros están en &quot;Todas&quot;</p>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={handleComplete}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* FAB — floating add button (always visible) */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-[calc(80px+env(safe-area-inset-bottom))] right-5 z-40 sm:hidden w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        aria-label="Nueva tarea"
      >
        <span className="material-symbols-outlined text-[26px]">add</span>
      </button>

      {/* Desktop add button */}
      <div className="hidden sm:flex justify-end">
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-xl text-label-md font-semibold hover:opacity-90 transition-opacity"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nueva tarea
        </button>
      </div>
    </div>
  )
}
