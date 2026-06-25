'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, parseISO
} from 'date-fns'
import { es } from 'date-fns/locale'
import type { Task, Event, Project } from '@/types'

interface ProjectedPayment {
  id: string; title: string; date: string; amount: number
  type: 'card_payment' | 'debt_payment' | 'recurring_expense'
  status: string; color: string
}

interface RawExpense { id: string; notes: string; amount: number; expense_date: string; payment_method?: string; category?: string; expense_category?: string; is_virtual?: boolean }
interface RawIncome  { id: string; income_name: string; amount: number; income_date: string; is_virtual?: boolean; is_recurring?: boolean }

interface CalendarItem {
  id: string
  type: 'task' | 'event' | 'card_payment' | 'debt_payment' | 'recurring_expense'
  title: string; date: string; color: string; done?: boolean; amount?: number
  projectId?: string; projectName?: string; pillarName?: string
}

interface PillarMap { [pillarId: string]: { name: string; color: string; projects: { [pid: string]: string } } }

const TYPE_COLORS = { event: '#0891b2' }
const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n ?? 0)

// ─── Day popup ──────────────────────────────────────────────────────────────
function DayModal({ day, items, expenses, incomes, onClose }: {
  day: Date
  items: CalendarItem[]
  expenses: RawExpense[]
  incomes: RawIncome[]
  onClose: () => void
}) {
  const dayKey = format(day, 'yyyy-MM-dd')
  const dayExpenses = expenses.filter(e => (e.expense_date ?? '').startsWith(dayKey))
  const dayIncomes = incomes.filter(i => (i.income_date ?? '').startsWith(dayKey))

  const taskItems = items.filter(i => i.type === 'task')
  const financeItems = items.filter(i => i.type !== 'task' && i.type !== 'event')
  const eventItems = items.filter(i => i.type === 'event')

  // Group tasks by pillar > project
  const tasksByPillar: Record<string, { pillarName: string; color: string; tasks: CalendarItem[] }> = {}
  for (const t of taskItems) {
    const key = t.pillarName ?? 'Sin pilar'
    if (!tasksByPillar[key]) tasksByPillar[key] = { pillarName: key, color: t.color, tasks: [] }
    tasksByPillar[key].tasks.push(t)
  }

  const totalIncome = dayIncomes.filter(i => !i.is_virtual).reduce((s, i) => s + (i.amount ?? 0), 0)
  const totalExpense = dayExpenses.filter(e => !e.is_virtual).reduce((s, e) => s + (e.amount ?? 0), 0)
  const totalVirtual = [...dayExpenses.filter(e => e.is_virtual), ...dayIncomes.filter(i => i.is_virtual)].reduce((s, x) => s + (x.amount ?? 0), 0)
  const dayBalance = totalIncome - totalExpense

  const isEmpty = taskItems.length === 0 && eventItems.length === 0 && financeItems.length === 0 && dayExpenses.length === 0 && dayIncomes.length === 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-surface rounded-3xl border border-outline-variant zen-shadow w-full max-w-lg max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-surface rounded-t-3xl border-b border-outline-variant px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-label-sm text-on-surface-variant capitalize">{format(day, "EEEE", { locale: es })}</p>
            <p className="font-display font-extrabold text-headline-md text-on-surface" style={{ letterSpacing: '-0.02em' }}>
              {format(day, "d 'de' MMMM", { locale: es })}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {isEmpty && (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-[40px] text-outline-variant block mb-2">sentiment_satisfied</span>
              <p className="text-label-md text-on-surface-variant">Día libre — sin compromisos</p>
            </div>
          )}

          {/* Tareas por pilar/proyecto */}
          {taskItems.length > 0 && (
            <div className="space-y-3">
              <p className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Tareas y pendientes</p>
              {Object.values(tasksByPillar).map(group => (
                <div key={group.pillarName} className="rounded-2xl border border-outline-variant overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2" style={{ backgroundColor: group.color + '12' }}>
                    <span className="material-symbols-outlined text-[14px]" style={{ color: group.color }}>workspaces</span>
                    <p className="text-label-sm font-semibold" style={{ color: group.color }}>{group.pillarName}</p>
                  </div>
                  <div className="divide-y divide-outline-variant">
                    {group.tasks.map(t => (
                      <div key={t.id} className={`flex items-center gap-3 px-3 py-2.5 ${t.done ? 'opacity-50' : ''}`}>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${t.done ? 'border-transparent' : 'border-outline-variant'}`}
                          style={t.done ? { backgroundColor: t.color } : {}}>
                          {t.done && <span className="material-symbols-outlined text-[10px] text-white">check</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-label-md text-on-surface ${t.done ? 'line-through' : ''}`}>{t.title}</p>
                          {t.projectName && <p className="text-label-sm text-on-surface-variant">{t.projectName}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Eventos */}
          {eventItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Eventos</p>
              {eventItems.map(e => (
                <div key={e.id} className="flex items-center gap-2 p-3 rounded-xl bg-cyan-50 border border-cyan-100">
                  <span className="material-symbols-outlined text-[16px] text-cyan-600">event</span>
                  <p className="text-label-md text-on-surface">{e.title}</p>
                </div>
              ))}
            </div>
          )}

          {/* Pagos proyectados */}
          {financeItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Compromisos financieros</p>
              {financeItems.map(p => (
                <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl border ${p.done ? 'opacity-50' : ''}`}
                  style={{ backgroundColor: p.color + '10', borderColor: p.color + '30' }}>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[15px]" style={{ color: p.color }}>
                      {p.type === 'card_payment' ? 'credit_card' : p.type === 'debt_payment' ? 'account_balance' : 'payments'}
                    </span>
                    <div>
                      <p className="text-label-md text-on-surface">{p.title}</p>
                      <p className="text-label-sm" style={{ color: p.color }}>
                        {p.type === 'card_payment' ? 'Pago tarjeta' : p.type === 'debt_payment' ? 'Pago deuda' : 'Pago recurrente'}
                      </p>
                    </div>
                  </div>
                  <p className="text-label-md font-bold" style={{ color: p.color }}>-{fmt(p.amount ?? 0)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Movimientos del día */}
          {(dayIncomes.length > 0 || dayExpenses.length > 0) && (
            <div className="space-y-2">
              <p className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Movimientos del día</p>

              {dayIncomes.map(i => (
                <div key={i.id} className={`flex items-center justify-between p-3 rounded-xl border ${i.is_virtual ? 'bg-amber-50 border-amber-100' : 'bg-green-50 border-green-100'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined text-[15px] ${i.is_virtual ? 'text-amber-500' : 'text-green-600'}`}>
                      {i.is_virtual ? 'swap_horiz' : 'arrow_downward'}
                    </span>
                    <div>
                      <p className="text-label-md text-on-surface">{i.income_name || 'Ingreso'}</p>
                      {i.is_recurring && <p className="text-label-sm text-on-surface-variant">Recurrente</p>}
                    </div>
                  </div>
                  <p className={`text-label-md font-bold ${i.is_virtual ? 'text-amber-600' : 'text-green-600'}`}>
                    {i.is_virtual ? '±' : '+'}{fmt(i.amount)}
                  </p>
                </div>
              ))}

              {dayExpenses.map(e => {
                const virtual = e.is_virtual === true
                const cat = e.category || e.expense_category || e.payment_method
                return (
                  <div key={e.id} className={`flex items-center justify-between p-3 rounded-xl border ${virtual ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100'}`}>
                    <div className="flex items-center gap-2">
                      <span className={`material-symbols-outlined text-[15px] ${virtual ? 'text-amber-500' : 'text-red-500'}`}>
                        {virtual ? 'swap_horiz' : 'arrow_upward'}
                      </span>
                      <div>
                        <p className="text-label-md text-on-surface">{e.notes || 'Gasto'}</p>
                        {cat && <p className="text-label-sm text-on-surface-variant">{cat}</p>}
                      </div>
                    </div>
                    <p className={`text-label-md font-bold ${virtual ? 'text-amber-600' : 'text-red-600'}`}>
                      {virtual ? '±' : '-'}{fmt(e.amount)}
                    </p>
                  </div>
                )
              })}

              {/* Balance del día */}
              {(totalIncome > 0 || totalExpense > 0) && (
                <div className="flex justify-between items-center pt-2 border-t border-outline-variant">
                  <span className="text-label-sm text-on-surface-variant">Balance real del día</span>
                  <span className={`text-label-md font-bold ${dayBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {dayBalance >= 0 ? '+' : ''}{fmt(dayBalance)}
                  </span>
                </div>
              )}
              {totalVirtual > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-label-sm text-on-surface-variant">Virtuales (no impactan liquidez)</span>
                  <span className="text-label-md font-semibold text-amber-600">±{fmt(totalVirtual)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [tasks, setTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [projected, setProjected] = useState<ProjectedPayment[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [pillars, setPillars] = useState<Array<{ id: string; name: string; color: string }>>([])
  const [rawExpenses, setRawExpenses] = useState<RawExpense[]>([])
  const [rawIncomes, setRawIncomes] = useState<RawIncome[]>([])
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/tasks').then(r => r.json()),
      fetch('/api/events').then(r => r.json()),
      fetch('/api/finanzas/projected').then(r => r.json()),
      fetch('/api/projects').then(r => r.json()),
      fetch('/api/pillars').then(r => r.json()),
      fetch('/api/finanzas').then(r => r.json()),
    ]).then(([t, e, proj, p, pil, fin]) => {
      setTasks(Array.isArray(t) ? t : [])
      setEvents(Array.isArray(e) ? e : [])
      setProjected(Array.isArray(proj) ? proj : [])
      setProjects(Array.isArray(p) ? p : [])
      setPillars(Array.isArray(pil) ? pil : [])
      setRawExpenses(Array.isArray(fin?.Expense) ? fin.Expense : [])
      setRawIncomes(Array.isArray(fin?.Income) ? fin.Income : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // Build lookup maps
  const projectMap = useMemo(() =>
    Object.fromEntries(projects.map(p => [p.id, p])),
    [projects]
  )

  const pillarMap = useMemo((): PillarMap => {
    const map: PillarMap = {}
    for (const pil of pillars) {
      const myProjects: { [pid: string]: string } = {}
      for (const proj of projects) {
        if ((proj as Project & { pillar_id?: string }).pillar_id === pil.id) myProjects[proj.id] = proj.name
      }
      map[pil.id] = { name: pil.name, color: pil.color, projects: myProjects }
    }
    return map
  }, [pillars, projects])

  const allItems = useMemo((): CalendarItem[] => {
    const items: CalendarItem[] = []

    for (const t of tasks) {
      if (!t.due_date) continue
      const taskWithProject = t as Task & { project_id?: string }
      const proj = taskWithProject.project_id ? projectMap[taskWithProject.project_id] : null
      const projWithPillar = proj as (Project & { pillar_id?: string }) | null
      const pillar = projWithPillar?.pillar_id ? pillarMap[projWithPillar.pillar_id] : null
      const color = proj?.color ?? '#374151'
      items.push({
        id: t.id, type: 'task', title: t.title, date: t.due_date,
        color, done: t.status === 'completed',
        projectId: taskWithProject.project_id,
        projectName: proj?.name,
        pillarName: pillar?.name ?? (proj ? 'Sin pilar' : 'Sin proyecto'),
      })
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
  }, [tasks, events, projected, projectMap, pillarMap])

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [currentDate])

  const itemsForDay = useCallback((day: Date) => {
    const key = format(day, 'yyyy-MM-dd')
    return allItems.filter(i => i.date === key)
  }, [allItems])

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-display-sm font-extrabold text-on-surface capitalize" style={{ letterSpacing: '-0.03em' }}>
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </h1>
          <p className="text-label-md text-on-surface-variant mt-1">{allItems.length} eventos · click en un día para el desglose</p>
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
      <div className="flex flex-wrap gap-3 items-center">
        {pillars.map(p => (
          <div key={p.id} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-label-sm text-on-surface-variant">{p.name}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TYPE_COLORS.event }} /><span className="text-label-sm text-on-surface-variant">Eventos</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500" /><span className="text-label-sm text-on-surface-variant">Pagos</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-600" /><span className="text-label-sm text-on-surface-variant">Tarjetas</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-violet-600" /><span className="text-label-sm text-on-surface-variant">Deudas</span></div>
      </div>

      <div className="flex gap-6">
        {/* Calendario */}
        <div className="flex-1 bg-surface rounded-3xl border border-outline-variant overflow-hidden zen-shadow">
          <div className="grid grid-cols-7 border-b border-outline-variant">
            {WEEKDAYS.map(d => (
              <div key={d} className="py-3 text-center text-label-sm font-semibold text-on-surface-variant">{d}</div>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-96">
              <span className="material-symbols-outlined text-[32px] text-primary animate-spin">progress_activity</span>
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {calendarDays.map((day, idx) => {
                const dayItems = itemsForDay(day)
                const isCurrentMonth = isSameMonth(day, currentDate)
                const todayDay = isToday(day)
                const visible = dayItems.slice(0, 3)
                const overflow = dayItems.length - visible.length

                return (
                  <button key={idx} onClick={() => setSelectedDay(day)}
                    className={`min-h-[96px] p-2 border-b border-r border-outline-variant text-left transition-colors hover:bg-primary/5 active:bg-primary/10 ${
                      todayDay ? 'bg-secondary-container/30' :
                      isCurrentMonth ? 'bg-surface' : 'bg-surface-container/40'
                    }`}
                  >
                    <div className={`w-7 h-7 flex items-center justify-center rounded-full text-label-md mb-1 font-semibold ${
                      todayDay ? 'bg-primary text-on-primary' : isCurrentMonth ? 'text-on-surface' : 'text-on-surface-variant/40'
                    }`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-0.5">
                      {visible.map(item => (
                        <div key={item.id}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium leading-tight truncate ${item.done ? 'opacity-40' : ''}`}
                          style={{ backgroundColor: item.color + '20', color: item.color }}>
                          {item.type === 'event' && <span className="material-symbols-outlined text-[9px]">event</span>}
                          {(item.type === 'card_payment' || item.type === 'debt_payment' || item.type === 'recurring_expense') && <span className="material-symbols-outlined text-[9px]">payments</span>}
                          <span className="truncate">{item.title}</span>
                        </div>
                      ))}
                      {overflow > 0 && <p className="text-[10px] text-on-surface-variant pl-1">+{overflow} más</p>}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Panel lateral — próximos 7 días */}
        <div className="w-64 flex-shrink-0 space-y-3">
          <div className="bg-surface rounded-2xl border border-outline-variant p-4 zen-shadow space-y-3">
            <p className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wide">Próximos 7 días</p>
            {(() => {
              const today = new Date()
              const in7 = new Date(today); in7.setDate(today.getDate() + 7)
              const upcoming = allItems.filter(i => {
                try { const d = parseISO(i.date); return d >= today && d <= in7 && !i.done }
                catch { return false }
              }).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8)
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

          <div className="bg-surface rounded-2xl border border-outline-variant p-4 text-center">
            <span className="material-symbols-outlined text-[28px] text-outline-variant">touch_app</span>
            <p className="text-label-sm text-on-surface-variant mt-1">Click en un día para ver el desglose completo</p>
          </div>
        </div>
      </div>

      {/* Day modal */}
      {selectedDay && (
        <DayModal
          day={selectedDay}
          items={itemsForDay(selectedDay)}
          expenses={rawExpenses}
          incomes={rawIncomes}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  )
}
