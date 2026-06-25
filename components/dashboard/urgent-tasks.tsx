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
    <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-label-md font-semibold text-on-surface">Tareas urgentes</h2>
        <Link href="/tasks" className="text-label-sm text-primary hover:underline">Ver todas</Link>
      </div>
      {loading ? (
        <p className="text-label-md text-on-surface-variant">Cargando...</p>
      ) : tasks.length === 0 ? (
        <p className="text-label-md text-on-surface-variant">Sin tareas urgentes</p>
      ) : (
        <div className="space-y-2">
          {tasks.map(t => (
            <div key={t.id} className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${t.priority === 'high' ? 'bg-error' : 'bg-secondary-container'}`} />
              <span className="text-label-md text-on-surface flex-1 truncate">{t.title}</span>
              {t.due_date && (
                <span className={`text-label-sm flex-shrink-0 ${isPast(new Date(t.due_date)) ? 'text-error' : 'text-on-surface-variant'}`}>
                  {format(new Date(t.due_date), 'd MMM', { locale: es })}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
