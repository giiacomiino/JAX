'use client'

import { useEffect, useState } from 'react'
import { format, isToday, isTomorrow, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import type { Event } from '@/types'

export function UpcomingEvents() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/events')
      .then(r => r.json())
      .then((all: Event[]) => {
        const now = new Date()
        setEvents(all.filter(e => parseISO(e.starts_at) >= now).slice(0, 3))
        setLoading(false)
      })
  }, [])

  return (
    <div className="bg-surface-container-low rounded-3xl p-8 zen-shadow">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-headline-md font-bold text-on-surface">Agenda diaria</h2>
        <Link href="/agenda" className="text-label-sm text-on-surface-variant hover:text-primary transition-colors">
          {format(new Date(), "d 'de' MMM", { locale: es })}
        </Link>
      </div>

      {loading ? (
        <p className="text-label-md text-on-surface-variant">Cargando...</p>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <span className="material-symbols-outlined text-[40px] text-outline-variant mb-2">calendar_today</span>
          <p className="text-body-md text-on-surface-variant">Sin eventos próximos</p>
          <Link href="/agenda" className="mt-2 text-label-sm text-primary">Agregar evento →</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map(e => {
            const date = parseISO(e.starts_at)
            const when = isToday(date) ? 'Hoy' : isTomorrow(date) ? 'Mañana' : format(date, "d MMM", { locale: es })
            const isNow = isToday(date)
            return (
              <div key={e.id} className="flex gap-4">
                <span className="text-label-sm text-on-surface-variant w-12 pt-1 flex-shrink-0">{format(date, 'HH:mm')}</span>
                <div className={`flex-1 p-4 rounded-2xl ${isNow ? 'bg-primary text-on-primary' : 'bg-surface-container border border-outline-variant'}`}>
                  <p className={`text-label-md font-semibold ${isNow ? 'text-on-primary' : 'text-on-surface'}`}>{e.title}</p>
                  <p className={`text-label-sm ${isNow ? 'text-on-primary/80' : 'text-on-surface-variant'}`}>{when}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
