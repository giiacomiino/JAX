'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, parseISO
} from 'date-fns'
import { es } from 'date-fns/locale'
import type { Task, Event, Project } from '@/types'

interface ProjectedPayment {
  id: string; title: string; date: string; amount: number
  type: 'card_payment' | 'debt_payment' | 'recurring_expense'
  status: string; color: string
}

interface CalendarItem {
  id: string
  type: 'task' | 'event' | 'payment' | 'card_payment' | 'debt_payment' | 'recurring_expense'
  title: string
  date: string
  color: string
  done?: boolean
  amount?: number
}

const TYPE_COLORS = {
  event: '#0891b2',
  payment: '#d97706',
}

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [tasks, setTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [projected, setProjected] = useState<ProjectedPayment[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/tasks').then(r => r.json()),
      fetch('/api/events').then(r => r.json()),
      fetch('/api/finanzas/projected').then(r => r.json()),
      fetch('/api/projects').then(r => r.json()),
    ]).then(([t, e, proj, p]) => {
      setTasks(Array.isArray(t) ? t : [])
      setEvents(Array.isArray(e) ? e : [])
      setProjected(Array.isArray(proj) ? proj : [])
      setProjects(Array.isArray(p) ? p : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const projectColorMap = useMemo(() =>
    Object.fromEntries(projects.map(p => [p.id, p.color])),
    [projects]
  )

  const allItems = useMemo((): CalendarItem[] => {
    const items: CalendarItem[] = []

    for (const t of tasks) {
      if (!t.due_date) continue
      const color = (t as Task & { project_id?: string }).project_id
        ? (projectColorMap[(t as Task & { project_id?: string }).project_id!] ?? '#374151')
        : '#374151'
      items.push({ id: t.id, type: 'task', title: t.title, date: t.due_date, color, done: t.status === 'completed' })
    }

    for (const e of events) {
      items.push({ id: e.id, type: 'event', title: e.title, date: e.starts_at.split('T')[0], color: TYPE_COLORS.event })
    }

    for (const p of projected) {
      items.push({
        id: p.id, type: p.type, title: p.title, date: p.date,
        color: p.color, done: p.status === 'paid', amount: p.amount,
      })
    }

    return items
  }, [tasks, events, projected, projectColorMap])

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [currentDate])

  function itemsForDay(day: Date) {
    const key = format(day, 'yyyy-MM-dd')
    return allItems.filter(i => i.date === key)
  }

  const selectedItems = selectedDay ? itemsForDay(selectedDay) : []

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-display-sm font-extrabold text-on-surface capitalize" style={{ letterSpacing: '-0.03em' }}>
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </h1>
          <p className="text-label-md text-on-surface-variant mt-1">{allItems.length} eventos este período</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentDate(new Date())}
            className="px-3 py-2 rounded-xl text-label-sm text-on-surface-variant border border-outline-variant hover:bg-surface-container transition-colors">
            Hoy
          </button>
          <button onClick={() => setCurrentDate(d => subMonths(d, 1))}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
          <button onClick={() => setCurrentDate(d => addMonths(d, 1))}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#374151]" />
          <span className="text-label-sm text-on-surface-variant">Tareas sin proyecto</span>
        </div>
        {projects.map(p => (
          <div key={p.id} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-label-sm text-on-surface-variant">{p.name}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TYPE_COLORS.event }} />
          <span className="text-label-sm text-on-surface-variant">Eventos</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="text-label-sm text-on-surface-variant">Pagos</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-600" />
          <span className="text-label-sm text-on-surface-variant">Tarjetas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-violet-600" />
          <span className="text-label-sm text-on-surface-variant">Deudas</span>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Calendario */}
        <div className="flex-1 bg-surface rounded-3xl border border-outline-variant overflow-hidden zen-shadow">
          {/* Días de la semana */}
          <div className="grid grid-cols-7 border-b border-outline-variant">
            {WEEKDAYS.map(d => (
              <div key={d} className="py-3 text-center text-label-sm font-semibold text-on-surface-variant">{d}</div>
            ))}
          </div>

          {/* Grid de días */}
          {loading ? (
            <div className="flex justify-center items-center h-96">
              <span className="material-symbols-outlined text-[32px] text-primary animate-spin">progress_activity</span>
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {calendarDays.map((day, idx) => {
                const dayItems = itemsForDay(day)
                const isCurrentMonth = isSameMonth(day, currentDate)
                const isSelected = selectedDay ? isSameDay(day, selectedDay) : false
                const todayDay = isToday(day)
                const visible = dayItems.slice(0, 3)
                const overflow = dayItems.length - visible.length

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDay(isSameDay(day, selectedDay ?? new Date('1970-01-01')) ? null : day)}
                    className={`min-h-[96px] p-2 border-b border-r border-outline-variant text-left transition-colors ${
                      isSelected ? 'bg-primary/5' :
                      todayDay ? 'bg-secondary-container/30' :
                      isCurrentMonth ? 'bg-surface hover:bg-surface-container' : 'bg-surface-container/40'
                    }`}
                  >
                    <div className={`w-7 h-7 flex items-center justify-center rounded-full text-label-md mb-1 font-semibold ${
                      todayDay ? 'bg-primary text-on-primary' :
                      isSelected ? 'bg-primary/20 text-primary' :
                      isCurrentMonth ? 'text-on-surface' : 'text-on-surface-variant/40'
                    }`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-0.5">
                      {visible.map(item => (
                        <div key={item.id}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium leading-tight truncate ${item.done ? 'opacity-40' : ''}`}
                          style={{ backgroundColor: item.color + '20', color: item.color }}>
                          {item.type === 'payment' && <span className="material-symbols-outlined text-[9px]">payments</span>}
                          {item.type === 'event' && <span className="material-symbols-outlined text-[9px]">event</span>}
                          <span className="truncate">{item.title}</span>
                        </div>
                      ))}
                      {overflow > 0 && (
                        <p className="text-[10px] text-on-surface-variant pl-1">+{overflow} más</p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Panel lateral */}
        <div className="w-72 flex-shrink-0 space-y-3">
          {selectedDay ? (
            <>
              <div className="bg-surface rounded-2xl border border-outline-variant p-4 zen-shadow">
                <p className="text-label-sm text-on-surface-variant capitalize">
                  {format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}
                </p>
                <p className="font-display font-extrabold text-headline-md text-on-surface mt-0.5">
                  {selectedItems.length === 0 ? 'Día libre' : `${selectedItems.length} ${selectedItems.length === 1 ? 'item' : 'items'}`}
                </p>
              </div>

              {selectedItems.length === 0 ? (
                <div className="bg-surface rounded-2xl border border-outline-variant p-6 text-center">
                  <span className="material-symbols-outlined text-[32px] text-outline-variant">sentiment_satisfied</span>
                  <p className="text-label-sm text-on-surface-variant mt-2">Sin compromisos</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedItems.map(item => (
                    <div key={item.id} className={`bg-surface rounded-xl border border-outline-variant p-3 ${item.done ? 'opacity-50' : ''}`}>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-label-md text-on-surface leading-tight ${item.done ? 'line-through' : ''}`}>{item.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-label-sm px-1.5 py-0.5 rounded font-medium`}
                              style={{ backgroundColor: item.color + '15', color: item.color }}>
                              {item.type === 'task' ? 'Tarea' : item.type === 'event' ? 'Evento' : 'Pago'}
                            </span>
                            {item.amount && (
                              <span className="text-label-sm text-on-surface-variant">
                                ${item.amount.toLocaleString('es-MX')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="bg-surface rounded-2xl border border-outline-variant p-6 text-center">
              <span className="material-symbols-outlined text-[32px] text-outline-variant">touch_app</span>
              <p className="text-label-sm text-on-surface-variant mt-2">Selecciona un día</p>
            </div>
          )}

          {/* Próximos eventos */}
          <div className="bg-surface rounded-2xl border border-outline-variant p-4 zen-shadow space-y-3">
            <p className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wide">Próximos 7 días</p>
            {(() => {
              const today = new Date()
              const in7 = new Date(today); in7.setDate(today.getDate() + 7)
              const upcoming = allItems.filter(i => {
                const d = parseISO(i.date)
                return d >= today && d <= in7 && !i.done
              }).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6)
              return upcoming.length === 0 ? (
                <p className="text-label-sm text-on-surface-variant">Sin pendientes</p>
              ) : upcoming.map(item => (
                <div key={item.id} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-label-sm text-on-surface truncate">{item.title}</p>
                    <p className="text-label-sm text-on-surface-variant">{format(parseISO(item.date), 'd MMM', { locale: es })}</p>
                  </div>
                </div>
              ))
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}
