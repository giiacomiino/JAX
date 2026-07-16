'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, parseISO
} from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import type { Task, Event, Project } from '@/types'

interface ProjectedPayment {
  id: string; title: string; date: string; amount: number; minimum?: number
  type: 'card_payment' | 'debt_payment' | 'recurring_expense' | 'card_cutoff'
  status: string; color: string
}
interface GoogleEvent {
  id: string; title: string; date: string; color: string
  accountLabel: string; accountEmail: string
  description?: string; location?: string; meetLink?: string
  startDateTime?: string; endDateTime?: string; allDay?: boolean
  attendees?: Array<{ email: string; displayName?: string; responseStatus?: string; self?: boolean }>
  // GCal mirror fields — needed for CRUD
  gcalId?: string
  gcalAccountId?: string
  gcalCalendarId?: string
}
interface RawExpense { id: string; notes: string; amount: number; expense_date: string; payment_method?: string; category?: string; expense_category?: string; is_virtual?: boolean }
interface RawIncome  { id: string; income_name: string; amount: number; income_date: string; is_virtual?: boolean; is_recurring?: boolean }

interface CalendarItem {
  id: string
  type: 'task' | 'event' | 'google_event' | 'reminder' | 'card_payment' | 'debt_payment' | 'recurring_expense' | 'card_cutoff'
  title: string; date: string; color: string; done?: boolean; amount?: number; minimum?: number
  projectId?: string; projectName?: string; pillarName?: string
  accountLabel?: string; description?: string; location?: string; meetLink?: string
  startDateTime?: string; endDateTime?: string; allDay?: boolean
  attendees?: Array<{ email: string; displayName?: string; responseStatus?: string; self?: boolean }>
  // JAX-only fields for editing
  startsAt?: string; endsAt?: string | null
  // GCal mirror fields
  gcalId?: string
  gcalAccountId?: string
  gcalCalendarId?: string
}

interface PillarMap { [pillarId: string]: { name: string; color: string; projects: { [pid: string]: string } } }

const LOCAL_EVENT_COLOR = '#0891b2'
const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n ?? 0)

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtTime(iso?: string) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true })
  } catch { return '' }
}

function formatAttendees(attendees?: Array<{ email: string; displayName?: string; self?: boolean }>): string | undefined {
  const others = (attendees ?? []).filter(a => !a.self)
  if (others.length === 0) return undefined
  const names = others.slice(0, 2).map(a => a.displayName ?? a.email)
  const rest = others.length - names.length
  return rest > 0 ? `${names.join(', ')} +${rest}` : names.join(', ')
}

const RSVP: Record<string, { label: string; color: string }> = {
  accepted: { label: 'Confirmado', color: '#059669' },
  declined: { label: 'Rechazado', color: '#dc2626' },
  tentative: { label: 'Tentativo', color: '#d97706' },
  needsAction: { label: 'Sin respuesta', color: '#9ca3af' },
}

// ─── Event Detail Modal ───────────────────────────────────────────────────────
function EventDetailModal({ item, onClose }: { item: CalendarItem; onClose: () => void }) {
  const startStr = fmtTime(item.startDateTime)
  const endStr = fmtTime(item.endDateTime)
  const timeLabel = item.allDay ? 'Todo el día' : startStr ? `${startStr}${endStr ? ` – ${endStr}` : ''}` : ''

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-surface rounded-3xl border border-outline-variant zen-shadow w-full max-w-md max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        {/* Header strip */}
        <div className="h-2 rounded-t-3xl" style={{ backgroundColor: item.color }} />
        <div className="px-6 pt-4 pb-3 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-label-sm text-on-surface-variant mb-0.5">{item.accountLabel ?? 'Evento JAX'}</p>
            <h2 className="font-display font-extrabold text-title-lg text-on-surface leading-tight">{item.title}</h2>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container flex-shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Time */}
          {timeLabel && (
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant mt-0.5">schedule</span>
              <div>
                <p className="text-label-md text-on-surface">{timeLabel}</p>
                <p className="text-label-sm text-on-surface-variant">{format(parseISO(item.date), "EEEE d 'de' MMMM yyyy", { locale: es })}</p>
              </div>
            </div>
          )}

          {/* Location */}
          {item.location && (
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant mt-0.5">location_on</span>
              <p className="text-label-md text-on-surface">{item.location}</p>
            </div>
          )}

          {/* Meet / Video link */}
          {item.meetLink && (
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-[18px] text-primary mt-0.5">videocam</span>
              <a href={item.meetLink} target="_blank" rel="noopener noreferrer"
                className="text-label-md text-primary underline underline-offset-2">
                Unirse a Google Meet
              </a>
            </div>
          )}

          {/* Description */}
          {item.description && (
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant mt-0.5">notes</span>
              <p className="text-label-md text-on-surface whitespace-pre-line">{item.description}</p>
            </div>
          )}

          {/* Attendees */}
          {item.attendees && item.attendees.length > 0 && (
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant mt-0.5">group</span>
              <div className="flex-1 space-y-1.5">
                <p className="text-label-sm font-semibold text-on-surface-variant">{item.attendees.length} participante{item.attendees.length !== 1 ? 's' : ''}</p>
                {item.attendees.map((a, i) => {
                  const rsvp = RSVP[a.responseStatus ?? 'needsAction']
                  return (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: item.color }}>
                          {(a.displayName ?? a.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          {a.displayName && <p className="text-label-sm text-on-surface truncate">{a.displayName}{a.self ? ' (tú)' : ''}</p>}
                          <p className="text-label-sm text-on-surface-variant truncate">{a.email}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-medium flex-shrink-0" style={{ color: rsvp.color }}>{rsvp.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Event Edit Modal ─────────────────────────────────────────────────────────
function EventEditModal({ item, onClose, onSave, onDelete }: {
  item: CalendarItem
  onClose: () => void
  onSave: (updated: CalendarItem) => void
  onDelete: () => void
}) {
  const [title, setTitle] = useState(item.title)
  const [date, setDate] = useState(item.startsAt ? item.startsAt.split('T')[0] : item.date)
  const [time, setTime] = useState(() => {
    const src = item.startsAt ?? item.startDateTime
    if (!src) return ''
    try {
      const d = new Date(src)
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    } catch { return '' }
  })
  const [description, setDescription] = useState(item.description ?? '')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleSave() {
    if (!title.trim()) { setErr('El título es requerido'); return }
    if (!date) { setErr('La fecha es requerida'); return }
    setSaving(true); setErr(null)
    try {
      let updatedItem: CalendarItem
      if (item.gcalId && item.gcalAccountId) {
        // GCal mirror event — update directly in Google Calendar
        const res = await fetch(`/api/google/events/${item.gcalAccountId}/${item.gcalId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ calendarId: item.gcalCalendarId, title: title.trim(), date, time: time || undefined, description: description || null }),
        })
        if (!res.ok) throw new Error()
        updatedItem = { ...item, title: title.trim(), date, description: description || undefined }
      } else {
        // JAX-native event — update in Supabase
        const starts_at = time ? `${date}T${time}:00` : `${date}T12:00:00`
        const res = await fetch(`/api/events/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title.trim(), starts_at, description: description || null }),
        })
        if (!res.ok) throw new Error()
        const updated = await res.json()
        updatedItem = { ...item, title: updated.title, startsAt: updated.starts_at, date: updated.starts_at.split('T')[0], description: updated.description }
      }
      onSave(updatedItem)
    } catch {
      setErr('Error al guardar. Intenta de nuevo.')
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    try {
      if (item.gcalId && item.gcalAccountId) {
        const calId = item.gcalCalendarId ? `?calendarId=${encodeURIComponent(item.gcalCalendarId)}` : ''
        await fetch(`/api/google/events/${item.gcalAccountId}/${item.gcalId}${calId}`, { method: 'DELETE' })
      } else {
        await fetch(`/api/events/${item.id}`, { method: 'DELETE' })
      }
      onDelete()
    } catch {
      setErr('Error al eliminar')
    } finally { setDeleting(false) }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-surface rounded-3xl border border-outline-variant zen-shadow w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-5 pb-4 border-b border-outline-variant flex items-center justify-between">
          <h2 className="font-display font-extrabold text-title-lg text-on-surface">Editar evento</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="p-6 space-y-4">
          {err && <p className="text-label-sm text-red-600 bg-red-50 p-3 rounded-xl">{err}</p>}
          <div className="space-y-1.5">
            <label className="text-label-sm font-semibold text-on-surface-variant">Título</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-outline-variant bg-surface-container text-body-md focus:outline-none focus:border-primary" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-label-sm font-semibold text-on-surface-variant">Fecha</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-3 rounded-2xl border border-outline-variant bg-surface-container text-body-md focus:outline-none focus:border-primary" />
            </div>
            <div className="space-y-1.5">
              <label className="text-label-sm font-semibold text-on-surface-variant">Hora</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                className="w-full px-3 py-3 rounded-2xl border border-outline-variant bg-surface-container text-body-md focus:outline-none focus:border-primary" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-label-sm font-semibold text-on-surface-variant">Descripción</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              className="w-full px-4 py-3 rounded-2xl border border-outline-variant bg-surface-container text-body-md focus:outline-none focus:border-primary resize-none" />
          </div>
        </div>
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          <button onClick={handleDelete} disabled={deleting}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-label-md font-semibold transition-colors ${
              confirmDelete ? 'bg-red-600 text-white' : 'text-red-600 border border-red-200 hover:bg-red-50'
            } disabled:opacity-50`}>
            <span className={`material-symbols-outlined text-[16px] ${deleting ? 'animate-spin' : ''}`}>
              {deleting ? 'progress_activity' : 'delete'}
            </span>
            {confirmDelete ? 'Confirmar borrar' : 'Eliminar'}
          </button>
          <div className="flex gap-2">
            {confirmDelete && (
              <button onClick={() => setConfirmDelete(false)}
                className="px-4 py-2.5 rounded-xl text-label-md text-on-surface-variant border border-outline-variant">
                Cancelar
              </button>
            )}
            {!confirmDelete && (
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-on-primary text-label-md font-semibold disabled:opacity-50">
                <span className={`material-symbols-outlined text-[16px] ${saving ? 'animate-spin' : ''}`}>
                  {saving ? 'progress_activity' : 'check'}
                </span>
                Guardar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Day modal ───────────────────────────────────────────────────────────────
function DayModal({ day, items, expenses, incomes, onClose, onEventSaved, onEventDeleted }: {
  day: Date; items: CalendarItem[]
  expenses: RawExpense[]; incomes: RawIncome[]; onClose: () => void
  onEventSaved?: (updated: CalendarItem) => void
  onEventDeleted?: (id: string, gcalId?: string) => void
}) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarItem | null>(null)
  const [editingEvent, setEditingEvent] = useState<CalendarItem | null>(null)
  const dayKey = format(day, 'yyyy-MM-dd')
  const dayExpenses = expenses.filter(e => (e.expense_date ?? '').startsWith(dayKey))
  const dayIncomes = incomes.filter(i => (i.income_date ?? '').startsWith(dayKey))

  const taskItems = items.filter(i => i.type === 'task')
  const eventItems = items.filter(i => i.type === 'event' || i.type === 'google_event')
  const reminderItems = items.filter(i => i.type === 'reminder')
  const cutoffItems = items.filter(i => i.type === 'card_cutoff')
  const financeItems = items.filter(i => !['task', 'event', 'google_event', 'reminder', 'card_cutoff'].includes(i.type))

  // Group tasks by pillar
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
  const isEmpty = !taskItems.length && !eventItems.length && !reminderItems.length && !financeItems.length && !dayExpenses.length && !dayIncomes.length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative bg-surface rounded-3xl border border-outline-variant zen-shadow w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-surface rounded-t-3xl border-b border-outline-variant px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-label-sm text-on-surface-variant capitalize">{format(day, 'EEEE', { locale: es })}</p>
            <p className="font-display font-extrabold text-headline-md text-on-surface" style={{ letterSpacing: '-0.02em' }}>
              {format(day, "d 'de' MMMM", { locale: es })}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container">
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

          {/* Tareas por pilar */}
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

          {/* Eventos (locales + Google) */}
          {eventItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Eventos</p>
              {eventItems.map(e => {
                const startStr = fmtTime(e.startDateTime)
                const endStr = fmtTime(e.endDateTime)
                const timeLabel = e.allDay ? null : startStr ? `${startStr}${endStr ? ` – ${endStr}` : ''}` : null
                const hasDetails = !!(e.location || e.meetLink || (e.attendees?.length) || e.description)
                return (
                  <div key={e.id} className="rounded-xl border overflow-hidden" style={{ borderColor: e.color + '40' }}>
                    <div className="flex items-start gap-3 p-3" style={{ backgroundColor: e.color + '10' }}>
                      <span className="material-symbols-outlined text-[16px] mt-0.5 flex-shrink-0" style={{ color: e.color }}>
                        {e.type === 'google_event' ? 'event_available' : 'event'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-label-md font-semibold text-on-surface">{e.title}</p>
                        {e.accountLabel && (
                          <p className="text-[11px] text-on-surface-variant mt-0.5">{e.accountLabel}</p>
                        )}
                        {timeLabel && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="material-symbols-outlined text-[12px]" style={{ color: e.color }}>schedule</span>
                            <p className="text-[11px] font-medium" style={{ color: e.color }}>{timeLabel}</p>
                          </div>
                        )}
                        {e.location && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="material-symbols-outlined text-[12px] text-on-surface-variant">location_on</span>
                            <p className="text-[11px] text-on-surface-variant truncate">{e.location}</p>
                          </div>
                        )}
                        {e.meetLink && (
                          <a href={e.meetLink} target="_blank" rel="noopener noreferrer"
                            onClick={ev => ev.stopPropagation()}
                            className="flex items-center gap-1 mt-0.5 w-fit">
                            <span className="material-symbols-outlined text-[12px] text-primary">videocam</span>
                            <p className="text-[11px] text-primary">Google Meet</p>
                          </a>
                        )}
                        {e.description && (
                          <p className="text-[11px] text-on-surface-variant mt-1 line-clamp-2">{e.description}</p>
                        )}
                        {formatAttendees(e.attendees) && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="material-symbols-outlined text-[12px] text-on-surface-variant">group</span>
                            <p className="text-[11px] text-on-surface-variant truncate">
                              {formatAttendees(e.attendees)}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {(e.type === 'event' || (e.type === 'google_event' && e.gcalId)) && (
                          <button onClick={ev => { ev.stopPropagation(); setEditingEvent(e) }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/10 transition-colors"
                            title="Editar">
                            <span className="material-symbols-outlined text-[15px]" style={{ color: e.color }}>edit</span>
                          </button>
                        )}
                        {hasDetails && (
                          <button onClick={ev => { ev.stopPropagation(); setSelectedEvent(e) }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/10 transition-colors"
                            title="Ver detalles">
                            <span className="material-symbols-outlined text-[15px]" style={{ color: e.color }}>open_in_full</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Recordatorios */}
          {reminderItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Recordatorios</p>
              {reminderItems.map(r => {
                const timeLabel = r.startDateTime ? fmtTime(r.startDateTime) : null
                return (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border"
                    style={{ backgroundColor: '#8b5cf615', borderColor: '#8b5cf630' }}>
                    <span className="material-symbols-outlined text-[16px] flex-shrink-0" style={{ color: '#8b5cf6', fontVariationSettings: "'FILL' 1" }}>notifications</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-label-md font-semibold text-on-surface">{r.title}</p>
                      {timeLabel && (
                        <p className="text-[11px] mt-0.5" style={{ color: '#8b5cf6' }}>{timeLabel}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Cortes de tarjeta */}
          {cutoffItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Corte de tarjeta</p>
              {cutoffItems.map(p => (
                <div key={p.id} className="p-3 rounded-xl border border-amber-200 bg-amber-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[15px] text-amber-600">content_cut</span>
                      <div>
                        <p className="text-label-md text-on-surface font-semibold">{p.title}</p>
                        <p className="text-label-sm text-amber-700">Saldo al corte</p>
                      </div>
                    </div>
                    <p className="text-label-md font-bold text-amber-700">{fmt(p.amount ?? 0)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Compromisos financieros */}
          {financeItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Compromisos financieros</p>
              {financeItems.map(p => (
                <div key={p.id} className={`p-3 rounded-xl border ${p.done ? 'opacity-50' : ''}`}
                  style={{ backgroundColor: p.color + '10', borderColor: p.color + '30' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[15px]" style={{ color: p.color }}>
                        {p.type === 'card_payment' ? 'credit_card' : p.type === 'debt_payment' ? 'account_balance' : 'payments'}
                      </span>
                      <div>
                        <p className="text-label-md text-on-surface">{p.title}</p>
                        <p className="text-label-sm" style={{ color: p.color }}>
                          {p.type === 'card_payment' ? 'Pago tarjeta' : p.type === 'debt_payment' ? 'Pago deuda' : 'Recurrente'}
                        </p>
                      </div>
                    </div>
                    <p className="text-label-md font-bold" style={{ color: p.color }}>{fmt(p.amount ?? 0)}</p>
                  </div>
                  {p.type === 'card_payment' && p.minimum != null && p.minimum > 0 && (
                    <p className="text-label-sm text-amber-600 text-right mt-1">mín {fmt(p.minimum)}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Movimientos del día (FinWise) */}
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
              {(totalIncome > 0 || totalExpense > 0) && (
                <div className="flex justify-between items-center pt-2 border-t border-outline-variant">
                  <span className="text-label-sm text-on-surface-variant">Balance real</span>
                  <span className={`text-label-md font-bold ${dayBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {dayBalance >= 0 ? '+' : ''}{fmt(dayBalance)}
                  </span>
                </div>
              )}
              {totalVirtual > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-label-sm text-on-surface-variant">Virtuales</span>
                  <span className="text-label-md font-semibold text-amber-600">±{fmt(totalVirtual)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {selectedEvent && <EventDetailModal item={selectedEvent} onClose={() => setSelectedEvent(null)} />}
      {editingEvent && (
        <EventEditModal
          item={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSave={(updated) => {
            setEditingEvent(null)
            onEventSaved?.(updated)
          }}
          onDelete={() => {
            setEditingEvent(null)
            onEventDeleted?.(editingEvent.id, editingEvent.gcalId)
          }}
        />
      )}
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
  const [googleEvents, setGoogleEvents] = useState<GoogleEvent[]>([])
  const [googleAccounts, setGoogleAccounts] = useState<Array<{ id: string; label: string; color: string; email: string }>>([])
  const [reminders, setReminders] = useState<Array<{ id: string; title: string; reminder_at: string; is_done: boolean; google_event_id?: string | null }>>([])
  const [rawExpenses, setRawExpenses] = useState<RawExpense[]>([])
  const [rawIncomes, setRawIncomes] = useState<RawIncome[]>([])
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)

  function handleEventSaved(updated: CalendarItem) {
    if (updated.gcalId) {
      // GCal mirror event — update in local googleEvents state
      setGoogleEvents(prev => prev.map(e =>
        e.gcalId === updated.gcalId
          ? { ...e, title: updated.title, date: updated.date, description: updated.description }
          : e
      ))
    } else {
      // JAX-native event
      setEvents(prev => prev.map(e =>
        e.id === updated.id
          ? { ...e, title: updated.title, starts_at: updated.startsAt ?? e.starts_at, ends_at: updated.endsAt ?? e.ends_at, description: updated.description ?? null }
          : e
      ))
    }
  }

  function handleEventDeleted(id: string, gcalId?: string) {
    if (gcalId) {
      setGoogleEvents(prev => prev.filter(e => e.gcalId !== gcalId))
    } else {
      setEvents(prev => prev.filter(e => e.id !== id))
    }
    setSelectedDay(null)
  }

  // Static data — load once
  useEffect(() => {
    Promise.all([
      fetch('/api/tasks').then(r => r.json()).catch(() => []),
      fetch('/api/events').then(r => r.json()).catch(() => []),
      fetch('/api/finanzas/projected').then(r => r.json()).catch(() => []),
      fetch('/api/projects').then(r => r.json()).catch(() => []),
      fetch('/api/pillars').then(r => r.json()).catch(() => []),
      fetch('/api/finanzas').then(r => r.json()).catch(() => ({})),
      fetch('/api/google/accounts').then(r => r.json()).catch(() => []),
      fetch('/api/reminders').then(r => r.json()).catch(() => []),
    ]).then(([t, e, proj, p, pil, fin, gAccounts, rem]) => {
      setTasks(Array.isArray(t) ? t : [])
      setEvents(Array.isArray(e) ? e : [])
      setProjected(Array.isArray(proj) ? proj : [])
      setProjects(Array.isArray(p) ? p : [])
      setPillars(Array.isArray(pil) ? pil : [])
      setRawExpenses(Array.isArray(fin?.Expense) ? fin.Expense : [])
      setRawIncomes(Array.isArray(fin?.Income) ? fin.Income : [])
      setGoogleAccounts(Array.isArray(gAccounts) ? gAccounts : [])
      setReminders(Array.isArray(rem) ? rem : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // Google events — re-fetch when month changes
  useEffect(() => {
    const timeMin = startOfMonth(currentDate).toISOString()
    const timeMax = endOfMonth(currentDate).toISOString()
    fetch(`/api/google/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`)
      .then(r => r.json())
      .then(data => setGoogleEvents(Array.isArray(data) ? data : []))
      .catch(() => setGoogleEvents([]))
  }, [currentDate])

  const projectMap = useMemo(() => Object.fromEntries(projects.map(p => [p.id, p])), [projects])

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
      if (t.google_event_id) continue  // already appears via GCal fetch
      const tw = t as Task & { project_id?: string }
      const proj = tw.project_id ? projectMap[tw.project_id] : null
      const pw = proj as (Project & { pillar_id?: string }) | null
      const pillar = pw?.pillar_id ? pillarMap[pw.pillar_id] : null
      items.push({
        id: t.id, type: 'task', title: t.title, date: t.due_date,
        color: proj?.color ?? '#374151', done: t.status === 'completed',
        projectId: tw.project_id, projectName: proj?.name,
        pillarName: pillar?.name ?? (proj ? 'Sin pilar' : 'Sin proyecto'),
      })
    }

    // GCal is the source of truth — show all GCal events directly, fully editable
    for (const g of googleEvents) {
      items.push({
        id: g.id, type: 'google_event',
        gcalId: g.gcalId, gcalAccountId: g.gcalAccountId, gcalCalendarId: g.gcalCalendarId,
        title: g.title, date: g.date,
        color: g.color, accountLabel: g.accountLabel,
        description: g.description, location: g.location, meetLink: g.meetLink,
        startDateTime: g.startDateTime, endDateTime: g.endDateTime, allDay: g.allDay,
        attendees: g.attendees,
      })
    }

    // Only show JAX-native events that are NOT synced to GCal (no google_event_id)
    for (const e of events) {
      if (e.google_event_id) continue  // already appears via GCal fetch
      items.push({
        id: e.id, type: 'event', title: e.title, date: e.starts_at.split('T')[0],
        color: LOCAL_EVENT_COLOR, description: e.description ?? undefined,
        startsAt: e.starts_at, endsAt: e.ends_at,
      })
    }

    for (const p of projected) {
      items.push({
        id: p.id, type: p.type, title: p.title, date: p.date,
        color: p.color, done: p.status === 'paid', amount: p.amount, minimum: p.minimum,
      })
    }

    for (const r of reminders) {
      if (!r.reminder_at || r.is_done) continue
      if (r.google_event_id) continue  // already appears via GCal fetch
      const date = r.reminder_at.split('T')[0]
      if (!date) continue
      items.push({
        id: `rem-${r.id}`, type: 'reminder', title: r.title, date,
        color: '#8b5cf6',
        startDateTime: r.reminder_at,
        description: undefined,
      })
    }

    return items
  }, [tasks, events, googleEvents, projected, projectMap, pillarMap, reminders])

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
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-xl sm:text-display-sm font-extrabold text-on-surface capitalize truncate" style={{ letterSpacing: '-0.03em' }}>
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </h1>
          <p className="text-label-sm sm:text-label-md text-on-surface-variant mt-0.5 hidden sm:block">
            {allItems.length} elementos
            {googleAccounts.length > 0 && ` · ${googleEvents.length} eventos Google`}
            {' · '}toca un día para desglose
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {googleAccounts.length === 0 && (
            <Link href="/settings" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-outline-variant text-label-sm text-on-surface-variant hover:bg-surface-container transition-colors">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Conectar Google
            </Link>
          )}
          <button onClick={() => setCurrentDate(new Date())} className="px-3 py-2 rounded-xl text-label-sm text-on-surface-variant border border-outline-variant hover:bg-surface-container transition-colors">Hoy</button>
          <button onClick={() => setCurrentDate(d => subMonths(d, 1))} className="w-9 h-9 flex items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
          <button onClick={() => setCurrentDate(d => addMonths(d, 1))} className="w-9 h-9 flex items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* Grid */}
        <div className="flex-1 bg-surface rounded-2xl sm:rounded-3xl border border-outline-variant overflow-hidden zen-shadow">
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
                const visible = dayItems.slice(0, 2)
                const overflow = dayItems.length - visible.length
                return (
                  <button key={idx} onClick={() => setSelectedDay(day)}
                    className={`min-h-[64px] sm:min-h-[96px] p-1.5 sm:p-2 border-b border-r border-outline-variant text-left transition-colors hover:bg-primary/5 active:bg-primary/10 ${
                      todayDay ? 'bg-secondary-container/30' : isCurrentMonth ? 'bg-surface' : 'bg-surface-container/40'
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
                          className={`flex items-center gap-0.5 sm:gap-1 px-1 sm:px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium leading-tight truncate ${item.done ? 'opacity-40' : ''}`}
                          style={{ backgroundColor: item.color + '20', color: item.color }}>
                          {item.type === 'task' && <span className="material-symbols-outlined text-[8px] hidden sm:inline">task_alt</span>}
                          {item.type === 'google_event' && <span className="material-symbols-outlined text-[8px] hidden sm:inline">event_available</span>}
                          {item.type === 'event' && <span className="material-symbols-outlined text-[8px] hidden sm:inline">event</span>}
                          {item.type === 'reminder' && <span className="material-symbols-outlined text-[8px] hidden sm:inline" style={{ fontVariationSettings: "'FILL' 1" }}>notifications</span>}
                          {item.type === 'card_cutoff' && <span className="material-symbols-outlined text-[8px] hidden sm:inline">content_cut</span>}
                          {(item.type === 'card_payment' || item.type === 'debt_payment' || item.type === 'recurring_expense') && <span className="material-symbols-outlined text-[8px] hidden sm:inline">payments</span>}
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

        {/* Panel lateral */}
        <div className="w-full lg:w-64 lg:flex-shrink-0 space-y-3">
          <div className="bg-surface rounded-2xl border border-outline-variant p-4 zen-shadow space-y-3">
            <p className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wide">Próximos 7 días</p>
            {(() => {
              const today = new Date()
              const in7 = new Date(today); in7.setDate(today.getDate() + 7)
              const upcoming = allItems.filter(i => {
                try { const d = parseISO(i.date); return d >= today && d <= in7 && !i.done }
                catch { return false }
              }).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 10)
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

          {googleAccounts.length === 0 ? (
            <Link href="/settings" className="block bg-surface rounded-2xl border border-dashed border-outline-variant p-4 text-center hover:bg-surface-container transition-colors">
              <svg viewBox="0 0 24 24" className="w-6 h-6 mx-auto mb-1" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <p className="text-label-sm text-on-surface-variant">Conectar Google Calendar</p>
            </Link>
          ) : (
            <div className="bg-surface rounded-2xl border border-outline-variant p-3 space-y-1">
              <p className="text-label-sm font-semibold text-on-surface-variant px-1">Google conectado</p>
              {googleAccounts.map(a => (
                <div key={a.id} className="flex items-center gap-2 px-1 py-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
                  <p className="text-label-sm text-on-surface">{a.label}</p>
                </div>
              ))}
              <Link href="/settings" className="flex items-center gap-1 px-1 text-label-sm text-on-surface-variant hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-[13px]">settings</span>
                Administrar
              </Link>
            </div>
          )}
        </div>
      </div>

      {selectedDay && (
        <DayModal
          day={selectedDay}
          items={itemsForDay(selectedDay)}
          expenses={rawExpenses}
          incomes={rawIncomes}
          onClose={() => setSelectedDay(null)}
          onEventSaved={handleEventSaved}
          onEventDeleted={handleEventDeleted}
        />
      )}
    </div>
  )
}
