'use client'

import { useEffect, useState } from 'react'
import { format, isToday, isTomorrow } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import type { FinanzasData } from '@/types'

function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
}

export function PendingPayments() {
  const [data, setData] = useState<FinanzasData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/finanzas')
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  const upcoming = data?.payments
    .filter(p => p.status !== 'Paid')
    .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
    .slice(0, 4) ?? []

  const total = upcoming.reduce((s, p) => s + p.amount, 0)

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-label-md font-semibold text-on-surface">Pagos pendientes</h2>
        <Link href="/finanzas" className="text-label-sm text-primary hover:underline">Ver finanzas</Link>
      </div>
      {loading ? (
        <p className="text-label-md text-on-surface-variant">Cargando...</p>
      ) : upcoming.length === 0 ? (
        <p className="text-label-md text-on-surface-variant">Sin pagos pendientes</p>
      ) : (
        <>
          <div className="space-y-2">
            {upcoming.map(p => {
              const date = new Date(p.scheduled_date)
              const when = isToday(date) ? 'Hoy' : isTomorrow(date) ? 'Mañana' : format(date, 'd MMM', { locale: es })
              return (
                <div key={p.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-label-md text-on-surface truncate max-w-[180px]">{p.description}</p>
                    <p className={`text-label-sm ${p.status === 'Overdue' ? 'text-error' : 'text-on-surface-variant'}`}>{when}</p>
                  </div>
                  <span className="text-label-md font-semibold text-on-surface">{fmt(p.amount)}</span>
                </div>
              )
            })}
          </div>
          <div className="pt-2 border-t border-outline-variant flex justify-between">
            <span className="text-label-sm text-on-surface-variant">Total pendiente</span>
            <span className="text-label-md font-bold text-error">{fmt(total)}</span>
          </div>
        </>
      )}
    </div>
  )
}
