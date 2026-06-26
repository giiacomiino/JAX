'use client'

import { useEffect, useState, useRef } from 'react'
import { format, addDays } from 'date-fns'

type ItemType = 'event' | 'task' | 'reminder'

interface Pillar { id: string; name: string; color: string }
interface Project { id: string; name: string; pillar_id: string | null; color: string }

const QUICK_DATES = [
  { label: 'Hoy',    days: 0 },
  { label: 'Mañana', days: 1 },
  { label: 'En 3 días', days: 3 },
  { label: 'La próxima semana', days: 7 },
]

function todayStr(offsetDays = 0) {
  return format(addDays(new Date(), offsetDays), 'yyyy-MM-dd')
}

export function QuickAdd({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<ItemType>('event')
  const [title, setTitle] = useState('')
  const [dateOffset, setDateOffset] = useState(1) // default mañana
  const [customDate, setCustomDate] = useState('')
  const [time, setTime] = useState('10:00')
  const [pillarId, setPillarId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium')
  const [pillars, setPillars] = useState<Pillar[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    Promise.all([
      fetch('/api/pillars').then(r => r.json()).catch(() => []),
      fetch('/api/projects').then(r => r.json()).catch(() => []),
    ]).then(([pil, proj]) => {
      setPillars(Array.isArray(pil) ? pil : [])
      setProjects(Array.isArray(proj) ? proj : [])
    })
    setTimeout(() => titleRef.current?.focus(), 50)
  }, [open])

  // Reset project when pillar changes
  useEffect(() => { setProjectId('') }, [pillarId])

  const pillarProjects = projects.filter(p =>
    pillarId ? (p.pillar_id === pillarId) : true
  )

  const resolvedDate = customDate || todayStr(dateOffset)

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)

    let res: Response | null = null
    const datetime = `${resolvedDate}T${time}:00`

    if (type === 'event') {
      res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          starts_at: datetime,
          ends_at: datetime,
          reminder_minutes: 30,
          description: pillarId
            ? `Pilar: ${pillars.find(p => p.id === pillarId)?.name ?? ''}${projectId ? ` · Proyecto: ${projects.find(p => p.id === projectId)?.name ?? ''}` : ''}`
            : undefined,
        }),
      })
    } else if (type === 'task') {
      res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          due_date: resolvedDate,
          priority,
          category: 'work',
          project_id: projectId || undefined,
        }),
      })
    } else {
      res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          reminder_at: datetime,
          is_recurring: false,
        }),
      })
    }

    setSaving(false)
    if (res?.ok) {
      setSaved(true)
      setTitle('')
      setPillarId('')
      setProjectId('')
      setDateOffset(1)
      setCustomDate('')
      onCreated?.()
      setTimeout(() => { setSaved(false); setOpen(false) }, 1200)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 px-5 py-4 bg-surface border border-dashed border-outline-variant rounded-2xl text-on-surface-variant hover:border-primary hover:text-primary hover:bg-primary/5 transition-all group"
      >
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
          <span className="material-symbols-outlined text-[18px] text-primary">add</span>
        </div>
        <span className="text-label-md font-medium">Agregar rápido — tarea, evento o recordatorio...</span>
        <kbd className="ml-auto text-label-sm px-1.5 py-0.5 rounded bg-surface-container border border-outline-variant text-on-surface-variant/60 hidden md:inline">Q</kbd>
      </button>
    )
  }

  return (
    <div className="bg-surface border border-primary/20 rounded-2xl shadow-lg overflow-hidden">
      {/* Type tabs */}
      <div className="flex border-b border-outline-variant">
        {([
          { key: 'event', label: 'Evento', icon: 'event' },
          { key: 'task', label: 'Tarea', icon: 'check_circle' },
          { key: 'reminder', label: 'Recordatorio', icon: 'notifications' },
        ] as { key: ItemType; label: string; icon: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setType(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-label-md font-semibold transition-all ${
              type === t.key
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-5 space-y-4">
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
          onKeyDown={e => { if (e.key === 'Enter' && title.trim()) handleSave() }}
          className="w-full px-0 py-1 bg-transparent border-0 border-b-2 border-outline-variant text-on-surface text-body-lg font-medium focus:outline-none focus:border-primary transition-colors placeholder:text-outline text-[18px]"
        />

        <div className="flex flex-wrap gap-2 items-center">
          {/* Quick date pills */}
          {QUICK_DATES.map(d => (
            <button
              key={d.days}
              onClick={() => { setDateOffset(d.days); setCustomDate('') }}
              className={`px-3 py-1.5 rounded-xl text-label-sm font-semibold border transition-all ${
                !customDate && dateOffset === d.days
                  ? 'bg-primary text-on-primary border-primary'
                  : 'border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary'
              }`}
            >
              {d.label}
            </button>
          ))}
          {/* Custom date */}
          <input
            type="date"
            value={customDate}
            onChange={e => { setCustomDate(e.target.value) }}
            className={`px-3 py-1.5 rounded-xl text-label-sm font-semibold border transition-all cursor-pointer ${
              customDate ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant text-on-surface-variant hover:border-primary'
            }`}
          />
          {/* Time (not for tasks) */}
          {type !== 'task' && (
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-label-sm font-semibold border border-outline-variant text-on-surface-variant hover:border-primary transition-all"
            />
          )}
          {/* Priority (tasks only) */}
          {type === 'task' && (
            <div className="flex gap-1">
              {(['high', 'medium', 'low'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`px-2.5 py-1.5 rounded-xl text-label-sm font-semibold border transition-all ${
                    priority === p
                      ? p === 'high' ? 'bg-red-100 text-red-700 border-red-300'
                        : p === 'medium' ? 'bg-primary/10 text-primary border-primary/30'
                        : 'bg-surface-container text-on-surface-variant border-outline'
                      : 'border-outline-variant text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  {p === 'high' ? '↑ Alta' : p === 'medium' ? '— Media' : '↓ Baja'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pilar + Proyecto */}
        <div className="flex gap-2 flex-wrap">
          {/* Pillar */}
          <div className="relative">
            <select
              value={pillarId}
              onChange={e => setPillarId(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 rounded-xl text-label-sm font-semibold border border-outline-variant text-on-surface-variant bg-surface hover:border-primary transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
              style={pillarId ? { borderColor: pillars.find(p => p.id === pillarId)?.color, color: pillars.find(p => p.id === pillarId)?.color } : {}}
            >
              <option value="">📌 Sin pilar</option>
              {pillars.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <span className="material-symbols-outlined text-[14px] text-on-surface-variant absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">expand_more</span>
          </div>

          {/* Project (only for tasks and when pillar is selected or projects exist) */}
          {type === 'task' && pillarProjects.length > 0 && (
            <div className="relative">
              <select
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 rounded-xl text-label-sm font-semibold border border-outline-variant text-on-surface-variant bg-surface hover:border-primary transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">📁 Sin proyecto</option>
                {pillarProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <span className="material-symbols-outlined text-[14px] text-on-surface-variant absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">expand_more</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => { setOpen(false); setTitle('') }}
            className="px-3 py-2 rounded-xl text-label-md text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            Cancelar
          </button>

          <button
            onClick={handleSave}
            disabled={saving || !title.trim() || saved}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-label-md font-bold transition-all disabled:opacity-50 ${
              saved
                ? 'bg-green-500 text-white'
                : 'bg-primary text-on-primary hover:opacity-90 active:scale-95'
            }`}
          >
            {saved ? (
              <><span className="material-symbols-outlined text-[16px]">check</span>Guardado</>
            ) : saving ? (
              <><span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>Guardando...</>
            ) : (
              <><span className="material-symbols-outlined text-[16px]">
                {type === 'event' ? 'event' : type === 'task' ? 'check_circle' : 'notifications'}
              </span>Guardar</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
