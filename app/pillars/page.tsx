'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { PillarWithStats, CreatePillarInput } from '@/types'

const PILLAR_COLORS = ['#0058bc','#7c3aed','#059669','#dc2626','#d97706','#0891b2','#be185d','#374151']

const PILLAR_ICONS = [
  { icon: 'work', label: 'Trabajo' },
  { icon: 'school', label: 'Universidad' },
  { icon: 'person', label: 'Personal' },
  { icon: 'favorite', label: 'Salud' },
  { icon: 'attach_money', label: 'Finanzas' },
  { icon: 'groups', label: 'Familia' },
  { icon: 'emoji_events', label: 'Metas' },
  { icon: 'auto_awesome', label: 'Otro' },
]

function PillarForm({ onSubmit, onCancel }: {
  onSubmit: (d: CreatePillarInput) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#0058bc')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    await onSubmit({ name, description, color })
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface rounded-2xl border border-outline-variant p-6 zen-shadow space-y-5">
      <h3 className="font-display font-bold text-label-lg text-on-surface">Nuevo pilar</h3>
      <input
        type="text" placeholder="Nombre del pilar (ej: QiORA, Universidad, Personal...)"
        value={name} onChange={e => setName(e.target.value)} required autoFocus
        className="w-full px-0 py-2 bg-transparent border-b-2 border-outline-variant text-on-surface text-body-lg font-semibold focus:outline-none focus:border-primary transition-colors placeholder:text-outline"
      />
      <input
        type="text" placeholder="Descripción (opcional)"
        value={description} onChange={e => setDescription(e.target.value)}
        className="w-full px-0 py-1.5 bg-transparent border-0 text-on-surface-variant text-body-md focus:outline-none placeholder:text-outline-variant"
      />
      <div className="space-y-2">
        <p className="text-label-sm text-on-surface-variant font-medium">Color del pilar</p>
        <div className="flex gap-2 flex-wrap">
          {PILLAR_COLORS.map(c => (
            <button key={c} type="button" onClick={() => setColor(c)}
              className={`w-8 h-8 rounded-full transition-all ${color === c ? 'scale-125 ring-2 ring-offset-2 ring-primary' : 'hover:scale-110'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-3 justify-end pt-1">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 rounded-xl text-label-md text-on-surface-variant hover:bg-surface-container transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={loading || !name.trim()}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-on-primary text-label-md font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
          <span className="material-symbols-outlined text-[16px]">{loading ? 'progress_activity' : 'check'}</span>
          {loading ? 'Creando...' : 'Crear pilar'}
        </button>
      </div>
    </form>
  )
}

function PillarCard({ pillar: p, onColorChange }: { pillar: PillarWithStats; onColorChange: (id: string, color: string) => Promise<void> }) {
  const icon = PILLAR_ICONS.find(i => i.label.toLowerCase() === p.name.toLowerCase())?.icon ?? 'workspaces'
  const [showColors, setShowColors] = useState(false)
  const [saving, setSaving] = useState(false)

  async function pickColor(e: React.MouseEvent, color: string) {
    e.preventDefault(); e.stopPropagation()
    setSaving(true)
    await onColorChange(p.id, color)
    setSaving(false)
    setShowColors(false)
  }

  return (
    <Link href={`/pillars/${p.id}`}
      className="block bg-surface rounded-2xl border border-outline-variant p-5 zen-shadow hover:shadow-md hover:-translate-y-0.5 transition-all group">
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: p.color + '15' }}>
            <span className="material-symbols-outlined text-[24px]" style={{ color: p.color }}>{icon}</span>
          </div>
          <div>
            <h3 className="font-display font-extrabold text-body-lg text-on-surface group-hover:text-primary transition-colors">{p.name}</h3>
            {p.description && <p className="text-label-sm text-on-surface-variant line-clamp-1 mt-0.5">{p.description}</p>}
          </div>
        </div>
        {/* Color edit button */}
        <div className="relative" onClick={e => e.preventDefault()}>
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); setShowColors(v => !v) }}
            className="w-7 h-7 rounded-full border-2 border-outline-variant hover:scale-110 transition-all flex items-center justify-center"
            style={{ backgroundColor: p.color }}
            title="Cambiar color"
          >
            {saving && <span className="material-symbols-outlined text-[12px] text-white animate-spin">progress_activity</span>}
          </button>
          {showColors && (
            <div className="absolute right-0 top-9 z-10 bg-surface border border-outline-variant rounded-2xl shadow-xl p-3 flex flex-wrap gap-2 w-[140px]">
              {PILLAR_COLORS.map(c => (
                <button key={c} onClick={e => pickColor(e, c)}
                  className={`w-7 h-7 rounded-full transition-all hover:scale-110 ${p.color === c ? 'ring-2 ring-offset-1 ring-on-surface scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-4 mb-4">
        <div className="text-center">
          <p className="font-display font-extrabold text-title-lg text-on-surface">{p.total_projects}</p>
          <p className="text-label-sm text-on-surface-variant">proyectos</p>
        </div>
        <div className="w-px bg-outline-variant" />
        <div className="text-center">
          <p className="font-display font-extrabold text-title-lg text-on-surface">{p.pending_tasks}</p>
          <p className="text-label-sm text-on-surface-variant">pendientes</p>
        </div>
        <div className="w-px bg-outline-variant" />
        <div className="text-center">
          <p className="font-display font-extrabold text-title-lg" style={{ color: p.color }}>{p.completion_rate}%</p>
          <p className="text-label-sm text-on-surface-variant">completado</p>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="w-full bg-surface-container-high rounded-full h-2">
          <div className="h-2 rounded-full transition-all" style={{ width: `${p.completion_rate}%`, backgroundColor: p.color }} />
        </div>
        <div className="flex justify-between text-label-sm text-on-surface-variant">
          <span>{p.completed_tasks} de {p.total_tasks} tareas</span>
          <span className="group-hover:text-primary transition-colors">Ver →</span>
        </div>
      </div>
    </Link>
  )
}

export default function PillarsPage() {
  const [pillars, setPillars] = useState<PillarWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  async function load() {
    const res = await fetch('/api/pillars')
    if (res.ok) setPillars(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleCreate(data: CreatePillarInput) {
    const res = await fetch('/api/pillars', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    })
    if (res.ok) { setShowForm(false); load() }
  }

  async function handleColorChange(id: string, color: string) {
    const res = await fetch(`/api/pillars/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ color }),
    })
    if (res.ok) {
      setPillars(prev => prev.map(p => p.id === id ? { ...p, color } : p))
    }
  }

  const totalPending = pillars.reduce((s, p) => s + p.pending_tasks, 0)
  const totalProjects = pillars.reduce((s, p) => s + p.total_projects, 0)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-display-sm font-extrabold text-on-surface" style={{ letterSpacing: '-0.03em' }}>
            Pilares
          </h1>
          <p className="text-on-surface-variant text-label-md mt-1">
            {pillars.length} pilares · {totalProjects} proyectos · {totalPending} tareas pendientes
          </p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-xl text-label-md font-semibold hover:opacity-90 transition-opacity">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nuevo pilar
        </button>
      </div>

      {showForm && <PillarForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />}

      {loading ? (
        <div className="flex justify-center py-20">
          <span className="material-symbols-outlined text-[32px] text-primary animate-spin">progress_activity</span>
        </div>
      ) : pillars.length === 0 ? (
        <div className="text-center py-24 bg-surface rounded-3xl border border-outline-variant">
          <span className="material-symbols-outlined text-[56px] text-outline-variant mb-4 block">workspaces</span>
          <p className="text-body-lg text-on-surface font-semibold">Define los pilares de tu vida</p>
          <p className="text-label-md text-on-surface-variant mt-1 mb-6">Trabajo, universidad, personal, finanzas...</p>
          <button onClick={() => setShowForm(true)} className="text-primary text-label-md font-semibold hover:opacity-70">
            Crear primer pilar →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {pillars.map(p => <PillarCard key={p.id} pillar={p} onColorChange={handleColorChange} />)}
        </div>
      )}
    </div>
  )
}
