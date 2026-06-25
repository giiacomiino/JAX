'use client'

import { useEffect, useState } from 'react'
import { format, isToday, isTomorrow } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'

interface Payment { description: string; amount: number; scheduled_date: string; status: string }

function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
}

export function PendingPayments() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/finanzas')
      .then(r => r.ok ? r.json() : {})
      .then((data: Record<string, Payment[]>) => {
        const raw = data?.PaymentSchedule ?? []
        const pending = raw
          .filter((p: Payment) => p.status !== 'Paid')
          .sort((a: Payment, b: Payment) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
          .slice(0, 4)
        setPayments(pending)
        setLoading(false)
      })
  }, [])

  const total = payments.reduce((s, p) => s + p.amount, 0)

  return (
    <div className="bg-surface-container-low rounded-3xl p-8 zen-shadow">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-headline-md font-bold text-on-surface">Pagos pendientes</h2>
        <Link href="/finanzas" className="text-label-sm text-on-surface-variant hover:text-primary transition-colors">Ver finanzas</Link>
      </div>

      {loading ? (
        <p className="text-label-md text-on-surface-variant">Cargando...</p>
      ) : payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <span className="material-symbols-outlined text-[40px] text-outline-variant mb-2">payments</span>
          <p className="text-body-md text-on-surface-variant">Sin pagos pendientes</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {payments.map((p, i) => {
              const date = new Date(p.scheduled_date)
              const when = isToday(date) ? 'Hoy' : isTomorrow(date) ? 'Mañana' : format(date, 'd MMM', { locale: es })
              const isOverdue = p.status === 'Overdue'
              return (
                <div key={i} className="flex items-center justify-between p-3 bg-white/50 rounded-2xl">
                  <div>
                    <p className="text-label-md font-medium text-on-surface">{p.description}</p>
                    <p className={`text-label-sm ${isOverdue ? 'text-error' : 'text-on-surface-variant'}`}>{when}</p>
                  </div>
                  <span className="text-label-md font-bold text-on-surface">{fmt(p.amount)}</span>
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-outline-variant flex justify-between items-center">
            <span className="text-label-sm text-on-surface-variant">Total pendiente</span>
            <span className="text-body-md font-bold text-error">{fmt(total)}</span>
          </div>
        </>
      )}
    </div>
  )
}
