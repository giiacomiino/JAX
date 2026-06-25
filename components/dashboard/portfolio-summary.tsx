'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { PositionWithPrice } from '@/types'

function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
}

export function PortfolioSummary() {
  const [positions, setPositions] = useState<PositionWithPrice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/portfolio')
      .then(r => r.ok ? r.json() : [])
      .then(setPositions)
      .finally(() => setLoading(false))
  }, [])

  const totalValue = positions.reduce((s, p) => s + (p.value_total ?? 0), 0)
  const totalPnl = positions.reduce((s, p) => s + (p.pnl_amount ?? 0), 0)
  const totalPnlPct = positions.length > 0
    ? (totalPnl / (totalValue - totalPnl)) * 100
    : 0
  const alerts = positions.filter(p => p.alert_triggered)

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-label-md font-semibold text-on-surface">Portfolio</h2>
        <Link href="/portfolio" className="text-label-sm text-primary hover:underline">Ver detalle</Link>
      </div>
      {loading ? (
        <p className="text-label-md text-on-surface-variant">Cargando precios...</p>
      ) : positions.length === 0 ? (
        <p className="text-label-md text-on-surface-variant">Sin posiciones</p>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-headline-md font-bold text-on-surface">{fmt(totalValue)}</p>
            <p className={`text-label-md font-semibold ${totalPnl >= 0 ? 'text-primary' : 'text-error'}`}>
              {totalPnl >= 0 ? '+' : ''}{fmt(totalPnl)} ({totalPnlPct >= 0 ? '+' : ''}{totalPnlPct.toFixed(2)}%)
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {positions.slice(0, 4).map(p => (
              <div key={p.id} className={`px-2.5 py-1 rounded-lg text-label-sm font-medium ${p.alert_triggered ? 'bg-error/10 text-error' : p.pnl_pct !== null && p.pnl_pct >= 0 ? 'bg-primary/10 text-primary' : 'bg-error/5 text-error'}`}>
                {p.ticker} {p.pnl_pct !== null ? `${p.pnl_pct >= 0 ? '+' : ''}${p.pnl_pct.toFixed(1)}%` : '—'}
              </div>
            ))}
          </div>
          {alerts.length > 0 && (
            <p className="text-label-sm text-error font-semibold">⚠ {alerts.length} posición{alerts.length > 1 ? 'es' : ''} con alerta</p>
          )}
        </div>
      )}
    </div>
  )
}
