'use client'

import { useEffect, useState } from 'react'
import { format, isToday, isPast } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import type { Task } from '@/types'

export function UrgentTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/tasks')
      .then(r => r.json())
      .then((all: Task[]) => {
        const urgent = all
          .filter(t => t.status === 'pending')
          .filter(t => t.priority === 'high' || (t.due_date && (isToday(new Date(t.due_date)) || isPast(new Date(t.due_date)))))
          .slice(0, 5)
        setTasks(urgent)
        setLoading(false)
      })
  }, [])

  return (
    <div className="bg-surface-container-low rounded-3xl p-8 zen-shadow h-full">
      <div className="flex justify-between items-start mb-8">
        <div>
          <span className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-label-sm font-semibold mb-3">TRABAJO</span>
          <h2 className="text-headline-lg font-bold text-on-surface">Tareas urgentes</h2>
        </div>
        <Link href="/tasks" className="text-label-sm text-on-surface-variant hover:text-primary transition-colors border border-outline-variant rounded-full px-3 py-1">
          Ver todas
        </Link>
      </div>

      {loading ? (
        <p className="text-label-md text-on-surface-variant">Cargando...</p>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <span className="material-symbols-outlined text-[48px] text-outline-variant mb-3">check_circle</span>
          <p className="text-body-md text-on-surface-variant">Sin tareas urgentes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map(t => (
            <div key={t.id} className="flex items-center justify-between p-4 bg-white/50 rounded-2xl border border-transparent hover:border-primary/20 transition-all group">
              <div className="flex items-center gap-4">
                <div className={`w-5 h-5 rounded-md border-2 flex-shrink-0 ${t.priority === 'high' ? 'border-error' : 'border-primary'}`} />
                <span className="text-body-md text-on-surface">{t.title}</span>
              </div>
              {t.due_date && (
                <span className={`text-label-sm px-2 py-1 rounded flex-shrink-0 ${
                  isPast(new Date(t.due_date)) ? 'bg-error-container text-on-error-container' :
                  isToday(new Date(t.due_date)) ? 'bg-secondary-container text-on-secondary-container' :
                  'bg-surface-variant text-on-surface-variant'
                }`}>
                  {isToday(new Date(t.due_date)) ? 'Hoy' : isPast(new Date(t.due_date)) ? 'Vencida' : format(new Date(t.due_date), 'd MMM', { locale: es })}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
