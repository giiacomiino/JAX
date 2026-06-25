'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { PositionWithPrice } from '@/types'

function fmt(n: number, cur = 'MXN') {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(n)
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
  const totalPnlPct = totalValue > 0 ? (totalPnl / (totalValue - totalPnl)) * 100 : 0
  const alerts = positions.filter(p => p.alert_triggered)

  const barHeights = [40, 60, 45, 80, 55, 95]

  return (
    <div className="bg-surface-container-low rounded-3xl p-8 zen-shadow h-full flex flex-col justify-between">
      <div>
        <span className="inline-block px-3 py-1 bg-secondary-container/20 text-secondary rounded-full text-label-sm font-semibold mb-3">FINANZAS</span>
        {loading ? (
          <p className="text-label-md text-on-surface-variant">Cargando precios...</p>
        ) : positions.length === 0 ? (
          <>
            <h2 className="text-headline-md font-bold text-on-surface mb-1">Sin posiciones</h2>
            <Link href="/portfolio" className="text-label-sm text-primary">Agregar inversiones →</Link>
          </>
        ) : (
          <>
            <h2 className="text-headline-md font-bold text-on-surface mb-1">{fmt(totalValue)}</h2>
            <p className={`text-label-md flex items-center gap-1 ${totalPnl >= 0 ? 'text-primary' : 'text-error'}`}>
              <span className="material-symbols-outlined text-[16px]">{totalPnl >= 0 ? 'trending_up' : 'trending_down'}</span>
              {totalPnl >= 0 ? '+' : ''}{totalPnlPct.toFixed(2)}% vs compra
            </p>
            {alerts.length > 0 && (
              <p className="text-label-sm text-error font-semibold mt-1">⚠ {alerts.length} alerta{alerts.length > 1 ? 's' : ''}</p>
            )}
          </>
        )}

        <div className="h-24 w-full mt-6">
          <div className="flex items-end justify-between h-full gap-1">
            {barHeights.map((h, i) => (
              <div key={i} className={`w-full rounded-t-lg ${i === barHeights.length - 1 ? 'bg-primary' : 'bg-primary/20'}`} style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </div>

      <Link href="/portfolio" className="mt-4 text-label-sm text-on-surface-variant hover:text-primary transition-colors">
        Ver portfolio →
      </Link>
    </div>
  )
}
