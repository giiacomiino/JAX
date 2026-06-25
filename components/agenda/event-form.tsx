'use client'

import { useState } from 'react'
import type { CreateEventInput } from '@/types'

interface EventFormProps {
  onSubmit: (data: CreateEventInput) => Promise<void>
  onCancel: () => void
}

const reminderOptions = [
  { value: 0, label: 'Sin recordatorio' },
  { value: 15, label: '15 min antes' },
  { value: 30, label: '30 min antes' },
  { value: 60, label: '1 hora antes' },
  { value: 1440, label: '1 día antes' },
]

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

  const fieldClass = "w-full px-3 py-2.5 rounded-xl bg-surface-container border border-outline-variant text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"

  return (
    <form onSubmit={handleSubmit} className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 zen-shadow space-y-5">
      <div className="flex items-center gap-3 pb-4 border-b border-outline-variant">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-[18px] text-primary">event</span>
        </div>
        <h3 className="font-display text-label-md font-semibold text-on-surface">Nuevo evento</h3>
      </div>

      <div className="space-y-1">
        <input
          type="text"
          placeholder="Nombre del evento"
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

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-label-sm text-on-surface-variant font-medium">Inicio</label>
          <input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} required className={fieldClass} />
        </div>
        <div className="space-y-1">
          <label className="text-label-sm text-on-surface-variant font-medium">Fin (opcional)</label>
          <input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} className={fieldClass} />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-label-sm text-on-surface-variant font-medium">Recordatorio</p>
        <div className="flex gap-2 flex-wrap">
          {reminderOptions.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setReminder(opt.value)}
              className={`px-3 py-1.5 rounded-full text-label-sm font-medium border transition-all ${
                reminder === opt.value
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'border-outline-variant text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl text-label-md text-on-surface-variant hover:bg-surface-container-high transition-colors">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading || !title.trim() || !startsAt}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-on-primary text-label-md font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? (
            <span className="material-symbols-outlined text-[16px]">progress_activity</span>
          ) : (
            <span className="material-symbols-outlined text-[16px]">check</span>
          )}
          {loading ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}
