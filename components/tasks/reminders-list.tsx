'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, parseISO, isToday, isPast, isTomorrow } from 'date-fns'
import { es } from 'date-fns/locale'

interface Reminder {
  id: string
  title: string
  description: string | null
  reminder_at: string
  is_recurring: boolean
  recurrence_pattern: 'daily' | 'weekly' | 'monthly' | 'yearly' | null
  is_done: boolean
  created_at: string
}

const PATTERNS: { value: string; label: string; icon: string }[] = [
  { value: 'daily',   label: 'Diario',   icon: 'today' },
  { value: 'weekly',  label: 'Semanal',  icon: 'view_week' },
  { value: 'monthly', label: 'Mensual',  icon: 'calendar_month' },
  { value: 'yearly',  label: 'Anual',    icon: 'event_repeat' },
]

function whenLabel(dt: string): { text: string; urgent: boolean } {
  try {
    const d = parseISO(dt)
    if (isToday(d)) return { text: 'Hoy', urgent: true }
    if (isTomorrow(d)) return { text: 'Mañana', urgent: false }
    if (isPast(d)) return { text: 'Vencido', urgent: true }
    return { text: format(d, "d 'de' MMM, HH:mm", { locale: es }), urgent: false }
  } catch { return { text: dt, urgent: false } }
}

function ReminderForm({ onSubmit, onCancel }: {
  onSubmit: (data: Partial<Reminder>) => Promise<void>
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [reminderAt, setReminderAt] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [pattern, setPattern] = useState<string>('weekly')
  const [loading, setLoading] = useState(false)

  // Default to today at 9am local
  useEffect(() => {
    const d = new Date()
    d.setHours(9, 0, 0, 0)
    setReminderAt(d.toISOString().slice(0, 16))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !reminderAt) return
    setLoading(true)
    await onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      reminder_at: new Date(reminderAt).toISOString(),
      is_recurring: isRecurring,
      recurrence_pattern: isRecurring ? (pattern as Reminder['recurrence_pattern']) : null,
    })
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-5 zen-shadow space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-outline-variant">
        <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
          <span className="material-symbols-outlined text-[16px] text-amber-600">notifications</span>
        </div>
        <h3 className="text-label-md font-semibold text-on-surface">Nuevo recordatorio</h3>
      </div>

      <input
        type="text"
        placeholder="¿Qué quieres recordar?"
        value={title}
        onChange={e => setTitle(e.target.value)}
        required
        autoFocus
        className="w-full px-0 py-1.5 bg-transparent border-0 border-b-2 border-outline-variant text-on-surface text-body-md font-medium focus:outline-none focus:border-amber-500 transition-colors placeholder:text-outline"
      />

      <input
        type="text"
        placeholder="Nota opcional..."
        value={description}
        onChange={e => setDescription(e.target.value)}
        className="w-full px-0 py-1 bg-transparent border-0 text-on-surface-variant text-body-sm focus:outline-none placeholder:text-outline-variant"
      />

      <div className="space-y-1">
        <p className="text-label-sm text-on-surface-variant font-medium">Fecha y hora</p>
        <input
          type="datetime-local"
          value={reminderAt}
          onChange={e => setReminderAt(e.target.value)}
          required
          className="px-3 py-2 rounded-xl bg-surface-container border border-outline-variant text-on-surface text-label-md focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-500 transition-colors"
        />
      </div>

      {/* Recurrencia */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setIsRecurring(r => !r)}
          className="flex items-center gap-2 group"
        >
          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
            isRecurring ? 'bg-amber-500 border-amber-500' : 'border-outline-variant group-hover:border-amber-400'
          }`}>
            {isRecurring && <span className="material-symbols-outlined text-[10px] text-white">check</span>}
          </div>
          <span className="text-label-sm text-on-surface-variant group-hover:text-on-surface transition-colors">Recurrente</span>
        </button>

        {isRecurring && (
          <div className="flex gap-2 flex-wrap pl-6">
            {PATTERNS.map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPattern(p.value)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-label-sm border transition-all ${
                  pattern === p.value
                    ? 'bg-amber-100 text-amber-700 border-amber-300 font-semibold'
                    : 'border-outline-variant text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-[12px]">{p.icon}</span>
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-end pt-1">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl text-label-md text-on-surface-variant hover:bg-surface-container-high transition-colors">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white text-label-md font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50"
        >
          {loading
            ? <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
            : <span className="material-symbols-outlined text-[14px]">notifications_active</span>
          }
          {loading ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}

export function RemindersList() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'all'>('pending')

  const fetchReminders = useCallback(async () => {
    const res = await fetch('/api/reminders')
    if (res.ok) setReminders(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchReminders() }, [fetchReminders])

  async function handleCreate(data: Partial<Reminder>) {
    const res = await fetch('/api/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const created = await res.json()
      setReminders(prev => [...prev, created].sort((a, b) =>
        a.reminder_at.localeCompare(b.reminder_at)
      ))
      setShowForm(false)
    }
  }

  async function toggleDone(r: Reminder) {
    const res = await fetch(`/api/reminders/${r.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_done: !r.is_done }),
    })
    if (res.ok) {
      const updated = await res.json()
      setReminders(prev => prev.map(x => x.id === r.id ? updated : x))
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/reminders/${id}`, { method: 'DELETE' })
    if (res.ok) setReminders(prev => prev.filter(r => r.id !== id))
  }

  const filtered = filter === 'pending'
    ? reminders.filter(r => !r.is_done)
    : reminders

  const pendingCount = reminders.filter(r => !r.is_done).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-surface-container rounded-xl p-1">
          {(['pending', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-label-md transition-all ${
                filter === f
                  ? 'bg-surface-container-lowest text-on-surface shadow-sm font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {f === 'pending' ? `Pendientes${pendingCount > 0 ? ` (${pendingCount})` : ''}` : 'Todos'}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-xl text-label-md font-semibold hover:bg-amber-600 transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Recordatorio
        </button>
      </div>

      {showForm && <ReminderForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />}

      {loading ? (
        <div className="text-center py-8 text-on-surface-variant text-label-md">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10">
          <span className="material-symbols-outlined text-[44px] text-outline-variant block mb-2">notifications_off</span>
          <p className="text-label-md text-on-surface-variant">Sin recordatorios pendientes</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => {
            const { text, urgent } = whenLabel(r.reminder_at)
            return (
              <div
                key={r.id}
                className={`flex items-center gap-3 p-4 rounded-2xl border transition-all group ${
                  r.is_done
                    ? 'border-transparent bg-surface-container/50 opacity-50'
                    : urgent
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-outline-variant bg-surface'
                }`}
              >
                {/* Done toggle */}
                <button
                  onClick={() => toggleDone(r)}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    r.is_done
                      ? 'bg-green-500 border-green-500'
                      : urgent
                      ? 'border-amber-400 hover:border-amber-500'
                      : 'border-outline-variant hover:border-primary'
                  }`}
                >
                  {r.is_done && <span className="material-symbols-outlined text-[10px] text-white">check</span>}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-label-md text-on-surface ${r.is_done ? 'line-through text-on-surface-variant' : 'font-medium'}`}>
                      {r.title}
                    </p>
                    {r.is_recurring && (
                      <span className="flex items-center gap-0.5 text-label-sm text-on-surface-variant">
                        <span className="material-symbols-outlined text-[12px]">repeat</span>
                        {PATTERNS.find(p => p.value === r.recurrence_pattern)?.label ?? ''}
                      </span>
                    )}
                  </div>
                  {r.description && <p className="text-label-sm text-on-surface-variant mt-0.5 truncate">{r.description}</p>}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-label-sm px-2 py-0.5 rounded-full font-medium ${
                    urgent && !r.is_done ? 'bg-amber-100 text-amber-700' : 'text-on-surface-variant'
                  }`}>
                    {text}
                  </span>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-all"
                  >
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
