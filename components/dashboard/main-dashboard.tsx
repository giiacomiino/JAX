'use client'

import { useEffect, useState, useMemo } from 'react'
import { format, addDays, isToday, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
interface JaxEvent { id: string; title: string; starts_at: string; google_event_id?: string | null }

// ── Types ────────────────────────────────────────────────────────────────────

interface ProjectedItem {
  id: string; title: string; date: string; amount: number; minimum?: number
  type: 'card_payment' | 'debt_payment' | 'recurring_expense' | 'card_cutoff'
  color: string
}

interface PillarStat {
  id: string; name: string; color: string
  total_tasks: number; completed_tasks: number; pending_tasks: number; completion_rate: number
}
interface GoogleEv {
  id: string; title: string; date: string; color: string
  startDateTime?: string; endDateTime?: string; allDay?: boolean; accountLabel?: string
  location?: string
  attendees?: Array<{ email: string; displayName?: string; responseStatus?: string; self?: boolean }>
}

function formatAttendees(attendees?: Array<{ email: string; displayName?: string; self?: boolean }>): string | undefined {
  const others = (attendees ?? []).filter(a => !a.self)
  if (others.length === 0) return undefined
  const names = others.slice(0, 2).map(a => a.displayName ?? a.email)
  const rest = others.length - names.length
  return rest > 0 ? `${names.join(', ')} +${rest}` : names.join(', ')
}
interface JaxProject { id: string; pillar_id?: string | null; name: string; color?: string }
interface CardInfo {
  id: string; alias: string; balance: number; minimum: number
  dueDate?: number; cutoffDate?: number; limit: number; payNoInterest: number; color: string
}
interface DebtInfo { id: string; name: string; payment: number; payDay?: number; color: string }

// ── Formatters ───────────────────────────────────────────────────────────────

const mxn = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n ?? 0)


function nextDay(dayOfMonth: number): Date {
  const t = new Date()
  const c = new Date(t.getFullYear(), t.getMonth(), dayOfMonth)
  return c >= t ? c : new Date(t.getFullYear(), t.getMonth() + 1, dayOfMonth)
}

// ── SVG Arc helpers ──────────────────────────────────────────────────────────

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arcPath(cx: number, cy: number, r: number, from: number, to: number) {
  const span = to - from
  if (span >= 359.99) {
    const mid = from + 180
    const s = polar(cx, cy, r, from)
    const m = polar(cx, cy, r, mid)
    return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 1 1 ${m.x.toFixed(2)} ${m.y.toFixed(2)} A ${r} ${r} 0 1 1 ${s.x.toFixed(2)} ${s.y.toFixed(2)}`
  }
  const s = polar(cx, cy, r, from)
  const e = polar(cx, cy, r, to)
  const large = span > 180 ? 1 : 0
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`
}

// ── Pillar Ring ───────────────────────────────────────────────────────────────

function PillarRing({ pillars, totalPending }: { pillars: PillarStat[]; totalPending: number }) {
  if (pillars.length === 0) return null
  const cx = 90, cy = 90, r = 66, sw = 17
  const totalW = pillars.reduce((s, p) => s + Math.max(p.total_tasks, 1), 0)
  const GAP = Math.max(4, Math.min(10, 360 / pillars.length * 0.12))
  const available = 360 - GAP * pillars.length

  let angle = -90
  const segs = pillars.map(p => {
    const arcDeg = (Math.max(p.total_tasks, 1) / totalW) * available
    const doneDeg = arcDeg * (p.completion_rate / 100)
    const seg = { p, startAngle: angle, arcDeg, doneDeg }
    angle += arcDeg + GAP
    return seg
  })

  return (
    <svg viewBox="0 0 180 180" className="w-full max-w-[120px] mx-auto block">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={sw} />
      {segs.map((s, i) => (
        <g key={i}>
          <path d={arcPath(cx, cy, r, s.startAngle, s.startAngle + s.arcDeg)}
            fill="none" stroke={s.p.color} strokeWidth={sw} opacity={0.18} strokeLinecap="butt" />
          {s.doneDeg > 0.5 && (
            <path d={arcPath(cx, cy, r, s.startAngle, s.startAngle + s.doneDeg)}
              fill="none" stroke={s.p.color} strokeWidth={sw} strokeLinecap="butt" />
          )}
        </g>
      ))}
      <text x={cx} y={cy - 6} textAnchor="middle"
        style={{ fontSize: '28px', fontWeight: 800, fill: '#0f172a' }}>
        {totalPending}
      </text>
      <text x={cx} y={cy + 13} textAnchor="middle"
        style={{ fontSize: '10px', fill: '#94a3b8' }}>
        pendientes
      </text>
    </svg>
  )
}

// ── Day Modal ─────────────────────────────────────────────────────────────────

type DayItem = {
  id: string; title: string; color: string; time?: string; endTime?: string
  type: 'task' | 'event' | 'gcal' | 'reminder' | 'card_payment' | 'debt_payment' | 'recurring_expense' | 'card_cutoff'
  subtitle?: string
  amount?: number
  location?: string
  attendees?: string
  done?: boolean
}

function DayModal({ day, items, onClose }: { day: Date; items: DayItem[]; onClose: () => void }) {
  const timed = items.filter(i => i.time && (i.type === 'gcal' || i.type === 'event')).sort((a, b) => a.time!.localeCompare(b.time!))
  const tasks = items.filter(i => i.type === 'task')
  const finances = items.filter(i => ['card_cutoff', 'card_payment', 'debt_payment', 'recurring_expense'].includes(i.type))
  const finIcon: Record<string, string> = {
    card_cutoff: 'content_cut', card_payment: 'credit_card',
    debt_payment: 'account_balance', recurring_expense: 'payments',
  }
  const finLabel: Record<string, string> = {
    card_cutoff: 'Corte', card_payment: 'Pago TC',
    debt_payment: 'Deuda', recurring_expense: 'Recurrente',
  }
  const mxn = (n: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n ?? 0)

  const total = timed.length + tasks.length + finances.length

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-3 sm:p-6"
      style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface rounded-2xl border border-outline-variant w-full max-w-sm max-h-[82vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b border-outline-variant">
          <div>
            <h3 className="font-display font-bold text-title-md text-on-surface capitalize">
              {format(day, "EEEE d 'de' MMMM", { locale: es })}
            </h3>
            <p className="text-label-sm text-on-surface-variant mt-0.5">
              {total === 0 ? 'Día libre' : `${total} actividad${total !== 1 ? 'es' : ''}`}
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">close</span>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-5">
          {total === 0 && (
            <div className="py-10 text-center">
              <span className="material-symbols-outlined text-[44px] text-outline-variant block mb-2">event_available</span>
              <p className="text-label-md text-on-surface-variant font-medium">Sin compromisos</p>
            </div>
          )}

          {/* ── Eventos con horario ── */}
          {timed.length > 0 && (
            <div className="space-y-2">
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-on-surface-variant">Agenda</p>
              <div className="relative">
                <div className="absolute left-[42px] top-3 bottom-3 w-px bg-outline-variant" />
                <div className="space-y-2">
                  {timed.map(item => (
                    <div key={item.id} className="flex items-start gap-2.5">
                      {/* Time column */}
                      <div className="w-10 flex-shrink-0 text-right pt-2.5">
                        <span className="text-[10px] font-bold text-on-surface-variant tabular-nums leading-none">{item.time}</span>
                        {item.endTime && (
                          <span className="text-[9px] text-on-surface-variant/50 block tabular-nums leading-none mt-0.5">{item.endTime}</span>
                        )}
                      </div>
                      {/* Dot */}
                      <div className="w-3 h-3 rounded-full flex-shrink-0 mt-2.5 ring-2 ring-surface z-10"
                        style={{ backgroundColor: item.color }} />
                      {/* Card */}
                      <div className="flex-1 min-w-0 rounded-2xl px-3 py-2.5 border"
                        style={{ backgroundColor: item.color + '0d', borderColor: item.color + '30' }}>
                        <p className="text-label-sm font-semibold text-on-surface leading-snug">{item.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {item.subtitle && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                              style={{ backgroundColor: item.color + '20', color: item.color }}>
                              {item.subtitle}
                            </span>
                          )}
                          {item.location && (
                            <span className="text-[9px] text-on-surface-variant flex items-center gap-0.5 truncate">
                              <span className="material-symbols-outlined text-[9px]">location_on</span>
                              {item.location}
                            </span>
                          )}
                        </div>
                        {item.attendees && (
                          <div className="flex items-center gap-0.5 mt-1 text-[9px] text-on-surface-variant truncate">
                            <span className="material-symbols-outlined text-[9px]">group</span>
                            {item.attendees}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Tareas ── */}
          {tasks.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-on-surface-variant">Tareas</p>
              {tasks.map(item => (
                <div key={item.id} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border border-outline-variant bg-surface-container/50 ${item.done ? 'opacity-60' : ''}`}>
                  <div className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center ${item.done ? '' : 'border-2'}`}
                    style={item.done ? { backgroundColor: item.color } : { borderColor: item.color }}>
                    {item.done && <span className="material-symbols-outlined text-white" style={{ fontSize: '10px', fontVariationSettings: "'FILL' 1, 'wght' 700" }}>check</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-label-sm font-medium leading-snug ${item.done ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>{item.title}</p>
                    {item.subtitle && (
                      <p className="text-[9px] font-semibold mt-0.5" style={{ color: item.color }}>{item.subtitle}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Recordatorios ── */}
          {items.filter(i => i.type === 'reminder').length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-on-surface-variant">Recordatorios</p>
              {items.filter(i => i.type === 'reminder').map(item => (
                <div key={item.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border"
                  style={{ backgroundColor: '#8b5cf620', borderColor: '#8b5cf640' }}>
                  <span className="material-symbols-outlined text-[14px] flex-shrink-0" style={{ color: '#8b5cf6' }}>notifications</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-label-sm text-on-surface font-medium leading-snug">{item.title}</p>
                    {item.time && <p className="text-[9px] text-on-surface-variant mt-0.5">{item.time}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Finanzas ── */}
          {finances.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-on-surface-variant">Finanzas</p>
              {finances.map(item => (
                <div key={item.id} className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-2xl border"
                  style={{ backgroundColor: item.color + '0d', borderColor: item.color + '30' }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-[14px] flex-shrink-0" style={{ color: item.color }}>
                      {finIcon[item.type] ?? 'payments'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-label-sm text-on-surface font-medium truncate">{item.title}</p>
                      <p className="text-[9px] font-semibold" style={{ color: item.color }}>{finLabel[item.type]}</p>
                    </div>
                  </div>
                  {item.amount != null && item.amount > 0 && (
                    <p className="text-label-sm font-bold flex-shrink-0" style={{ color: item.color }}>{mxn(item.amount)}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export function MainDashboard({ refreshKey = 0 }: { refreshKey?: number }) {
  // Client-only date to avoid SSR/client hydration mismatch
  const [today, setToday] = useState<Date | null>(null)
  const [tasks, setTasks] = useState<{ id: string; title: string; due_date: string | null; status: string; project_id?: string | null; google_event_id?: string | null }[]>([])
  const [events, setEvents] = useState<JaxEvent[]>([])
  const [googleEvents, setGoogleEvents] = useState<GoogleEv[]>([])
  const [reminders, setReminders] = useState<{ id: string; title: string; reminder_at: string; is_done: boolean; google_event_id?: string | null }[]>([])
  const [pillars, setPillars] = useState<PillarStat[]>([])
  const [projects, setProjects] = useState<JaxProject[]>([])
  const [cards, setCards] = useState<CardInfo[]>([])
  const [finanzasVisible, setFinanzasVisible] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('jax_finanzas_visible') !== 'false'
  })
  const [debts, setDebts] = useState<DebtInfo[]>([])
  const [projected, setProjected] = useState<ProjectedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [completing, setCompleting] = useState<Set<string>>(new Set())

  useEffect(() => {
    setToday(startOfDay(new Date()))
  }, [])

  useEffect(() => {
    const timeMin = new Date().toISOString()
    const timeMax = addDays(new Date(), 8).toISOString()

    Promise.all([
      fetch('/api/tasks').then(r => r.json()).catch(() => []),
      fetch('/api/events').then(r => r.json()).catch(() => []),
      fetch('/api/pillars').then(r => r.json()).catch(() => []),
      fetch('/api/finanzas').then(r => r.ok ? r.json() : {}).catch(() => ({})),
      fetch(`/api/google/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`)
        .then(r => r.json()).catch(() => []),
      fetch('/api/finanzas/projected').then(r => r.json()).catch(() => []),
      fetch('/api/projects').then(r => r.json()).catch(() => []),
      fetch('/api/reminders').then(r => r.json()).catch(() => []),
    ]).then(([t, e, pil, fin, gev, proj, projs, rem]) => {
      const now = new Date()
      const yr = now.getFullYear(), mo = now.getMonth()
      setProjected(Array.isArray(proj) ? proj : [])
      setProjects(Array.isArray(projs) ? projs : [])
      setTasks(Array.isArray(t) ? t : [])
      // Skip JAX events that are already mirrored in GCal (google_event_id set)
      setEvents(Array.isArray(e) ? e.filter((ev: JaxEvent) => {
        if (ev.google_event_id) return false
        const d = new Date(ev.starts_at)
        return d.getFullYear() === yr && d.getMonth() === mo
      }) : [])
      setPillars(Array.isArray(pil) ? pil : [])
      setGoogleEvents(Array.isArray(gev) ? gev : [])
      setReminders(Array.isArray(rem) ? rem : [])

      const finData = fin as Record<string, unknown[]> | null
      const rawCards = ((finData?.CreditCard) ?? []) as Array<{
        id: string; card_alias?: string; bank_name?: string; status?: string
        current_balance?: number; minimum_payment?: number; payment_due_date?: number
        cutoff_date?: number; credit_limit?: number; payment_no_interest?: number
      }>
      setCards(rawCards.filter(c => c.status !== 'closed').map((c, i) => ({
        id: c.id,
        alias: c.card_alias ?? c.bank_name ?? `Tarjeta ${i + 1}`,
        balance: c.current_balance ?? 0,
        minimum: c.minimum_payment ?? 0,
        dueDate: c.payment_due_date,
        cutoffDate: c.cutoff_date,
        limit: c.credit_limit ?? 0,
        payNoInterest: c.payment_no_interest ?? 0,
        color: ['#dc2626', '#9333ea', '#0891b2', '#d97706'][i % 4],
      })).sort((a, b) => b.balance - a.balance))

      const rawDebts = ((finData?.Debt) ?? []) as Array<{
        id: string; debt_name?: string; monthly_payment?: number; payment_day?: number
      }>
      setDebts(rawDebts.filter(d => (d.monthly_payment ?? 0) > 0).map((d, i) => ({
        id: d.id,
        name: d.debt_name ?? `Deuda ${i + 1}`,
        payment: d.monthly_payment ?? 0,
        payDay: d.payment_day,
        color: ['#7c3aed', '#0f766e', '#c2410c', '#1d4ed8'][i % 4],
      })))

      setLoading(false)
    }).catch(() => setLoading(false))
  }, [refreshKey])

  const weekDays = useMemo(() =>
    today ? Array.from({ length: 7 }, (_, i) => addDays(today, i)) : [],
    [today]
  )

  // Build project_id → pillar lookup
  const pillarByProject = useMemo(() => {
    const pillarMap = new Map(pillars.map(p => [p.id, p]))
    const map = new Map<string, { name: string; color: string }>()
    for (const proj of projects) {
      if (proj.pillar_id && pillarMap.has(proj.pillar_id)) {
        const pil = pillarMap.get(proj.pillar_id)!
        map.set(proj.id, { name: pil.name, color: pil.color })
      }
    }
    return map
  }, [pillars, projects])


  function itemsForDay(day: Date): DayItem[] {
    const ds = format(day, 'yyyy-MM-dd')
    const out: DayItem[] = []

    tasks.forEach(t => {
      if (t.due_date?.substring(0, 10) !== ds) return
      if (t.status !== 'pending' && t.status !== 'completed') return
      if (t.google_event_id) return  // already appears via GCal fetch
      const pil = t.project_id ? pillarByProject.get(t.project_id) : null
      out.push({
        id: t.id, title: t.title,
        color: pil?.color ?? '#f59e0b',
        type: 'task',
        subtitle: pil?.name,
        done: t.status === 'completed',
      })
    })

    reminders.forEach(r => {
      if (!r.reminder_at?.startsWith(ds) || r.is_done) return
      if (r.google_event_id) return  // already appears via GCal fetch
      const rawTime = r.reminder_at.includes('T') ? r.reminder_at.substring(11, 16) : undefined
      out.push({ id: r.id, title: r.title, color: '#8b5cf6', type: 'reminder', time: rawTime })
    })

    events.forEach(e => {
      if (!e.starts_at.startsWith(ds)) return
      const rawTime = e.starts_at.includes('T') ? e.starts_at.substring(11, 16) : undefined
      out.push({ id: e.id, title: e.title, color: '#0891b2', type: 'event', time: rawTime })
    })

    googleEvents.forEach(g => {
      if (g.date !== ds) return
      const fmt24 = (iso?: string | null) => iso
        ? new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
        : undefined
      out.push({
        id: g.id, title: g.title, color: g.color, type: 'gcal',
        time: g.allDay ? undefined : fmt24(g.startDateTime),
        endTime: g.allDay ? undefined : fmt24(g.endDateTime),
        subtitle: g.accountLabel,
        location: g.location,
        attendees: formatAttendees(g.attendees),
      })
    })

    projected.forEach(p => {
      if (p.date === ds)
        out.push({ id: p.id, title: p.title, color: p.color, type: p.type, amount: p.amount })
    })

    return out.sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99'))
  }

  const pendingTasks = useMemo(() => {
    if (!today) return []
    // Recurring tasks for future months should not appear as active pending —
    // they activate when their month arrives. Only show tasks due this month or earlier.
    const endOfMonth = format(
      new Date(today.getFullYear(), today.getMonth() + 1, 0),
      'yyyy-MM-dd'
    )
    return tasks
      .filter(t => {
        if (t.status !== 'pending') return false
        if (!t.due_date) return true
        return t.due_date.substring(0, 10) <= endOfMonth
      })
      .sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return a.due_date.localeCompare(b.due_date)
      })
  }, [tasks, today])

  function completeTask(id: string) {
    setCompleting(prev => new Set(prev).add(id))
    setTimeout(() => {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'completed' } : t))
      setCompleting(prev => { const s = new Set(prev); s.delete(id); return s })
    }, 380)
    fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    }).catch(() => {})
  }

  if (loading || !today) {
    return (
      <div className="space-y-5">
        <div className="h-44 bg-surface rounded-3xl border border-outline-variant animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3 h-60 bg-surface rounded-3xl border border-outline-variant animate-pulse" />
          <div className="lg:col-span-2 h-60 bg-surface rounded-3xl border border-outline-variant animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-5">

      {/* ── Próximos 7 días ─────────────────────────────────────────────── */}
      <div className="bg-surface rounded-2xl border border-outline-variant overflow-hidden zen-shadow">
        <div className="flex items-center justify-between px-4 sm:px-5 pt-3 sm:pt-4 pb-3 border-b border-outline-variant">
          <div>
            <h2 className="font-display font-bold text-label-lg sm:text-title-sm text-on-surface">Próximos 7 días</h2>
            <p className="text-[11px] sm:text-label-sm text-on-surface-variant">
              {format(weekDays[0], "d MMM", { locale: es })} – {format(weekDays[6], "d MMM yyyy", { locale: es })}
            </p>
          </div>
          <Link href="/calendar" className="text-label-sm text-primary font-semibold">Calendario →</Link>
        </div>

        <div className="overflow-x-auto scrollbar-none">
          <div className="grid grid-cols-7 min-w-[560px] divide-x divide-outline-variant">
            {weekDays.map((day, i) => {
              const items = itemsForDay(day)
              const isTod = isToday(day)
              const visible = items.slice(0, 3)
              const overflow = items.length - visible.length
              return (
                <button key={i} onClick={() => setSelectedDay(day)}
                  className={`p-3 hover:bg-primary/5 transition-colors min-h-[120px] flex flex-col text-left w-full ${isTod ? 'bg-primary/5' : ''}`}>
                  <p className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${isTod ? 'text-primary' : 'text-on-surface-variant'}`}>
                    {format(day, 'EEE', { locale: es })}
                  </p>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-[15px] mb-2 ${
                    isTod ? 'bg-primary text-white' : 'text-on-surface'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5 flex-1">
                    {visible.map(item => (
                      <div key={item.id} className={`flex items-center gap-1 rounded-md px-1.5 py-[3px] ${item.done ? 'opacity-50' : ''}`}
                        style={{ backgroundColor: item.color + '18' }}>
                        {item.done
                          ? <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: '9px', color: item.color, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                          : item.type === 'reminder'
                            ? <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: '9px', color: item.color }}>notifications</span>
                            : <div className="w-[5px] h-[5px] rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                        }
                        <span className={`text-[10px] leading-snug truncate font-semibold ${item.done ? 'line-through' : ''}`} style={{ color: item.color }}>
                          {item.time && <span className="font-normal opacity-75">{item.time} </span>}{item.title}
                        </span>
                      </div>
                    ))}
                    {overflow > 0 && (
                      <p className="text-[9px] text-on-surface-variant pl-1">+{overflow} más</p>
                    )}
                    {items.length === 0 && (
                      <div className="flex-1 flex items-center justify-center opacity-20 mt-2">
                        <div className="w-6 h-px bg-on-surface-variant" />
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Pilares + Pendientes ─────────────────────────────────────── */}
      <div className="bg-surface rounded-2xl border border-outline-variant overflow-hidden zen-shadow">
        <div className="flex items-center justify-between px-4 sm:px-5 pt-3 sm:pt-4 pb-3 border-b border-outline-variant">
          <div>
            <h2 className="font-display font-bold text-label-lg sm:text-title-sm text-on-surface">Mis pilares</h2>
            <p className="text-[11px] sm:text-label-sm text-on-surface-variant">{pillars.length} áreas de vida</p>
          </div>
          <Link href="/pillars" className="text-label-sm text-primary font-semibold">Ver →</Link>
        </div>

        {pillars.length === 0 ? (
          <div className="py-10 text-center">
            <span className="material-symbols-outlined text-[44px] text-outline-variant block mb-2">workspaces</span>
            <p className="text-label-md text-on-surface-variant">Sin pilares</p>
            <Link href="/pillars" className="text-label-sm text-primary mt-1 inline-block">Crear pilar →</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-outline-variant">

            {/* Left — Ring + Pilar list */}
            <div className="p-4">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-24 flex-shrink-0">
                  <PillarRing pillars={pillars} totalPending={pendingTasks.length} />
                </div>
                <div className="flex-1 min-w-0 space-y-2.5">
                  {pillars.map(p => (
                    <div key={p.id} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                      <p className="text-label-sm text-on-surface flex-1 min-w-0 truncate">{p.name}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold tabular-nums w-4 text-right" style={{ color: p.color }}>
                          {p.pending_tasks || ''}
                        </span>
                        <div className="w-14 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                          <div className="h-full rounded-full transition-all"
                            style={{ width: `${p.completion_rate}%`, backgroundColor: p.color }} />
                        </div>
                        <span className="text-[10px] font-bold text-on-surface-variant w-6 text-right tabular-nums">
                          {p.completion_rate}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right — Pending tasks */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[9px] font-extrabold uppercase tracking-widest text-on-surface-variant">Pendientes</p>
                <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums">
                  {pendingTasks.length}
                </span>
              </div>

              {pendingTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-5 gap-1">
                  <span className="material-symbols-outlined text-[32px] text-primary">task_alt</span>
                  <p className="text-label-sm text-on-surface-variant">¡Sin pendientes!</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-44 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                  {pendingTasks.map(t => {
                    const pil = t.project_id ? pillarByProject.get(t.project_id) : null
                    const todayStr = format(today, 'yyyy-MM-dd')
                    const isOverdue = !!t.due_date && t.due_date.substring(0, 10) < todayStr
                    const isDueToday = t.due_date?.substring(0, 10) === todayStr
                    const isDone = completing.has(t.id)
                    const pilColor = pil?.color ?? '#94a3b8'
                    return (
                      <div key={t.id}
                        className="flex items-start gap-2 transition-all duration-300"
                        style={{ opacity: isDone ? 0.35 : 1 }}>
                        <button
                          onClick={() => completeTask(t.id)}
                          className="flex-shrink-0 mt-0.5 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
                          style={{
                            borderColor: pilColor,
                            backgroundColor: isDone ? pilColor : 'transparent',
                          }}
                        >
                          {isDone && (
                            <span className="material-symbols-outlined text-white"
                              style={{ fontSize: '11px', fontVariationSettings: "'FILL' 1, 'wght' 700" }}>
                              check
                            </span>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-label-sm text-on-surface leading-snug transition-all ${isDone ? 'line-through text-on-surface-variant' : ''}`}>
                            {t.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {pil && (
                              <span className="text-[9px] font-semibold" style={{ color: pil.color }}>{pil.name}</span>
                            )}
                            {t.due_date && (
                              <>
                                {pil && <span className="text-[8px] text-outline-variant">·</span>}
                                <span className={`text-[9px] font-semibold ${isOverdue ? 'text-red-500' : isDueToday ? 'text-amber-500' : 'text-on-surface-variant'}`}>
                                  {isOverdue && '⚠ '}
                                  {format(new Date(t.due_date.substring(0, 10) + 'T12:00:00'), 'd MMM', { locale: es })}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* ── Finanzas ────────────────────────────────────────────────────── */}
      <div className="bg-surface rounded-2xl border border-outline-variant overflow-hidden zen-shadow">
        <div className="flex items-center justify-between px-4 sm:px-5 pt-3 sm:pt-4 pb-3 border-b border-outline-variant">
          <button
            onClick={() => {
              const next = !finanzasVisible
              setFinanzasVisible(next)
              localStorage.setItem('jax_finanzas_visible', String(next))
            }}
            className="flex items-center gap-2 text-left group"
          >
            <div>
              <h2 className="font-display font-bold text-label-lg sm:text-title-sm text-on-surface">Finanzas</h2>
              <p className="text-[11px] sm:text-label-sm text-on-surface-variant capitalize">
                {format(new Date(), 'MMMM yyyy', { locale: es })}
              </p>
            </div>
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant transition-transform duration-200"
              style={{ transform: finanzasVisible ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
              expand_more
            </span>
          </button>
          <Link href="/finanzas" className="text-label-sm text-primary font-semibold">Ver →</Link>
        </div>

        {/* Cards + debts — scrollable row */}
        {finanzasVisible && (cards.length > 0 || debts.length > 0) && (
          <div className="overflow-x-auto scrollbar-none">
            <div className="flex gap-3 p-4" style={{ width: 'max-content' }}>
              {cards.map(card => {
                const cut = card.cutoffDate ? nextDay(card.cutoffDate) : null
                const due = card.dueDate ? nextDay(card.dueDate) : null
                const cutDays = cut ? Math.ceil((cut.getTime() - Date.now()) / 86400000) : null
                const dueDays = due ? Math.ceil((due.getTime() - Date.now()) / 86400000) : null
                const utilPct = card.limit > 0 ? Math.min((card.balance / card.limit) * 100, 100) : 0
                const utilColor = utilPct > 85 ? '#ef4444' : utilPct > 65 ? '#f59e0b' : card.color
                return (
                  <div key={card.id}
                    className="rounded-2xl p-3 sm:p-4 w-52 sm:w-56 flex-shrink-0 border"
                    style={{ backgroundColor: card.color + '07', borderColor: card.color + '30' }}>
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: card.color + '20' }}>
                        <span className="material-symbols-outlined text-[13px]" style={{ color: card.color }}>credit_card</span>
                      </div>
                      <p className="text-label-sm font-bold text-on-surface truncate">{card.alias}</p>
                    </div>

                    {/* Balance + utilization */}
                    <p className="text-title-sm font-extrabold mb-1.5" style={{ color: card.color }}>{mxn(card.balance)}</p>
                    {card.limit > 0 && (
                      <div className="mb-2.5">
                        <div className="flex justify-between text-[9px] mb-1">
                          <span style={{ color: utilColor }} className="font-semibold">{Math.round(utilPct)}% usado</span>
                          <span className="text-on-surface-variant">límite {mxn(card.limit)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                          <div className="h-full rounded-full transition-all"
                            style={{ width: `${utilPct}%`, backgroundColor: utilColor }} />
                        </div>
                      </div>
                    )}

                    {/* Dates + payment info */}
                    <div className="space-y-1 border-t border-outline-variant pt-2 mt-1">
                      {card.payNoInterest > 0 && card.payNoInterest !== card.balance && (
                        <div className="flex justify-between text-[10px]">
                          <span className="text-on-surface-variant">Sin intereses</span>
                          <span className="font-bold text-on-surface">{mxn(card.payNoInterest)}</span>
                        </div>
                      )}
                      {cut && (
                        <div className="flex justify-between text-[10px]">
                          <span className={cutDays !== null && cutDays <= 5 ? 'text-amber-600 font-semibold' : 'text-on-surface-variant'}>
                            ✂ Corte {format(cut, 'd MMM', { locale: es })}
                          </span>
                          {cutDays !== null && cutDays <= 10 && (
                            <span className="text-amber-600 font-semibold">{cutDays}d</span>
                          )}
                        </div>
                      )}
                      {due && (
                        <div className="flex justify-between text-[10px]">
                          <span className={dueDays !== null && dueDays <= 5 ? 'text-red-600 font-semibold' : 'text-on-surface-variant'}>
                            💳 Pago {format(due, 'd MMM', { locale: es })}
                          </span>
                          {dueDays !== null && dueDays <= 10 && (
                            <span className={dueDays <= 5 ? 'text-red-600 font-semibold' : 'text-on-surface-variant'}>{dueDays}d</span>
                          )}
                        </div>
                      )}
                      {card.minimum > 0 && (
                        <div className="flex justify-between text-[10px]">
                          <span className="text-on-surface-variant">Mínimo</span>
                          <span className="text-amber-600 font-semibold">{mxn(card.minimum)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              {debts.length > 0 && (
                <div className="rounded-2xl p-3 sm:p-4 w-48 sm:w-52 flex-shrink-0 border border-outline-variant bg-surface-container/60">
                  <p className="text-[9px] font-extrabold uppercase tracking-widest text-on-surface-variant mb-2.5">Deudas mensuales</p>
                  <div className="space-y-2">
                    {debts.map(d => {
                      const next = d.payDay ? nextDay(d.payDay) : null
                      return (
                        <div key={d.id} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                            <p className="text-label-sm text-on-surface truncate">{d.name}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-label-sm font-bold" style={{ color: d.color }}>{mxn(d.payment)}</p>
                            {next && <p className="text-[9px] text-on-surface-variant">{format(next, 'd MMM', { locale: es })}</p>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty state when no finance data at all */}
        {finanzasVisible && cards.length === 0 && debts.length === 0 && (
          <div className="py-6 text-center">
            <span className="material-symbols-outlined text-[36px] text-outline-variant block mb-1">payments</span>
            <p className="text-label-sm text-on-surface-variant">Sin movimientos este mes</p>
            <Link href="/finanzas" className="text-label-sm text-primary mt-1 inline-block">Ir a Finanzas →</Link>
          </div>
        )}
      </div>

      {/* ── Day Detail Modal ────────────────────────────────────────────── */}
      {selectedDay && (
        <DayModal
          day={selectedDay}
          items={itemsForDay(selectedDay)}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  )
}
