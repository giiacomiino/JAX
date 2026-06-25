'use client'

import { useState } from 'react'
import type { CreateTaskInput, Priority, Category } from '@/types'

interface TaskFormProps {
  onSubmit: (data: CreateTaskInput) => Promise<void>
  onCancel: () => void
}

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

  const inputClass = "w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
  const selectClass = inputClass

  return (
    <form onSubmit={handleSubmit} className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 space-y-4">
      <h3 className="text-label-md font-semibold text-on-surface">Nueva tarea</h3>

      <input
        type="text"
        placeholder="Título de la tarea"
        value={title}
        onChange={e => setTitle(e.target.value)}
        required
        className={inputClass}
      />

      <input
        type="text"
        placeholder="Descripción (opcional)"
        value={description}
        onChange={e => setDescription(e.target.value)}
        className={inputClass}
      />

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-label-sm text-on-surface-variant mb-1">Fecha límite</label>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-label-sm text-on-surface-variant mb-1">Prioridad</label>
          <select value={priority} onChange={e => setPriority(e.target.value as Priority)} className={selectClass}>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
        </div>
        <div>
          <label className="block text-label-sm text-on-surface-variant mb-1">Categoría</label>
          <select value={category} onChange={e => setCategory(e.target.value as Category)} className={selectClass}>
            <option value="work">Trabajo</option>
            <option value="personal">Personal</option>
            <option value="finance">Finanzas</option>
            <option value="other">Otro</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl text-label-md text-on-surface-variant hover:bg-surface-container-high transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="px-4 py-2 rounded-xl bg-primary text-on-primary text-label-md font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? 'Guardando...' : 'Guardar tarea'}
        </button>
      </div>
    </form>
  )
}
