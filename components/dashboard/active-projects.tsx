'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { ProjectWithStats } from '@/types'

export function ActiveProjects() {
  const [projects, setProjects] = useState<ProjectWithStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then((all: ProjectWithStats[]) => {
        setProjects(all.filter(p => p.status === 'active').slice(0, 4))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="bg-surface-container-low rounded-3xl p-6 zen-shadow h-full">
      <div className="flex justify-between items-start mb-6">
        <div>
          <span className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-label-sm font-semibold mb-2">PROYECTOS</span>
          <h2 className="text-headline-md font-bold text-on-surface">Activos</h2>
        </div>
        <Link href="/projects" className="text-label-sm text-on-surface-variant hover:text-primary border border-outline-variant rounded-full px-3 py-1 transition-colors">
          Ver todos
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <span className="material-symbols-outlined text-[24px] text-primary animate-spin">progress_activity</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-6">
          <span className="material-symbols-outlined text-[36px] text-outline-variant block mb-2">folder_open</span>
          <p className="text-label-md text-on-surface-variant">Sin proyectos activos</p>
          <Link href="/projects" className="text-label-sm text-primary mt-2 inline-block">Crear uno →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map(p => (
            <Link key={p.id} href={`/projects/${p.id}`}
              className="block p-3 bg-white/60 rounded-2xl border border-transparent hover:border-primary/20 transition-all group">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: p.color + '20' }}>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                </div>
                <p className="flex-1 text-label-md font-semibold text-on-surface group-hover:text-primary transition-colors truncate">{p.name}</p>
                <span className="text-label-sm font-bold" style={{ color: p.color }}>{p.completion_rate}%</span>
              </div>
              <div className="w-full bg-surface-container-high rounded-full h-1.5">
                <div className="h-1.5 rounded-full transition-all" style={{ width: `${p.completion_rate}%`, backgroundColor: p.color }} />
              </div>
              <p className="text-label-sm text-on-surface-variant mt-1.5">{p.pending_tasks} pendientes</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
