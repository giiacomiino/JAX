'use client'

import { useState, useEffect, useCallback } from 'react'
import { TaskCard } from './task-card'
import { TaskForm } from './task-form'
import type { Task, CreateTaskInput } from '@/types'

type Filter = 'all' | 'pending' | 'completed'

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

  const filtered = tasks.filter(t =>
    filter === 'all' ? true : t.status === filter
  )

  const pendingCount = tasks.filter(t => t.status === 'pending').length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-surface-container rounded-xl p-1">
          {(['pending', 'all', 'completed'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-label-md transition-all ${
                filter === f
                  ? 'bg-surface-container-lowest text-on-surface shadow-sm font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {f === 'pending' ? `Pendientes ${pendingCount > 0 ? `(${pendingCount})` : ''}` : f === 'all' ? 'Todas' : 'Completadas'}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-xl text-label-md font-semibold hover:opacity-90 transition-opacity"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nueva tarea
        </button>
      </div>

      {showForm && (
        <TaskForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
      )}

      {loading ? (
        <div className="text-center py-12 text-on-surface-variant text-label-md">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-on-surface-variant text-label-md">
          {filter === 'pending' ? 'Sin tareas pendientes' : 'Sin tareas'}
        </div>
      ) : (
        <div className="space-y-3">
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
    </div>
  )
}
