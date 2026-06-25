'use client'

import { useState } from 'react'
import type { CreateEventInput } from '@/types'

interface EventFormProps {
  onSubmit: (data: CreateEventInput) => Promise<void>
  onCancel: () => void
}

export function EventForm({ onSubmit, onCancel }: EventFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [reminder, setReminder] = useState(30)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !startsAt) return
    setLoading(true)
    await onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      starts_at: startsAt,
      ends_at: endsAt || undefined,
      reminder_minutes: reminder,
    })
    setLoading(false)
  }

  const inputClass = "w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"

  return (
    <form onSubmit={handleSubmit} className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 space-y-4">
      <h3 className="text-label-md font-semibold text-on-surface">Nuevo evento</h3>

      <input
        type="text"
        placeholder="Título del evento"
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-label-sm text-on-surface-variant mb-1">Inicio</label>
          <input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} required className={inputClass} />
        </div>
        <div>
          <label className="block text-label-sm text-on-surface-variant mb-1">Fin (opcional)</label>
          <input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} className={inputClass} />
        </div>
      </div>

      <div>
        <label className="block text-label-sm text-on-surface-variant mb-1">Recordatorio</label>
        <select value={reminder} onChange={e => setReminder(Number(e.target.value))} className={inputClass}>
          <option value={0}>Sin recordatorio</option>
          <option value={15}>15 minutos antes</option>
          <option value={30}>30 minutos antes</option>
          <option value={60}>1 hora antes</option>
          <option value={1440}>1 día antes</option>
        </select>
      </div>

      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl text-label-md text-on-surface-variant hover:bg-surface-container-high transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={loading || !title.trim() || !startsAt} className="px-4 py-2 rounded-xl bg-primary text-on-primary text-label-md font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
          {loading ? 'Guardando...' : 'Guardar evento'}
        </button>
      </div>
    </form>
  )
}
