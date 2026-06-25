'use client'

import { useEffect, useState } from 'react'

interface RawFinanzas {
  PaymentSchedule: { description: string; amount: number; scheduled_date: string; status: string }[]
  Expense: { description?: string; amount: number; date: string; category?: string }[]
  RecurringExpense: { description?: string; amount: number; frequency?: string }[]
  Category: { name: string }[]
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
}

export default function FinanzasPage() {
  const [data, setData] = useState<RawFinanzas | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/finanzas')
      .then(r => r.ok ? r.json() : Promise.reject('Error al cargar'))
      .then(setData)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  const isEmpty = data && Object.values(data).every(arr => arr.length === 0)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-headline-lg font-bold text-on-surface">Finanzas</h1>
        <p className="text-on-surface-variant text-label-md mt-1">Datos desde base44</p>
      </div>

      {loading && <div className="text-center py-12 text-on-surface-variant text-label-md">Cargando datos...</div>}
      {error && <div className="text-center py-12 text-error text-label-md">{error}</div>}

      {data && isEmpty && (
        <div className="text-center py-16 bg-surface-container-low rounded-3xl zen-shadow">
          <span className="material-symbols-outlined text-[48px] text-outline-variant mb-3 block">account_balance_wallet</span>
          <p className="text-body-lg text-on-surface-variant">Sin datos en base44 todavía</p>
          <p className="text-label-md text-on-surface-variant mt-1">Agrega datos en tu app de base44 y aparecerán aquí</p>
        </div>
      )}

      {data && !isEmpty && (
        <div className="space-y-8">
          {data.PaymentSchedule.length > 0 && (
            <div className="bg-surface-container-low rounded-3xl p-8 zen-shadow space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-headline-md font-bold text-on-surface">Pagos programados</h2>
                <span className="text-label-md font-bold text-error">
                  {fmt(data.PaymentSchedule.filter(p => p.status !== 'Paid').reduce((s, p) => s + p.amount, 0))}
                </span>
              </div>
              <div className="space-y-2">
                {data.PaymentSchedule.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-white/50 rounded-2xl">
                    <div>
                      <p className="text-label-md font-medium text-on-surface">{p.description}</p>
                      <p className="text-label-sm text-on-surface-variant">{p.scheduled_date}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-body-md font-bold text-on-surface">{fmt(p.amount)}</span>
                      <span className={`text-label-sm px-2 py-0.5 rounded-full border ${
                        p.status === 'Overdue' ? 'bg-error/10 text-error border-error/20' :
                        p.status === 'Paid' ? 'bg-surface-container text-on-surface-variant border-outline-variant' :
                        'bg-primary/10 text-primary border-primary/20'
                      }`}>
                        {p.status === 'Paid' ? 'Pagado' : p.status === 'Overdue' ? 'Vencido' : 'Pendiente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.Expense.length > 0 && (
            <div className="bg-surface-container-low rounded-3xl p-8 zen-shadow space-y-4">
              <h2 className="text-headline-md font-bold text-on-surface">Gastos</h2>
              <div className="space-y-2">
                {data.Expense.slice(0, 10).map((e, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-white/50 rounded-2xl">
                    <div>
                      <p className="text-label-md font-medium text-on-surface">{e.description ?? 'Gasto'}</p>
                      <p className="text-label-sm text-on-surface-variant">{e.date} {e.category ? `· ${e.category}` : ''}</p>
                    </div>
                    <span className="text-body-md font-bold text-on-surface">{fmt(e.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.RecurringExpense.length > 0 && (
            <div className="bg-surface-container-low rounded-3xl p-8 zen-shadow space-y-4">
              <h2 className="text-headline-md font-bold text-on-surface">Gastos recurrentes</h2>
              <div className="space-y-2">
                {data.RecurringExpense.map((e, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-white/50 rounded-2xl">
                    <div>
                      <p className="text-label-md font-medium text-on-surface">{e.description ?? 'Recurrente'}</p>
                      {e.frequency && <p className="text-label-sm text-on-surface-variant">{e.frequency}</p>}
                    </div>
                    <span className="text-body-md font-bold text-on-surface">{fmt(e.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
