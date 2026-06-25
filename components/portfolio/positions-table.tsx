'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { PositionForm } from './position-form'
import type { PositionWithPrice, CreatePositionInput } from '@/types'

const REFRESH_INTERVAL = 60_000 // 60 seconds

function fmt(n: number, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n)
}

function pct(n: number) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}

export function PositionsTable() {
  const [positions, setPositions] = useState<PositionWithPrice[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [secondsAgo, setSecondsAgo] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchPositions = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    const res = await fetch('/api/portfolio')
    if (res.ok) {
      setPositions(await res.json())
      setLastUpdated(new Date())
      setSecondsAgo(0)
    }
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    fetchPositions()
    intervalRef.current = setInterval(() => fetchPositions(true), REFRESH_INTERVAL)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [fetchPositions])

  // Seconds counter
  useEffect(() => {
    const tick = setInterval(() => setSecondsAgo(s => s + 1), 1000)
    return () => clearInterval(tick)
  }, [lastUpdated])

  async function handleCreate(data: CreatePositionInput) {
    const res = await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      setShowForm(false)
      setLoading(true)
      await fetchPositions()
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/portfolio/${id}`, { method: 'DELETE' })
    if (res.ok) setPositions(prev => prev.filter(p => p.id !== id))
  }

  const totalValue = positions.reduce((s, p) => s + (p.value_total ?? 0), 0)
  const totalPnl = positions.reduce((s, p) => s + (p.pnl_amount ?? 0), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-label-sm text-on-surface-variant">Valor total (aprox.)</p>
          <p className="text-headline-lg font-bold text-on-surface">{fmt(totalValue)}</p>
          <p className={`text-label-md font-semibold ${totalPnl >= 0 ? 'text-primary' : 'text-error'}`}>
            {totalPnl >= 0 ? '+' : ''}{fmt(totalPnl)} total P&L
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            {lastUpdated && (
              <p className="text-label-sm text-on-surface-variant">
                {secondsAgo < 60 ? `hace ${secondsAgo}s` : `hace ${Math.floor(secondsAgo / 60)}min`}
              </p>
            )}
            <button
              onClick={() => fetchPositions(true)}
              disabled={refreshing}
              className="flex items-center gap-1 text-label-sm text-primary hover:opacity-70 transition-opacity disabled:opacity-40"
            >
              <span className={`material-symbols-outlined text-[14px] ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
              {refreshing ? 'Actualizando...' : 'Actualizar'}
            </button>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-xl text-label-md font-semibold hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Agregar
          </button>
        </div>
      </div>

      {showForm && <PositionForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />}

      {loading ? (
        <div className="text-center py-12 text-on-surface-variant text-label-md">Cargando precios...</div>
      ) : positions.length === 0 ? (
        <div className="text-center py-12 text-on-surface-variant text-label-md">Sin posiciones — agrega tu primera inversión</div>
      ) : (
        <div className="space-y-3">
          {positions.map(p => {
            const isAlert = p.alert_triggered
            return (
              <div key={p.id} className={`bg-surface-container-lowest border rounded-xl p-4 ${isAlert ? 'border-error/40 bg-error/5' : 'border-outline-variant'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-label-sm ${isAlert ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'}`}>
                      {p.ticker.slice(0, 3)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-label-md font-semibold text-on-surface">{p.ticker}</p>
                        <span className="text-label-sm text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">{p.market.toUpperCase()}</span>
                        {isAlert && <span className="text-label-sm text-error">⚠ Alerta</span>}
                      </div>
                      <p className="text-label-sm text-on-surface-variant">{p.shares} acciones · compra {fmt(p.purchase_price, p.currency)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-label-md font-bold text-on-surface">
                      {p.current_price !== null ? fmt(p.current_price, p.currency) : '—'}
                    </p>
                    {p.pnl_pct !== null && (
                      <p className={`text-label-sm font-semibold ${p.pnl_pct >= 0 ? 'text-primary' : 'text-error'}`}>
                        {pct(p.pnl_pct)}
                      </p>
                    )}
                    <p className="text-label-sm text-on-surface-variant">
                      {p.value_total !== null ? fmt(p.value_total, p.currency) : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="ml-3 w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
