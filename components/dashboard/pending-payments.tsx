'use client'

import { useEffect, useState } from 'react'
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'

interface PaymentItem {
  id: string; title: string; amount: number; date: string
  type: 'schedule' | 'card' | 'debt'; overdue?: boolean; color: string
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
}

function whenLabel(dateStr: string): { label: string; overdue: boolean } {
  try {
    const d = parseISO(dateStr)
    if (isToday(d)) return { label: 'Hoy', overdue: false }
    if (isTomorrow(d)) return { label: 'Mañana', overdue: false }
    if (isPast(d)) return { label: 'Vencido', overdue: true }
    return { label: format(d, "d 'de' MMM", { locale: es }), overdue: false }
  } catch { return { label: dateStr, overdue: false } }
}

const TYPE_ICON: Record<string, string> = {
  card: 'credit_card', debt: 'account_balance', schedule: 'payments',
}

export function PendingPayments() {
  const [items, setItems] = useState<PaymentItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/finanzas').then(r => r.ok ? r.json() : {}),
      fetch('/api/finanzas/projected').then(r => r.ok ? r.json() : []),
    ]).then(([raw, projected]) => {
      const result: PaymentItem[] = []

      // PaymentSchedule pending
      const schedules = (raw as Record<string, Array<{ id: string; related_name?: string; payment_type?: string; payment_amount?: number; scheduled_date?: string; status: string }>>)?.PaymentSchedule ?? []
      for (const p of schedules) {
        if (p.status === 'Paid' || p.status === 'paid') continue
        result.push({
          id: `s-${p.id}`,
          title: p.related_name || p.payment_type || 'Pago',
          amount: p.payment_amount ?? 0,
          date: (p.scheduled_date ?? '').split('T')[0],
          type: 'schedule',
          color: '#d97706',
        })
      }

      // Projected card & debt payments (next 30 days only)
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() + 30)
      for (const p of (projected as Array<{ id: string; title: string; amount: number; date: string; type: string; status: string; color: string }>) ) {
        if (p.status === 'paid') continue
        if (p.type !== 'card_payment' && p.type !== 'debt_payment') continue
        try { if (parseISO(p.date) > cutoff) continue } catch { continue }
        result.push({
          id: p.id, title: p.title, amount: p.amount, date: p.date,
          type: p.type === 'card_payment' ? 'card' : 'debt',
          color: p.color,
        })
      }

      // Sort by date, take top 6
      result.sort((a, b) => a.date.localeCompare(b.date))
      setItems(result.slice(0, 6))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const total = items.reduce((s, p) => s + p.amount, 0)

  return (
    <div className="bg-surface-container-low rounded-3xl p-6 zen-shadow h-full">
      <div className="flex justify-between items-start mb-5">
        <div>
          <span className="inline-block px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-label-sm font-semibold mb-2">PAGOS</span>
          <h2 className="text-headline-md font-bold text-on-surface">Próximos pagos</h2>
        </div>
        <Link href="/finanzas" className="text-label-sm text-on-surface-variant hover:text-primary border border-outline-variant rounded-full px-3 py-1 transition-colors">
          Ver finanzas
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <span className="material-symbols-outlined text-[24px] text-primary animate-spin">progress_activity</span>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <span className="material-symbols-outlined text-[40px] text-outline-variant mb-2">check_circle</span>
          <p className="text-label-md text-on-surface-variant">Sin pagos próximos</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {items.map(p => {
              const { label, overdue } = whenLabel(p.date)
              return (
                <div key={p.id} className={`flex items-center gap-3 p-3 rounded-2xl ${overdue ? 'bg-error/5 border border-error/20' : 'bg-white/50'}`}>
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: p.color + '20' }}>
                    <span className="material-symbols-outlined text-[14px]" style={{ color: p.color }}>{TYPE_ICON[p.type]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-label-md font-medium text-on-surface truncate">{p.title}</p>
                    <p className={`text-label-sm ${overdue ? 'text-error font-semibold' : 'text-on-surface-variant'}`}>{label}</p>
                  </div>
                  <span className={`text-label-md font-bold flex-shrink-0 ${overdue ? 'text-error' : 'text-on-surface'}`}>{fmt(p.amount)}</span>
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-outline-variant flex justify-between items-center">
            <span className="text-label-sm text-on-surface-variant">Total próximos 30 días</span>
            <span className="text-label-md font-bold text-error">{fmt(total)}</span>
          </div>
        </>
      )}
    </div>
  )
}
