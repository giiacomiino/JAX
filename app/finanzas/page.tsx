'use client'

import { useEffect, useState } from 'react'

interface CreditCard {
  id: string; bank_name: string; card_alias: string; current_balance: number
  credit_limit: number; minimum_payment: number; payment_due_date: number
  cutoff_date: number; status: string; payment_no_interest: number
}
interface Account {
  id: string; account_name: string; account_type: string; current_balance: number
}
interface PaymentSchedule {
  id: string; related_name: string; payment_amount: number; scheduled_date: string
  status: string; payment_type: string; is_recurring: boolean
}
interface Expense {
  id: string; notes: string; amount: number; expense_date: string
  payment_method: string; accounting_month: string
}
interface Income {
  id: string; income_name: string; amount: number; income_date: string; is_recurring: boolean
}
interface Debt {
  id: string; debt_name: string; total_balance: number; monthly_payment: number
  payment_day: number; debt_type: string; interest_rate: number
}
interface SavingsGoal {
  id: string; goal_name: string; current_amount: number; target_amount: number
  target_date: string; status: string; monthly_contribution: number
}

interface FinanzasData {
  CreditCard: CreditCard[]; Account: Account[]; PaymentSchedule: PaymentSchedule[]
  Expense: Expense[]; Income: Income[]; Debt: Debt[]; SavingsGoal: SavingsGoal[]
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n ?? 0)

function Section({ icon, title, badge, children }: { icon: string; title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-container-low rounded-3xl p-6 zen-shadow space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-primary">{icon}</span>
          <h2 className="font-display text-label-lg font-semibold text-on-surface">{title}</h2>
        </div>
        {badge && <span className="text-label-md font-bold text-on-surface">{badge}</span>}
      </div>
      {children}
    </div>
  )
}

function Row({ left, sub, right, chip }: { left: string; sub?: string; right: string; chip?: { label: string; color: string } }) {
  return (
    <div className="flex items-center justify-between p-3 bg-surface rounded-2xl">
      <div>
        <p className="text-label-md font-medium text-on-surface">{left}</p>
        {sub && <p className="text-label-sm text-on-surface-variant">{sub}</p>}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-label-md font-bold text-on-surface">{right}</span>
        {chip && <span className={`text-label-sm px-2 py-0.5 rounded-full border ${chip.color}`}>{chip.label}</span>}
      </div>
    </div>
  )
}

export default function FinanzasPage() {
  const [data, setData] = useState<FinanzasData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/finanzas')
      .then(r => r.ok ? r.json() : Promise.reject('Error al cargar'))
      .then(setData)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <span className="material-symbols-outlined text-[32px] text-primary animate-spin">progress_activity</span>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <span className="material-symbols-outlined text-[48px] text-error">error</span>
      <p className="text-body-md text-on-surface-variant">{error}</p>
    </div>
  )

  if (!data) return null

  const cards = data.CreditCard ?? []
  const accounts = data.Account ?? []
  const payments = data.PaymentSchedule ?? []
  const expenses = data.Expense ?? []
  const incomes = data.Income ?? []
  const debts = data.Debt ?? []
  const goals = data.SavingsGoal ?? []

  const totalDebt = cards.reduce((s, c) => s + (c.current_balance ?? 0), 0)
  const totalCash = accounts.reduce((s, a) => s + (a.current_balance ?? 0), 0)
  const pendingPayments = payments.filter(p => p.status !== 'Paid' && p.status !== 'paid')
  const monthExpenses = expenses.reduce((s, e) => s + (e.amount ?? 0), 0)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-display-sm font-bold text-on-surface">Finanzas</h1>
        <p className="text-on-surface-variant text-label-md mt-1">Conectado a FinWise</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: 'account_balance', label: 'Efectivo', value: fmt(totalCash), color: 'text-primary' },
          { icon: 'credit_card', label: 'Deuda tarjetas', value: fmt(totalDebt), color: 'text-error' },
          { icon: 'payments', label: 'Pagos pendientes', value: pendingPayments.length.toString(), color: 'text-secondary' },
          { icon: 'receipt_long', label: 'Total gastos', value: fmt(monthExpenses), color: 'text-on-surface' },
        ].map(stat => (
          <div key={stat.label} className="bg-surface-container-low rounded-2xl p-4 zen-shadow">
            <span className={`material-symbols-outlined text-[20px] ${stat.color}`}>{stat.icon}</span>
            <p className={`font-display text-title-lg font-bold mt-2 ${stat.color}`}>{stat.value}</p>
            <p className="text-label-sm text-on-surface-variant mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tarjetas */}
      {cards.length > 0 && (
        <Section icon="credit_card" title="Tarjetas de crédito" badge={fmt(totalDebt)}>
          <div className="space-y-2">
            {cards.map(c => {
              const pct = c.credit_limit > 0 ? (c.current_balance / c.credit_limit) * 100 : 0
              return (
                <div key={c.id} className="p-3 bg-surface rounded-2xl space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-label-md font-medium text-on-surface">{c.card_alias || c.bank_name}</p>
                      <p className="text-label-sm text-on-surface-variant">Corte día {c.cutoff_date} · Pago día {c.payment_due_date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-label-md font-bold text-on-surface">{fmt(c.current_balance)}</p>
                      <p className="text-label-sm text-on-surface-variant">de {fmt(c.credit_limit)}</p>
                    </div>
                  </div>
                  <div className="w-full bg-surface-container-high rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${pct > 80 ? 'bg-error' : pct > 50 ? 'bg-secondary' : 'bg-primary'}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* Pagos programados */}
      {payments.length > 0 && (
        <Section icon="schedule" title="Pagos programados" badge={`${pendingPayments.length} pendientes`}>
          <div className="space-y-2">
            {payments.map(p => (
              <Row
                key={p.id}
                left={p.related_name || p.payment_type || 'Pago'}
                sub={p.scheduled_date}
                right={fmt(p.payment_amount)}
                chip={p.status === 'Paid' || p.status === 'paid'
                  ? { label: 'Pagado', color: 'bg-surface-container text-on-surface-variant border-outline-variant' }
                  : { label: 'Pendiente', color: 'bg-primary/10 text-primary border-primary/20' }}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Cuentas */}
      {accounts.length > 0 && (
        <Section icon="account_balance" title="Cuentas" badge={fmt(totalCash)}>
          <div className="space-y-2">
            {accounts.map(a => (
              <Row key={a.id} left={a.account_name} sub={a.account_type} right={fmt(a.current_balance)} />
            ))}
          </div>
        </Section>
      )}

      {/* Ingresos */}
      {incomes.length > 0 && (
        <Section icon="trending_up" title="Ingresos" badge={fmt(incomes.reduce((s, i) => s + (i.amount ?? 0), 0))}>
          <div className="space-y-2">
            {incomes.slice(0, 10).map(i => (
              <Row
                key={i.id}
                left={i.income_name || 'Ingreso'}
                sub={i.income_date}
                right={fmt(i.amount)}
                chip={i.is_recurring ? { label: 'Recurrente', color: 'bg-primary/10 text-primary border-primary/20' } : undefined}
              />
            ))}
            {incomes.length > 10 && (
              <p className="text-label-sm text-on-surface-variant text-center pt-1">+{incomes.length - 10} más</p>
            )}
          </div>
        </Section>
      )}

      {/* Gastos */}
      {expenses.length > 0 && (
        <Section icon="receipt_long" title="Gastos" badge={fmt(monthExpenses)}>
          <div className="space-y-2">
            {expenses.slice(0, 15).map(e => (
              <Row
                key={e.id}
                left={e.notes || 'Gasto'}
                sub={`${e.expense_date}${e.payment_method ? ' · ' + e.payment_method : ''}`}
                right={fmt(e.amount)}
              />
            ))}
            {expenses.length > 15 && (
              <p className="text-label-sm text-on-surface-variant text-center pt-1">+{expenses.length - 15} más</p>
            )}
          </div>
        </Section>
      )}

      {/* Deudas */}
      {debts.length > 0 && (
        <Section icon="money_off" title="Deudas">
          <div className="space-y-2">
            {debts.map(d => (
              <Row
                key={d.id}
                left={d.debt_name}
                sub={`Pago día ${d.payment_day} · ${d.debt_type}`}
                right={fmt(d.total_balance)}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Metas */}
      {goals.length > 0 && (
        <Section icon="savings" title="Metas de ahorro">
          <div className="space-y-3">
            {goals.map(g => {
              const pct = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0
              return (
                <div key={g.id} className="p-3 bg-surface rounded-2xl space-y-2">
                  <div className="flex justify-between">
                    <p className="text-label-md font-medium text-on-surface">{g.goal_name}</p>
                    <p className="text-label-md font-bold text-primary">{Math.round(pct)}%</p>
                  </div>
                  <div className="w-full bg-surface-container-high rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-label-sm text-on-surface-variant">
                    <span>{fmt(g.current_amount)}</span>
                    <span>Meta: {fmt(g.target_amount)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </Section>
      )}
    </div>
  )
}
