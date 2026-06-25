'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { PillarWithStats } from '@/types'

export function ActiveProjects() {
  const [pillars, setPillars] = useState<PillarWithStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/pillars')
      .then(r => r.json())
      .then((all: PillarWithStats[]) => {
        setPillars(Array.isArray(all) ? all.slice(0, 4) : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="bg-surface-container-low rounded-3xl p-6 zen-shadow h-full">
      <div className="flex justify-between items-start mb-6">
        <div>
          <span className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-label-sm font-semibold mb-2">PILARES</span>
          <h2 className="text-headline-md font-bold text-on-surface">Mis áreas de vida</h2>
        </div>
        <Link href="/pillars" className="text-label-sm text-on-surface-variant hover:text-primary border border-outline-variant rounded-full px-3 py-1 transition-colors">
          Ver todos
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <span className="material-symbols-outlined text-[24px] text-primary animate-spin">progress_activity</span>
        </div>
      ) : pillars.length === 0 ? (
        <div className="text-center py-6">
          <span className="material-symbols-outlined text-[36px] text-outline-variant block mb-2">workspaces</span>
          <p className="text-label-md text-on-surface-variant">Sin pilares definidos</p>
          <Link href="/pillars" className="text-label-sm text-primary mt-2 inline-block">Crear uno →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {pillars.map(p => (
            <Link key={p.id} href={`/pillars/${p.id}`}
              className="block p-3 bg-white/60 rounded-2xl border border-transparent hover:border-primary/20 transition-all group">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: p.color + '20' }}>
                  <span className="material-symbols-outlined text-[14px]" style={{ color: p.color }}>workspaces</span>
                </div>
                <p className="flex-1 text-label-md font-semibold text-on-surface group-hover:text-primary transition-colors truncate">{p.name}</p>
                <span className="text-label-sm font-bold" style={{ color: p.color }}>{p.completion_rate}%</span>
              </div>
              <div className="w-full bg-surface-container-high rounded-full h-1.5">
                <div className="h-1.5 rounded-full" style={{ width: `${p.completion_rate}%`, backgroundColor: p.color }} />
              </div>
              <p className="text-label-sm text-on-surface-variant mt-1.5">
                {p.total_projects} proyectos · {p.pending_tasks} pendientes
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
