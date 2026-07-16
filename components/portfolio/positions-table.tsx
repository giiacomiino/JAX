'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { PositionForm } from './position-form'
import type { PositionWithPrice, CreatePositionInput } from '@/types'

const REFRESH_INTERVAL = 60_000

function fmt(n: number, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n)
}

function pct(n: number) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}

// ─── Chart types ────────────────────────────────────────────────────────────

type HistoryEntry = { dates: string[]; closes: number[] }
type HistoryMap = Record<string, HistoryEntry | null>

// ─── SVG helpers ────────────────────────────────────────────────────────────

function fmtV(v: number) {
  if (v >= 100000) return `${(v / 1000).toFixed(0)}k`
  if (v >= 10000) return `${(v / 1000).toFixed(1)}k`
  if (v >= 1000) return v.toFixed(0)
  if (v >= 100) return v.toFixed(1)
  return v.toFixed(2)
}

function fmtD(d: string) {
  const dt = new Date(d + 'T12:00:00')
  return dt.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })
}

// ─── LineChart ───────────────────────────────────────────────────────────────

function LineChart({
  chartId,
  dates,
  values,
  referenceLine,
  height = 150,
}: {
  chartId: string
  dates: string[]
  values: number[]
  referenceLine?: number
  height?: number
}) {
  if (values.length < 2) return null

  const W = 500
  const H = height
  const pad = { t: 10, r: 42, b: 28, l: 52 }
  const cW = W - pad.l - pad.r
  const cH = H - pad.t - pad.b

  const allVals = [...values, ...(referenceLine !== undefined ? [referenceLine] : [])]
  const vMin = Math.min(...allVals)
  const vMax = Math.max(...allVals)
  const vRange = vMax - vMin || 1

  const x = (i: number) => pad.l + (i / (values.length - 1)) * cW
  const y = (v: number) => pad.t + cH - ((v - vMin) / vRange) * cH

  const lastVal = values[values.length - 1]
  const isAbove = referenceLine !== undefined ? lastVal >= referenceLine : true
  const lineColor = referenceLine !== undefined ? (isAbove ? '#059669' : '#dc2626') : '#6366f1'

  const pathD = values
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)},${y(v).toFixed(1)}`)
    .join(' ')

  const areaD = [
    `M ${x(0).toFixed(1)},${(pad.t + cH).toFixed(1)}`,
    ...values.map((v, i) => `L ${x(i).toFixed(1)},${y(v).toFixed(1)}`),
    `L ${x(values.length - 1).toFixed(1)},${(pad.t + cH).toFixed(1)}`,
    'Z',
  ].join(' ')

  const refY = referenceLine !== undefined ? y(referenceLine) : null

  const yLabels = [
    { v: vMax, label: fmtV(vMax) },
    { v: (vMin + vMax) / 2, label: fmtV((vMin + vMax) / 2) },
    { v: vMin, label: fmtV(vMin) },
  ]

  const n = dates.length
  const rawIdxs = [0, Math.round(n / 4), Math.round(n / 2), Math.round(3 * n / 4), n - 1]
  const xIdxs = Array.from(new Set(rawIdxs.map(i => Math.min(i, n - 1))))
  const gradId = `g-${chartId.replace(/[^a-z0-9]/gi, '-')}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.2" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grid + Y-axis labels */}
      {yLabels.map(({ v, label }) => (
        <g key={label}>
          <line x1={pad.l} y1={y(v)} x2={W - pad.r} y2={y(v)}
            stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="4,4" />
          <text x={pad.l - 5} y={y(v) + 4} textAnchor="end"
            style={{ fontSize: '9px', fill: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>
            {label}
          </text>
        </g>
      ))}

      {/* Area fill */}
      <path d={areaD} fill={`url(#${gradId})`} />

      {/* Reference line (purchase price / initial investment) */}
      {refY !== null && (
        <>
          <line x1={pad.l} y1={refY} x2={W - pad.r} y2={refY}
            stroke={isAbove ? '#059669' : '#dc2626'}
            strokeWidth="1.5" strokeDasharray="6,4" opacity="0.75" />
          <text x={W - pad.r + 4} y={refY + 4} textAnchor="start"
            style={{ fontSize: '8px', fill: '#94a3b8' }}>
            compra
          </text>
        </>
      )}

      {/* Price line */}
      <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />

      {/* End dot */}
      <circle cx={x(values.length - 1)} cy={y(lastVal)} r="3.5" fill={lineColor} />

      {/* X-axis labels */}
      {xIdxs.map(i => (
        <text key={i} x={x(i)} y={H - 6} textAnchor="middle"
          style={{ fontSize: '9px', fill: '#94a3b8' }}>
          {fmtD(dates[i])}
        </text>
      ))}
    </svg>
  )
}

// ─── PortfolioCharts ─────────────────────────────────────────────────────────

function PortfolioCharts({ positions }: { positions: PositionWithPrice[] }) {
  const [history, setHistory] = useState<HistoryMap>({})
  const [histLoading, setHistLoading] = useState(true)
  const [selected, setSelected] = useState('portfolio')

  useEffect(() => {
    fetch('/api/portfolio/history')
      .then(r => r.json())
      .then((data: HistoryMap) => { setHistory(data); setHistLoading(false) })
      .catch(() => setHistLoading(false))
  }, [])

  // Portfolio-level USD total over time (forward-fill per ticker)
  const portfolioHistory = useMemo(() => {
    const usd = positions.filter(p => p.currency === 'USD')
    if (!usd.length) return { dates: [] as string[], values: [] as number[] }

    const dateSet = new Set<string>()
    for (const p of usd) {
      const h = history[`${p.ticker}-${p.market}`]
      if (h) h.dates.forEach(d => dateSet.add(d))
    }
    const allDates = Array.from(dateSet).sort()
    if (!allDates.length) return { dates: [] as string[], values: [] as number[] }

    const values = allDates.map(date => {
      let total = 0
      for (const p of usd) {
        const h = history[`${p.ticker}-${p.market}`]
        if (!h) continue
        let price = 0
        for (let i = 0; i < h.dates.length; i++) {
          if (h.dates[i] <= date) price = h.closes[i]
          else break
        }
        total += price * p.shares
      }
      return total
    })

    return { dates: allDates, values }
  }, [history, positions])

  const usdInitial = useMemo(() =>
    positions.filter(p => p.currency === 'USD').reduce((s, p) => s + p.purchase_price * p.shares, 0),
    [positions]
  )

  const tabs = [
    { key: 'portfolio', label: 'Portfolio' },
    ...positions.map(p => ({ key: `${p.ticker}-${p.market}`, label: p.ticker })),
  ]

  const renderChart = () => {
    if (selected === 'portfolio') {
      const { dates, values } = portfolioHistory
      if (values.length < 2) return (
        <div className="h-40 flex items-center justify-center text-on-surface-variant text-label-sm">
          Sin datos de historial disponibles
        </div>
      )
      const lastVal = values[values.length - 1]
      const pnlPct = usdInitial > 0 ? ((lastVal - usdInitial) / usdInitial * 100) : null
      return (
        <div>
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <p className="text-label-sm text-on-surface-variant">Valor total portafolio (USD)</p>
              <p className="text-title-md font-bold text-on-surface">{fmt(lastVal, 'USD')}</p>
            </div>
            {pnlPct !== null && (
              <span className={`text-title-sm font-semibold ${pnlPct >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {pnlPct >= 0 ? '▲' : '▼'} {Math.abs(pnlPct).toFixed(2)}%
              </span>
            )}
          </div>
          <LineChart chartId="portfolio" dates={dates} values={values} referenceLine={usdInitial} />
          <p className="text-[10px] text-on-surface-variant text-center mt-2">
            — — Inversión inicial: {fmt(usdInitial, 'USD')} · Solo posiciones USD
          </p>
        </div>
      )
    }

    const pos = positions.find(p => `${p.ticker}-${p.market}` === selected)
    const h = history[selected]
    if (!pos || !h) return (
      <div className="h-40 flex items-center justify-center text-on-surface-variant text-label-sm">
        Sin datos históricos para este activo
      </div>
    )

    const lastPrice = h.closes[h.closes.length - 1]
    const displayPrice = pos.current_price ?? lastPrice
    const isUp = displayPrice >= pos.purchase_price
    return (
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <p className="text-label-sm text-on-surface-variant">
              {pos.ticker} · precio por acción ({pos.currency})
            </p>
            <p className="text-title-md font-bold text-on-surface">
              {fmt(displayPrice, pos.currency)}
            </p>
          </div>
          {pos.pnl_pct !== null && (
            <span className={`text-title-sm font-semibold ${isUp ? 'text-green-600' : 'text-red-500'}`}>
              {isUp ? '▲' : '▼'} {Math.abs(pos.pnl_pct).toFixed(2)}%
            </span>
          )}
        </div>
        <LineChart chartId={selected} dates={h.dates} values={h.closes} referenceLine={pos.purchase_price} />
        <p className="text-[10px] text-on-surface-variant text-center mt-2">
          — — Precio de compra: {fmt(pos.purchase_price, pos.currency)} · {pos.shares} acciones
        </p>
      </div>
    )
  }

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden">
      {/* Tab bar */}
      <div className="flex gap-1 p-2 border-b border-outline-variant overflow-x-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {tabs.map(({ key, label }) => {
          const hasData = key === 'portfolio'
            ? portfolioHistory.values.length >= 2
            : !!history[key]
          return (
            <button key={key} onClick={() => setSelected(key)}
              disabled={!hasData}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-label-sm font-semibold transition-colors ${
                selected === key
                  ? 'bg-primary text-on-primary'
                  : hasData
                    ? 'text-on-surface-variant hover:bg-surface-container'
                    : 'text-outline-variant opacity-40 cursor-not-allowed'
              }`}>
              {label}
            </button>
          )
        })}
      </div>

      {/* Chart area */}
      <div className="p-4">
        {histLoading ? (
          <div className="h-44 flex items-center justify-center gap-2 text-on-surface-variant text-label-sm">
            <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
            Cargando historial de precios...
          </div>
        ) : renderChart()}
      </div>
    </div>
  )
}

// ─── Main PositionsTable ─────────────────────────────────────────────────────

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
      {/* Header */}
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

      {/* Price history charts */}
      {!loading && positions.length > 0 && <PortfolioCharts positions={positions} />}

      {/* Positions list */}
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
