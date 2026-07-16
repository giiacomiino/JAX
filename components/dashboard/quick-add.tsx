'use client'

import { useEffect, useState, useRef } from 'react'
import { format, addDays, addWeeks, addMonths, addYears } from 'date-fns'

type ItemType = 'event' | 'task' | 'reminder'
type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly'

interface Pillar { id: string; name: string; color: string }
interface Project { id: string; name: string; pillar_id: string | null; color: string }
interface GoogleAccount { id: string; label: string; email: string; color: string }

const QUICK_DATES = [
  { label: 'Hoy',    days: 0 },
  { label: 'Mañana', days: 1 },
  { label: 'En 3 días', days: 3 },
  { label: 'Próx. semana', days: 7 },
]

const RECURRENCE_OPTIONS: { value: RecurrencePattern; label: string; icon: string; instances: number; desc: string }[] = [
  { value: 'daily',   label: 'Diario',   icon: 'today',          instances: 30,  desc: '30 días' },
  { value: 'weekly',  label: 'Semanal',  icon: 'view_week',      instances: 52,  desc: '52 semanas' },
  { value: 'monthly', label: 'Mensual',  icon: 'calendar_month', instances: 12,  desc: '12 meses' },
  { value: 'yearly',  label: 'Anual',    icon: 'event_repeat',   instances: 3,   desc: '3 años' },
]

function todayStr(offsetDays = 0) {
  return format(addDays(new Date(), offsetDays), 'yyyy-MM-dd')
}

function generateDates(base: Date, pattern: RecurrencePattern): Date[] {
  const count = RECURRENCE_OPTIONS.find(r => r.value === pattern)?.instances ?? 12
  return Array.from({ length: count }, (_, i) => {
    if (pattern === 'daily')   return addDays(base, i)
    if (pattern === 'weekly')  return addWeeks(base, i)
    if (pattern === 'monthly') return addMonths(base, i)
    return addYears(base, i)
  })
}

export function QuickAdd({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<ItemType>('event')
  const [title, setTitle] = useState('')
  const [dateOffset, setDateOffset] = useState(1)
  const [customDate, setCustomDate] = useState('')
  const [time, setTime] = useState('10:00')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>('monthly')
  const [pillarId, setPillarId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium')
  const [pillars, setPillars] = useState<Pillar[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [googleAccounts, setGoogleAccounts] = useState<GoogleAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedCount, setSavedCount] = useState(0)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    Promise.all([
      fetch('/api/pillars').then(r => r.json()).catch(() => []),
      fetch('/api/projects').then(r => r.json()).catch(() => []),
      fetch('/api/google/accounts').then(r => r.json()).catch(() => []),
    ]).then(([pil, proj, gAccounts]) => {
      setPillars(Array.isArray(pil) ? pil : [])
      setProjects(Array.isArray(proj) ? proj : [])
      const accounts: GoogleAccount[] = Array.isArray(gAccounts) ? gAccounts : []
      setGoogleAccounts(accounts)
      if (accounts.length > 0 && !selectedAccountId) setSelectedAccountId(accounts[0].id)
    })
    setTimeout(() => titleRef.current?.focus(), 50)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setProjectId('') }, [pillarId])

  const pillarProjects = projects.filter(p => pillarId ? p.pillar_id === pillarId : true)
  const resolvedDate = customDate || todayStr(dateOffset)

  const recurrInfo = RECURRENCE_OPTIONS.find(r => r.value === recurrencePattern)!

  function reset() {
    setTitle(''); setPillarId(''); setProjectId('')
    setDateOffset(1); setCustomDate(''); setIsRecurring(false)
    setSavedCount(0)
    // keep selectedAccountId so it stays on the chosen account across resets
  }

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)

    const baseDate = new Date(`${resolvedDate}T${time}:00`)
    const dates = isRecurring ? generateDates(baseDate, recurrencePattern) : [baseDate]

    const pillarNote = pillarId
      ? `Pilar: ${pillars.find(p => p.id === pillarId)?.name ?? ''}${projectId ? ` · Proyecto: ${projects.find(p => p.id === projectId)?.name ?? ''}` : ''}`
      : undefined

    let created = 0
    for (const d of dates) {
      const dateStr = format(d, 'yyyy-MM-dd')
      const datetimeStr = format(d, "yyyy-MM-dd'T'HH:mm:ss")

      let res: Response
      if (type === 'event') {
        if (selectedAccountId && googleAccounts.length > 0) {
          // GCal mirror — create directly in Google Calendar
          res = await fetch('/api/google/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accountId: selectedAccountId,
              calendarId: 'primary',
              title: title.trim(),
              date: dateStr,
              time,
              description: pillarNote,
            }),
          })
        } else {
          // Fallback: local JAX event (no GCal connected)
          res = await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: title.trim(),
              starts_at: datetimeStr,
              ends_at: datetimeStr,
              reminder_minutes: 30,
              description: pillarNote,
              pillar_id: pillarId || undefined,
            }),
          })
        }
      } else if (type === 'task') {
        res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            due_date: dateStr,
            priority,
            category: 'work',
            project_id: projectId || undefined,
          }),
        })
        // Sync to GCal if account selected, and link the mirror back to the task
        // so the calendar view doesn't show both the task and its GCal copy.
        if (res.ok && selectedAccountId && googleAccounts.length > 0) {
          const created = await res.json()
          const gcalRes = await fetch('/api/google/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId: selectedAccountId, calendarId: 'primary', title: title.trim(), date: dateStr, time, description: pillarNote }),
          })
          if (gcalRes.ok) {
            const { gcalId, gcalAccountId } = await gcalRes.json()
            fetch(`/api/tasks/${created.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ google_event_id: gcalId, google_account_id: gcalAccountId }),
            }).catch(() => {})
          }
        }
      } else {
        res = await fetch('/api/reminders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            reminder_at: datetimeStr,
            is_recurring: isRecurring,
            recurrence_pattern: isRecurring ? recurrencePattern : null,
          }),
        })
        // Sync to GCal if account selected, and link the mirror back to the reminder
        // so the calendar view doesn't show both the reminder and its GCal copy.
        if (res.ok && selectedAccountId && googleAccounts.length > 0) {
          const created = await res.json()
          const gcalRes = await fetch('/api/google/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId: selectedAccountId, calendarId: 'primary', title: title.trim(), date: dateStr, time, description: '🔔 Recordatorio JAX' }),
          })
          if (gcalRes.ok) {
            const { gcalId, gcalAccountId } = await gcalRes.json()
            fetch(`/api/reminders/${created.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ google_event_id: gcalId, google_account_id: gcalAccountId }),
            }).catch(() => {})
          }
        }
      }
      if (res!.ok) created++
    }

    setSaving(false)
    setSavedCount(created)
    onCreated?.()
    setTimeout(() => { reset(); setOpen(false) }, 1800)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-surface border border-outline-variant rounded-xl text-on-surface-variant hover:border-primary/50 transition-all group zen-shadow"
      >
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors flex-shrink-0">
          <span className="material-symbols-outlined text-[18px] text-primary">add</span>
        </div>
        <span className="text-label-md font-medium text-on-surface-variant">Agregar tarea, evento o recordatorio...</span>
        <kbd className="ml-auto text-label-sm px-1.5 py-0.5 rounded bg-surface-container border border-outline-variant text-on-surface-variant/60 hidden md:inline flex-shrink-0">Q</kbd>
      </button>
    )
  }

  return (
    <div className="bg-surface border border-primary/20 rounded-xl shadow-lg overflow-hidden zen-shadow">
      {/* Type tabs */}
      <div className="flex border-b border-outline-variant">
        {([
          { key: 'event',    label: 'Evento',         icon: 'event' },
          { key: 'task',     label: 'Tarea',           icon: 'check_circle' },
          { key: 'reminder', label: 'Recordatorio',    icon: 'notifications' },
        ] as { key: ItemType; label: string; icon: string }[]).map(t => (
          <button key={t.key} onClick={() => setType(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-label-md font-semibold transition-all ${
              type === t.key
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}>
            <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-5 space-y-4">
        {/* Google account selector — shown for events, tasks and reminders when GCal is connected */}
        {googleAccounts.length > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-xl bg-surface-container">
            <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="text-label-sm text-on-surface-variant flex-shrink-0">
              {type === 'event' ? 'Agregar a:' : 'Sincronizar con:'}
            </span>
            <div className="flex gap-1.5 flex-wrap">
              {googleAccounts.map(a => (
                <button key={a.id} onClick={() => setSelectedAccountId(a.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-label-sm font-semibold transition-all ${
                    selectedAccountId === a.id
                      ? 'text-white'
                      : 'text-on-surface-variant bg-surface hover:bg-surface-container-high'
                  }`}
                  style={selectedAccountId === a.id ? { backgroundColor: a.color } : {}}>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedAccountId === a.id ? 'rgba(255,255,255,0.7)' : a.color }} />
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Title */}
        <input
          ref={titleRef}
          type="text"
          placeholder={
            type === 'event' ? '¿Qué tienes? ej. Junta QiORA…'
            : type === 'task' ? '¿Qué tienes que hacer?'
            : '¿Qué quieres recordar?'
          }
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && title.trim() && !isRecurring) handleSave() }}
          className="w-full px-0 py-1 bg-transparent border-0 border-b-2 border-outline-variant text-on-surface text-body-lg font-medium focus:outline-none focus:border-primary transition-colors placeholder:text-outline text-[18px]"
        />

        {/* Date + time row */}
        <div className="flex flex-wrap gap-2 items-center">
          {QUICK_DATES.map(d => (
            <button key={d.days}
              onClick={() => { setDateOffset(d.days); setCustomDate('') }}
              className={`px-3 py-1.5 rounded-xl text-label-sm font-semibold border transition-all ${
                !customDate && dateOffset === d.days
                  ? 'bg-primary text-on-primary border-primary'
                  : 'border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary'
              }`}>
              {d.label}
            </button>
          ))}
          <input type="date" value={customDate}
            onChange={e => setCustomDate(e.target.value)}
            className={`px-3 py-1.5 rounded-xl text-label-sm font-semibold border transition-all cursor-pointer ${
              customDate ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant text-on-surface-variant hover:border-primary'
            }`}
          />
          {type !== 'task' && (
            <input type="time" value={time} onChange={e => setTime(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-label-sm font-semibold border border-outline-variant text-on-surface-variant hover:border-primary transition-all"
            />
          )}
          {type === 'task' && (
            <div className="flex gap-1">
              {(['high', 'medium', 'low'] as const).map(p => (
                <button key={p} onClick={() => setPriority(p)}
                  className={`px-2.5 py-1.5 rounded-xl text-label-sm font-semibold border transition-all ${
                    priority === p
                      ? p === 'high' ? 'bg-red-100 text-red-700 border-red-300'
                        : p === 'medium' ? 'bg-primary/10 text-primary border-primary/30'
                        : 'bg-surface-container text-on-surface-variant border-outline'
                      : 'border-outline-variant text-on-surface-variant hover:bg-surface-container'
                  }`}>
                  {p === 'high' ? '↑ Alta' : p === 'medium' ? '— Media' : '↓ Baja'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Recurrence toggle */}
        <div className="space-y-2">
          <button type="button" onClick={() => setIsRecurring(v => !v)}
            className="flex items-center gap-2 group">
            <div className={`w-9 h-5 rounded-full relative transition-colors ${isRecurring ? 'bg-primary' : 'bg-outline-variant'}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${isRecurring ? 'left-4' : 'left-0.5'}`} />
            </div>
            <span className={`text-label-sm font-semibold transition-colors ${isRecurring ? 'text-primary' : 'text-on-surface-variant group-hover:text-on-surface'}`}>
              Recurrente
            </span>
            {isRecurring && (
              <span className="text-label-sm text-on-surface-variant">
                · {recurrInfo.instances} {type === 'event' ? 'eventos' : type === 'task' ? 'tareas' : 'recordatorios'} ({recurrInfo.desc})
              </span>
            )}
          </button>

          {isRecurring && (
            <div className="flex gap-2 flex-wrap pl-11">
              {RECURRENCE_OPTIONS.map(r => (
                <button key={r.value} onClick={() => setRecurrencePattern(r.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-label-sm font-semibold border transition-all ${
                    recurrencePattern === r.value
                      ? 'bg-primary/10 text-primary border-primary/30'
                      : 'border-outline-variant text-on-surface-variant hover:bg-surface-container hover:border-primary/40'
                  }`}>
                  <span className="material-symbols-outlined text-[13px]">{r.icon}</span>
                  {r.label}
                </button>
              ))}
              {recurrencePattern === 'monthly' && (
                <span className="flex items-center text-label-sm text-on-surface-variant px-1">
                  Día {format(new Date(resolvedDate + 'T00:00:00'), 'd')} de cada mes
                </span>
              )}
              {recurrencePattern === 'weekly' && (
                <span className="flex items-center text-label-sm text-on-surface-variant px-1">
                  Cada {['domingo','lunes','martes','miércoles','jueves','viernes','sábado'][new Date(resolvedDate + 'T00:00:00').getDay()]}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Pilar + Proyecto */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <select value={pillarId} onChange={e => setPillarId(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 rounded-xl text-label-sm font-semibold border border-outline-variant text-on-surface-variant bg-surface hover:border-primary transition-all cursor-pointer focus:outline-none"
              style={pillarId ? { borderColor: pillars.find(p => p.id === pillarId)?.color, color: pillars.find(p => p.id === pillarId)?.color } : {}}>
              <option value="">📌 Sin pilar</option>
              {pillars.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <span className="material-symbols-outlined text-[14px] text-on-surface-variant absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">expand_more</span>
          </div>

          {type === 'task' && pillarProjects.length > 0 && (
            <div className="relative">
              <select value={projectId} onChange={e => setProjectId(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 rounded-xl text-label-sm font-semibold border border-outline-variant text-on-surface-variant bg-surface hover:border-primary transition-all cursor-pointer focus:outline-none">
                <option value="">📁 Sin proyecto</option>
                {pillarProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <span className="material-symbols-outlined text-[14px] text-on-surface-variant absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">expand_more</span>
            </div>
          )}
        </div>

        {/* Save row */}
        <div className="flex items-center justify-between pt-1">
          <button onClick={() => { reset(); setOpen(false) }}
            className="px-3 py-2 rounded-xl text-label-md text-on-surface-variant hover:bg-surface-container transition-colors">
            Cancelar
          </button>

          <button onClick={handleSave} disabled={saving || !title.trim() || savedCount > 0}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-label-md font-bold transition-all disabled:opacity-50 ${
              savedCount > 0 ? 'bg-green-500 text-white'
              : 'bg-primary text-on-primary hover:opacity-90 active:scale-95'
            }`}>
            {savedCount > 0 ? (
              <><span className="material-symbols-outlined text-[16px]">check</span>
                {isRecurring ? `${savedCount} creados` : 'Guardado'}
              </>
            ) : saving ? (
              <><span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                {isRecurring ? `Creando ${recurrInfo.instances}…` : 'Guardando…'}
              </>
            ) : (
              <><span className="material-symbols-outlined text-[16px]">
                {type === 'event' ? 'event' : type === 'task' ? 'check_circle' : 'notifications'}
              </span>
                {isRecurring ? `Crear ${recurrInfo.instances} ${type === 'event' ? 'eventos' : type === 'task' ? 'tareas' : 'recordatorios'}` : 'Guardar'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
