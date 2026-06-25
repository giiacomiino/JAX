'use client'

import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <span className="material-symbols-outlined text-[48px] text-error">error</span>
        <p className="text-on-surface-variant text-body-md">Algo salió mal</p>
        <button
          onClick={reset}
          className="px-4 py-2 rounded-xl bg-primary text-on-primary text-label-md"
        >
          Reintentar
        </button>
      </div>
    </div>
  )
}
