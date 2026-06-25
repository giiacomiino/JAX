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
        const upcoming = all
          .filter(e => parseISO(e.starts_at) >= now)
          .slice(0, 4)
        setEvents(upcoming)
        setLoading(false)
      })
  }, [])

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-label-md font-semibold text-on-surface">Próximos eventos</h2>
        <Link href="/agenda" className="text-label-sm text-primary hover:underline">Ver agenda</Link>
      </div>
      {loading ? (
        <p className="text-label-md text-on-surface-variant">Cargando...</p>
      ) : events.length === 0 ? (
        <p className="text-label-md text-on-surface-variant">Sin eventos próximos</p>
      ) : (
        <div className="space-y-2">
          {events.map(e => {
            const date = parseISO(e.starts_at)
            const when = isToday(date) ? 'Hoy' : isTomorrow(date) ? 'Mañana' : format(date, 'd MMM', { locale: es })
            return (
              <div key={e.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-label-sm text-primary font-bold leading-none">{format(date, 'd')}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-label-md text-on-surface truncate">{e.title}</p>
                  <p className="text-label-sm text-on-surface-variant">{when} · {format(date, 'HH:mm')}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
