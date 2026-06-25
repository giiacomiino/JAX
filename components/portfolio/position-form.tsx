'use client'

import { useState } from 'react'
import type { CreatePositionInput, Market, Currency } from '@/types'

interface PositionFormProps {
  onSubmit: (data: CreatePositionInput) => Promise<void>
  onCancel: () => void
}

export function PositionForm({ onSubmit, onCancel }: PositionFormProps) {
  const [ticker, setTicker] = useState('')
  const [market, setMarket] = useState<Market>('mx')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [shares, setShares] = useState('')
  const [alertThreshold, setAlertThreshold] = useState('10')
  const [currency, setCurrency] = useState<Currency>('MXN')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!ticker.trim() || !purchasePrice || !shares) return
    setLoading(true)
    await onSubmit({
      ticker: ticker.trim().toUpperCase(),
      market,
      purchase_price: Number(purchasePrice),
      shares: Number(shares),
      alert_threshold_pct: Number(alertThreshold),
      currency,
    })
    setLoading(false)
  }

  const inputClass = "w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"

  return (
    <form onSubmit={handleSubmit} className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 space-y-4">
      <h3 className="text-label-md font-semibold text-on-surface">Nueva posición</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-label-sm text-on-surface-variant mb-1">Ticker</label>
          <input type="text" value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} placeholder="AMXL, AAPL..." required className={inputClass} />
        </div>
        <div>
          <label className="block text-label-sm text-on-surface-variant mb-1">Mercado</label>
          <select value={market} onChange={e => { setMarket(e.target.value as Market); setCurrency(e.target.value === 'mx' ? 'MXN' : 'USD') }} className={inputClass}>
            <option value="mx">México (BMV)</option>
            <option value="usa">USA (NYSE/NASDAQ)</option>
          </select>
        </div>
        <div>
          <label className="block text-label-sm text-on-surface-variant mb-1">Precio de compra</label>
          <input type="number" step="0.01" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} required className={inputClass} />
        </div>
        <div>
          <label className="block text-label-sm text-on-surface-variant mb-1">Acciones</label>
          <input type="number" step="1" value={shares} onChange={e => setShares(e.target.value)} required className={inputClass} />
        </div>
        <div>
          <label className="block text-label-sm text-on-surface-variant mb-1">Alerta caída (%)</label>
          <input type="number" step="0.5" value={alertThreshold} onChange={e => setAlertThreshold(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-label-sm text-on-surface-variant mb-1">Moneda</label>
          <select value={currency} onChange={e => setCurrency(e.target.value as Currency)} className={inputClass}>
            <option value="MXN">MXN</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </div>
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl text-label-md text-on-surface-variant hover:bg-surface-container-high transition-colors">Cancelar</button>
        <button type="submit" disabled={loading} className="px-4 py-2 rounded-xl bg-primary text-on-primary text-label-md font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
          {loading ? 'Guardando...' : 'Agregar posición'}
        </button>
      </div>
    </form>
  )
}
