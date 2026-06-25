'use client'

import { useState } from 'react'
import type { CreateTaskInput, Priority, Category } from '@/types'

interface TaskFormProps {
  onSubmit: (data: CreateTaskInput) => Promise<void>
  onCancel: () => void
}

const priorities: { value: Priority; label: string; icon: string; color: string }[] = [
  { value: 'high', label: 'Alta', icon: 'priority_high', color: 'border-error text-error bg-error/5' },
  { value: 'medium', label: 'Media', icon: 'remove', color: 'border-secondary text-secondary bg-secondary/5' },
  { value: 'low', label: 'Baja', icon: 'arrow_downward', color: 'border-outline text-on-surface-variant bg-surface-container' },
]

const categories: { value: Category; label: string; icon: string }[] = [
  { value: 'work', label: 'Trabajo', icon: 'work' },
  { value: 'personal', label: 'Personal', icon: 'person' },
  { value: 'finance', label: 'Finanzas', icon: 'payments' },
  { value: 'other', label: 'Otro', icon: 'category' },
]

export function TaskForm({ onSubmit, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [category, setCategory] = useState<Category>('work')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    await onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      due_date: dueDate || undefined,
      priority,
      category,
    })
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 zen-shadow space-y-5">
      <div className="flex items-center gap-3 pb-4 border-b border-outline-variant">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-[18px] text-primary">add_task</span>
        </div>
        <h3 className="font-display text-label-md font-semibold text-on-surface">Nueva tarea</h3>
      </div>

      <div className="space-y-1">
        <input
          type="text"
          placeholder="¿Qué necesitas hacer?"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          autoFocus
          className="w-full px-0 py-2 bg-transparent border-0 border-b-2 border-outline-variant text-on-surface text-body-lg font-medium focus:outline-none focus:border-primary transition-colors placeholder:text-outline"
        />
        <input
          type="text"
          placeholder="Descripción opcional..."
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="w-full px-0 py-1.5 bg-transparent border-0 text-on-surface-variant text-body-md focus:outline-none placeholder:text-outline-variant"
        />
      </div>

      {/* Prioridad */}
      <div className="space-y-2">
        <p className="text-label-sm text-on-surface-variant font-medium">Prioridad</p>
        <div className="flex gap-2">
          {priorities.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPriority(p.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-label-sm font-medium border transition-all ${
                priority === p.value ? p.color + ' border-2' : 'border border-outline-variant text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">{p.icon}</span>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Categoría */}
      <div className="space-y-2">
        <p className="text-label-sm text-on-surface-variant font-medium">Categoría</p>
        <div className="flex gap-2 flex-wrap">
          {categories.map(c => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-label-sm font-medium border transition-all ${
                category === c.value
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'border-outline-variant text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">{c.icon}</span>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fecha */}
      <div className="space-y-1">
        <p className="text-label-sm text-on-surface-variant font-medium">Fecha límite</p>
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className="px-3 py-2 rounded-xl bg-surface-container border border-outline-variant text-on-surface text-label-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
        />
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl text-label-md text-on-surface-variant hover:bg-surface-container-high transition-colors">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-on-primary text-label-md font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? (
            <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
          ) : (
            <span className="material-symbols-outlined text-[16px]">check</span>
          )}
          {loading ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}
