'use client'

import { useEffect, useState } from 'react'
import { format, parseISO, isAfter } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'

interface CardItem {
  id: string
  alias: string
  bank: string
  balance: number
  minimum: number
  cutDate?: string    // fecha de corte (ISO string or day-of-month number)
  dueDate?: number   // día del mes de pago
  color: string
}

interface DebtItem {
  id: string
  name: string
  payment: number
  payDay?: number
  color: string
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n ?? 0)

function nextOccurrence(dayOfMonth: number): Date {
  const today = new Date()
  const candidate = new Date(today.getFullYear(), today.getMonth(), dayOfMonth)
  if (isAfter(candidate, today) || candidate.toDateString() === today.toDateString()) return candidate
  return new Date(today.getFullYear(), today.getMonth() + 1, dayOfMonth)
}

export function PendingPayments() {
  const [cards, setCards] = useState<CardItem[]>([])
  const [debts, setDebts] = useState<DebtItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/finanzas')
      .then(r => r.ok ? r.json() : {})
      .then((raw: Record<string, unknown[]>) => {
        // Credit cards
        const rawCards = (raw.CreditCard ?? []) as Array<{
          id: string; card_alias?: string; bank_name?: string
          current_balance?: number; minimum_payment?: number
          cut_date?: string | number; payment_due_date?: number
        }>
        setCards(rawCards
          .filter(c => (c.current_balance ?? 0) > 0)
          .map((c, i) => ({
            id: c.id,
            alias: c.card_alias ?? c.bank_name ?? `Tarjeta ${i + 1}`,
            bank: c.bank_name ?? '',
            balance: c.current_balance ?? 0,
            minimum: c.minimum_payment ?? 0,
            cutDate: c.cut_date != null ? String(c.cut_date) : undefined,
            dueDate: c.payment_due_date,
            color: ['#dc2626', '#9333ea', '#0891b2', '#d97706'][i % 4],
          }))
          .sort((a, b) => b.balance - a.balance)
        )

        // Debts with upcoming payment
        const rawDebts = (raw.Debt ?? []) as Array<{
          id: string; debt_name?: string; monthly_payment?: number; payment_day?: number
        }>
        setDebts(rawDebts
          .filter(d => (d.monthly_payment ?? 0) > 0)
          .map((d, i) => ({
            id: d.id,
            name: d.debt_name ?? `Deuda ${i + 1}`,
            payment: d.monthly_payment ?? 0,
            payDay: d.payment_day,
            color: ['#7c3aed', '#0f766e', '#c2410c', '#1d4ed8'][i % 4],
          }))
        )

        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const totalCards = cards.reduce((s, c) => s + c.balance, 0)
  const totalMin = cards.reduce((s, c) => s + c.minimum, 0)

  return (
    <div className="bg-surface-container-low rounded-3xl p-6 zen-shadow h-full flex flex-col">
      <div className="flex justify-between items-start mb-5">
        <div>
          <span className="inline-block px-3 py-1 bg-red-100 text-red-700 rounded-full text-label-sm font-semibold mb-2">TARJETAS</span>
          <h2 className="text-headline-md font-bold text-on-surface">Saldo por corte</h2>
        </div>
        <Link href="/finanzas" className="text-label-sm text-on-surface-variant hover:text-primary border border-outline-variant rounded-full px-3 py-1 transition-colors">
          Ver finanzas
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <span className="material-symbols-outlined text-[24px] text-primary animate-spin">progress_activity</span>
        </div>
      ) : cards.length === 0 && debts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center flex-1">
          <span className="material-symbols-outlined text-[40px] text-outline-variant mb-2">credit_score</span>
          <p className="text-label-md text-on-surface-variant">Sin saldos pendientes</p>
        </div>
      ) : (
        <div className="space-y-4 flex-1">
          {/* Tarjetas de crédito */}
          {cards.map(card => {
            const dueNext = card.dueDate ? nextOccurrence(card.dueDate) : null
            const cutLabel = (() => {
              if (!card.cutDate) return null
              const n = Number(card.cutDate)
              if (!isNaN(n) && n > 0 && n <= 31) {
                const next = nextOccurrence(n)
                return `Corte ${format(next, "d MMM", { locale: es })}`
              }
              try { return `Corte ${format(parseISO(card.cutDate), "d MMM", { locale: es })}` }
              catch { return null }
            })()
            return (
              <div key={card.id} className="p-3 rounded-2xl border border-outline-variant bg-white/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: card.color + '20' }}>
                      <span className="material-symbols-outlined text-[13px]" style={{ color: card.color }}>credit_card</span>
                    </div>
                    <span className="text-label-md font-semibold text-on-surface">{card.alias}</span>
                  </div>
                  <span className="text-label-md font-bold" style={{ color: card.color }}>{fmt(card.balance)}</span>
                </div>
                <div className="flex items-center justify-between text-label-sm text-on-surface-variant pl-8">
                  <div className="flex gap-3">
                    {cutLabel && <span>{cutLabel}</span>}
                    {dueNext && <span>Pago {format(dueNext, "d MMM", { locale: es })}</span>}
                  </div>
                  {card.minimum > 0 && (
                    <span className="text-amber-600 font-medium">mín {fmt(card.minimum)}</span>
                  )}
                </div>
              </div>
            )
          })}

          {/* Deudas */}
          {debts.length > 0 && (
            <div className="space-y-2">
              <p className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wide">Deudas mensuales</p>
              {debts.map(debt => {
                const next = debt.payDay ? nextOccurrence(debt.payDay) : null
                return (
                  <div key={debt.id} className="flex items-center justify-between p-3 rounded-xl bg-white/30">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[15px]" style={{ color: debt.color }}>account_balance</span>
                      <div>
                        <p className="text-label-md text-on-surface">{debt.name}</p>
                        {next && <p className="text-label-sm text-on-surface-variant">{format(next, "d 'de' MMM", { locale: es })}</p>}
                      </div>
                    </div>
                    <span className="text-label-md font-bold" style={{ color: debt.color }}>{fmt(debt.payment)}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Totales */}
          {totalCards > 0 && (
            <div className="pt-3 border-t border-outline-variant space-y-1">
              <div className="flex justify-between text-label-sm">
                <span className="text-on-surface-variant">Total saldo tarjetas</span>
                <span className="font-bold text-error">{fmt(totalCards)}</span>
              </div>
              {totalMin > 0 && (
                <div className="flex justify-between text-label-sm">
                  <span className="text-on-surface-variant">Pagos mínimos</span>
                  <span className="font-semibold text-amber-600">{fmt(totalMin)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
