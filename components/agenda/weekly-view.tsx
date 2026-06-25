'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, startOfWeek, addDays, isToday, isSameDay, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { EventForm } from './event-form'
import type { Event, CreateEventInput } from '@/types'

export function WeeklyView() {
  const [events, setEvents] = useState<Event[]>([])
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchEvents = useCallback(async () => {
    const res = await fetch('/api/events')
    if (res.ok) setEvents(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  async function handleCreate(data: CreateEventInput) {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const newEvent = await res.json()
      setEvents(prev => [...prev, newEvent])
      setShowForm(false)
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/events/${id}`, { method: 'DELETE' })
    if (res.ok) setEvents(prev => prev.filter(e => e.id !== id))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setWeekStart(d => addDays(d, -7))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container-high transition-colors text-on-surface-variant">
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
          <span className="text-label-md font-semibold text-on-surface">
            {format(weekStart, "d MMM", { locale: es })} – {format(addDays(weekStart, 6), "d MMM yyyy", { locale: es })}
          </span>
          <button onClick={() => setWeekStart(d => addDays(d, 7))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container-high transition-colors text-on-surface-variant">
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>
          <button onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="px-3 py-1 rounded-lg text-label-sm text-on-surface-variant hover:bg-surface-container-high transition-colors">
            Hoy
          </button>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-xl text-label-md font-semibold hover:opacity-90 transition-opacity"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nuevo evento
        </button>
      </div>

      {showForm && <EventForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />}

      {loading ? (
        <div className="text-center py-12 text-on-surface-variant text-label-md">Cargando...</div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map(day => {
            const dayEvents = events.filter(e => isSameDay(parseISO(e.starts_at), day))
            const today = isToday(day)
            return (
              <div key={day.toISOString()} className={`rounded-xl border p-3 min-h-[120px] ${today ? 'border-primary bg-primary/5' : 'border-outline-variant bg-surface-container-lowest'}`}>
                <div className="text-center mb-2">
                  <p className="text-label-sm text-on-surface-variant capitalize">{format(day, 'EEE', { locale: es })}</p>
                  <p className={`text-headline-md font-bold ${today ? 'text-primary' : 'text-on-surface'}`}>
                    {format(day, 'd')}
                  </p>
                </div>
                <div className="space-y-1">
                  {dayEvents.map(event => (
                    <div key={event.id} className="group relative bg-primary/10 border border-primary/20 rounded-lg px-2 py-1">
                      <p className="text-label-sm text-primary font-medium truncate">{event.title}</p>
                      <p className="text-label-sm text-on-surface-variant">{format(parseISO(event.starts_at), 'HH:mm')}</p>
                      <button
                        onClick={() => handleDelete(event.id)}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded text-error hover:bg-error/10 transition-all"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
