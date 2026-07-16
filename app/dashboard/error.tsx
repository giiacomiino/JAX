'use client'

import { useEffect } from 'react'

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('[Dashboard Error]', error) }, [error])

  return (
    <div className="p-6 bg-surface rounded-3xl border border-red-200 space-y-3">
      <p className="font-bold text-red-600">Error en el dashboard</p>
      <p className="text-label-md text-on-surface font-mono bg-red-50 p-3 rounded-xl">{error.message}</p>
      {error.stack && (
        <pre className="text-[10px] text-red-700 bg-red-50 p-3 rounded-xl overflow-auto max-h-40">
          {error.stack}
        </pre>
      )}
      <button onClick={reset} className="px-4 py-2 bg-primary text-on-primary rounded-xl text-label-md">
        Reintentar
      </button>
    </div>
  )
}
