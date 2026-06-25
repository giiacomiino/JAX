'use client'

import { useEffect, useState, useMemo } from 'react'
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, subMonths, addMonths } from 'date-fns'
import { es } from 'date-fns/locale'

// ─── Types ───────────────────────────────────────────────────────────────────
interface CreditCard {
  id: string; bank_name: string; card_alias: string; current_balance: number
  credit_limit: number; minimum_payment: number; payment_due_date: number
  cutoff_date: number; status: string; payment_no_interest: number
}
interface Account { id: string; account_name: string; account_type: string; current_balance: number; currency?: string }
interface PaymentSchedule {
  id: string; related_name: string; payment_amount: number; scheduled_date: string
  status: string; payment_type: string; is_recurring: boolean
}
interface Expense {
  id: string; notes: string; amount: number; expense_date: string
  payment_method: string; accounting_month: string
  category?: string; expense_category?: string; is_virtual?: boolean; expense_type?: string
}
interface Income { id: string; income_name: string; amount: number; income_date: string; is_recurring: boolean; is_virtual?: boolean }
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

type Tab = 'resumen' | 'tarjetas' | 'pagos' | 'flujo' | 'metas'

// ─── Formatters ──────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n ?? 0)

const fmtMonth = (d: Date) => format(d, 'MMM yyyy', { locale: es })

// ─── Charts ──────────────────────────────────────────────────────────────────
function DonutChart({ pct, color, size = 100, label }: { pct: number; color: string; size?: number; label?: string }) {
  const r = size * 0.38; const cx = size / 2; const cy = size / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e8eaf0" strokeWidth={size * 0.1} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={size * 0.1}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      </svg>
      {label && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display font-extrabold text-on-surface" style={{ fontSize: size * 0.18 }}>{Math.round(pct)}%</span>
          {label && <span className="text-on-surface-variant" style={{ fontSize: size * 0.1 }}>{label}</span>}
        </div>
      )}
    </div>
  )
}

function BarPair({ income, expense, maxVal, label }: { income: number; expense: number; maxVal: number; label: string }) {
  const hi = maxVal > 0 ? (income / maxVal) * 100 : 0
  const he = maxVal > 0 ? (expense / maxVal) * 100 : 0
  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
      <div className="flex gap-0.5 items-end h-20 w-full">
        <div className="flex-1 rounded-t transition-all" style={{ height: `${Math.max(hi, 2)}%`, backgroundColor: '#059669' }} />
        <div className="flex-1 rounded-t transition-all" style={{ height: `${Math.max(he, 2)}%`, backgroundColor: '#dc2626' }} />
      </div>
      <span className="text-[10px] text-on-surface-variant truncate w-full text-center">{label}</span>
    </div>
  )
}

function HBarChart({ items, color = '#0058bc' }: { items: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(...items.map(i => i.value), 1)
  return (
    <div className="space-y-2">
      {items.map(item => (
        <div key={item.label} className="space-y-0.5">
          <div className="flex justify-between text-label-sm">
            <span className="text-on-surface truncate max-w-[60%]">{item.label}</span>
            <span className="text-on-surface-variant ml-2">{fmt(item.value)}</span>
          </div>
          <div className="w-full bg-surface-container-high rounded-full h-1.5">
            <div className="h-1.5 rounded-full transition-all" style={{ width: `${(item.value / max) * 100}%`, backgroundColor: color }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function FinanzasPage() {
  const [data, setData] = useState<FinanzasData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('resumen')
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'paid' | 'recurring'>('all')

  useEffect(() => {
    fetch('/api/finanzas')
      .then(r => r.ok ? r.json() : Promise.reject('Error al cargar'))
      .then(setData)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  const cards = useMemo(() => data?.CreditCard ?? [], [data])
  const accounts = useMemo(() => data?.Account ?? [], [data])
  const payments = useMemo(() => data?.PaymentSchedule ?? [], [data])
  const expenses = useMemo(() => data?.Expense ?? [], [data])
  const incomes = useMemo(() => data?.Income ?? [], [data])
  const debts = useMemo(() => data?.Debt ?? [], [data])
  const goals = useMemo(() => data?.SavingsGoal ?? [], [data])

  // KPIs — liquidez = solo cuentas de débito (no ahorro, no efectivo)
  const debitAccounts = useMemo(() =>
    accounts.filter(a => {
      const t = (a.account_type ?? '').toLowerCase()
      return t.includes('debit') || t.includes('débito') || t.includes('checking') || t === 'debit'
    }), [accounts])
  const totalCash = useMemo(() => debitAccounts.reduce((s, a) => s + (a.current_balance ?? 0), 0), [debitAccounts])
  const totalSavings = useMemo(() => accounts.filter(a => {
    const t = (a.account_type ?? '').toLowerCase()
    return t.includes('saving') || t.includes('ahorro')
  }).reduce((s, a) => s + (a.current_balance ?? 0), 0), [accounts])
  const totalCardDebt = useMemo(() => cards.reduce((s, c) => s + (c.current_balance ?? 0), 0), [cards])
  const totalDebt = useMemo(() => debts.reduce((s, d) => s + (d.total_balance ?? 0), 0), [debts])
  const netBalance = totalCash - totalCardDebt

  // Virtual expense helpers
  const isVirtual = (e: Expense) =>
    e.is_virtual === true ||
    (e.expense_type ?? '').toLowerCase().includes('virtual') ||
    (e.category ?? '').toLowerCase().includes('virtual') ||
    (e.expense_category ?? '').toLowerCase().includes('virtual')

  // Monthly filter
  const monthStart = startOfMonth(selectedMonth)
  const monthEnd = endOfMonth(selectedMonth)
  const inMonth = (dateStr: string) => {
    try { return isWithinInterval(parseISO(dateStr), { start: monthStart, end: monthEnd }) }
    catch { return false }
  }

  const monthExpenses = useMemo(() =>
    expenses.filter(e => inMonth(e.expense_date || e.accounting_month?.split('-').slice(0, 2).join('-') + '-01')),
    [expenses, selectedMonth] // eslint-disable-line react-hooks/exhaustive-deps
  )
  const monthIncomes = useMemo(() =>
    incomes.filter(i => inMonth(i.income_date)),
    [incomes, selectedMonth] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const totalMonthExpenses = monthExpenses.reduce((s, e) => s + (e.amount ?? 0), 0)
  const totalMonthIncomes = monthIncomes.reduce((s, i) => s + (i.amount ?? 0), 0)

  // Cash flow: last 6 months
  const cashFlow = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const m = subMonths(new Date(), 5 - i)
      const ms = startOfMonth(m); const me = endOfMonth(m)
      const inM = (d: string) => { try { return isWithinInterval(parseISO(d), { start: ms, end: me }) } catch { return false } }
      return {
        label: format(m, 'MMM', { locale: es }),
        income: incomes.filter(i => inM(i.income_date)).reduce((s, i) => s + (i.amount ?? 0), 0),
        expense: expenses.filter(e => inM(e.expense_date)).reduce((s, e) => s + (e.amount ?? 0), 0),
      }
    })
  }, [incomes, expenses])

  const maxCashFlow = useMemo(() => Math.max(...cashFlow.map(m => Math.max(m.income, m.expense)), 1), [cashFlow])

  // Expense by method
  const byMethod = useMemo(() => {
    const map: Record<string, number> = {}
    for (const e of monthExpenses) {
      const key = e.payment_method || 'Sin especificar'
      map[key] = (map[key] ?? 0) + (e.amount ?? 0)
    }
    return Object.entries(map).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6)
  }, [monthExpenses])

  // Filtered payments
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (paymentFilter === 'pending') return p.status !== 'Paid' && p.status !== 'paid'
      if (paymentFilter === 'paid') return p.status === 'Paid' || p.status === 'paid'
      if (paymentFilter === 'recurring') return p.is_recurring
      return true
    }).sort((a, b) => (a.scheduled_date ?? '').localeCompare(b.scheduled_date ?? ''))
  }, [payments, paymentFilter])

  const pendingTotal = useMemo(() =>
    payments.filter(p => p.status !== 'Paid' && p.status !== 'paid')
      .reduce((s, p) => s + (p.payment_amount ?? 0), 0),
    [payments]
  )

  if (loading) return <div className="flex justify-center py-24"><span className="material-symbols-outlined text-[32px] text-primary animate-spin">progress_activity</span></div>
  if (error) return <div className="text-center py-24 text-error">{error}</div>
  if (!data) return null

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'resumen', label: 'Resumen', icon: 'dashboard' },
    { key: 'tarjetas', label: 'Tarjetas', icon: 'credit_card' },
    { key: 'pagos', label: 'Pagos', icon: 'schedule' },
    { key: 'flujo', label: 'Flujo', icon: 'show_chart' },
    { key: 'metas', label: 'Metas', icon: 'savings' },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-display-sm font-extrabold text-on-surface" style={{ letterSpacing: '-0.03em' }}>Finanzas</h1>
          <p className="text-label-md text-on-surface-variant mt-1">Sincronizado con FinWise</p>
        </div>
        {/* Month selector */}
        <div className="flex items-center gap-1 bg-surface border border-outline-variant rounded-xl p-1">
          <button onClick={() => setSelectedMonth(d => subMonths(d, 1))} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors">
            <span className="material-symbols-outlined text-[16px]">chevron_left</span>
          </button>
          <span className="text-label-md font-semibold text-on-surface px-2 capitalize min-w-[88px] text-center">{fmtMonth(selectedMonth)}</span>
          <button onClick={() => setSelectedMonth(d => addMonths(d, 1))} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors">
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-surface rounded-2xl border border-outline-variant p-4 zen-shadow">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3 bg-green-50">
            <span className="material-symbols-outlined text-[18px] text-green-600">account_balance_wallet</span>
          </div>
          <p className="font-display font-extrabold text-title-lg text-green-600">{fmt(totalCash)}</p>
          <p className="text-label-sm text-on-surface-variant mt-0.5">Liquidez (débito)</p>
          {totalSavings > 0 && <p className="text-label-sm text-on-surface-variant/60 mt-0.5">+{fmt(totalSavings)} ahorros</p>}
        </div>
        <div className="bg-surface rounded-2xl border border-outline-variant p-4 zen-shadow">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3 bg-red-50">
            <span className="material-symbols-outlined text-[18px] text-red-600">credit_card</span>
          </div>
          <p className="font-display font-extrabold text-title-lg text-red-600">{fmt(totalCardDebt)}</p>
          <p className="text-label-sm text-on-surface-variant mt-0.5">Deuda tarjetas</p>
        </div>
        <div className="bg-surface rounded-2xl border border-outline-variant p-4 zen-shadow">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: netBalance >= 0 ? '#0058bc15' : '#dc262615' }}>
            <span className="material-symbols-outlined text-[18px]" style={{ color: netBalance >= 0 ? '#0058bc' : '#dc2626' }}>balance</span>
          </div>
          <p className="font-display font-extrabold text-title-lg" style={{ color: netBalance >= 0 ? '#0058bc' : '#dc2626' }}>{fmt(netBalance)}</p>
          <p className="text-label-sm text-on-surface-variant mt-0.5">Balance neto</p>
        </div>
        <div className="bg-surface rounded-2xl border border-outline-variant p-4 zen-shadow">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3 bg-amber-50">
            <span className="material-symbols-outlined text-[18px] text-amber-600">payments</span>
          </div>
          <p className="font-display font-extrabold text-title-lg text-amber-600">{fmt(pendingTotal)}</p>
          <p className="text-label-sm text-on-surface-variant mt-0.5">Pagos pendientes</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-container rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 flex-1 min-w-fit py-2 px-3 rounded-lg text-label-md font-semibold transition-all whitespace-nowrap ${tab === t.key ? 'bg-surface text-on-surface zen-shadow' : 'text-on-surface-variant hover:text-on-surface'}`}>
            <span className="material-symbols-outlined text-[15px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── RESUMEN ── */}
      {tab === 'resumen' && (
        <div className="space-y-5">
          {/* Month summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-surface rounded-2xl border border-outline-variant p-5 zen-shadow">
              <p className="text-label-sm text-on-surface-variant">Ingresos del mes</p>
              <p className="font-display font-extrabold text-headline-md text-green-600 mt-1">{fmt(totalMonthIncomes)}</p>
              <p className="text-label-sm text-on-surface-variant mt-1">{monthIncomes.length} movimientos</p>
            </div>
            <div className="bg-surface rounded-2xl border border-outline-variant p-5 zen-shadow">
              <p className="text-label-sm text-on-surface-variant">Gastos del mes</p>
              <p className="font-display font-extrabold text-headline-md text-red-600 mt-1">{fmt(totalMonthExpenses)}</p>
              <p className="text-label-sm text-on-surface-variant mt-1">{monthExpenses.length} movimientos</p>
            </div>
            <div className="bg-surface rounded-2xl border border-outline-variant p-5 zen-shadow">
              <p className="text-label-sm text-on-surface-variant">Resultado del mes</p>
              <p className={`font-display font-extrabold text-headline-md mt-1 ${totalMonthIncomes - totalMonthExpenses >= 0 ? 'text-primary' : 'text-error'}`}>
                {fmt(totalMonthIncomes - totalMonthExpenses)}
              </p>
              <p className="text-label-sm text-on-surface-variant mt-1">{totalMonthIncomes > 0 ? `${Math.round((totalMonthExpenses / totalMonthIncomes) * 100)}% gastado` : '—'}</p>
            </div>
          </div>

          {/* Cash flow chart */}
          <div className="bg-surface rounded-2xl border border-outline-variant p-5 zen-shadow">
            <p className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wide mb-4">Flujo de caja — últimos 6 meses</p>
            <div className="flex items-end gap-2 h-28 mb-2">
              {cashFlow.map(m => <BarPair key={m.label} income={m.income} expense={m.expense} maxVal={maxCashFlow} label={m.label} />)}
            </div>
            <div className="flex gap-4 justify-center">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-green-600" /><span className="text-label-sm text-on-surface-variant">Ingresos</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-red-600" /><span className="text-label-sm text-on-surface-variant">Gastos</span></div>
            </div>
          </div>

          {/* Gasto por método */}
          {byMethod.length > 0 && (
            <div className="bg-surface rounded-2xl border border-outline-variant p-5 zen-shadow">
              <p className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wide mb-4">Gastos por método de pago</p>
              <HBarChart items={byMethod} color="#0058bc" />
            </div>
          )}

          {/* Top gastos del mes */}
          {monthExpenses.length > 0 && (
            <div className="bg-surface rounded-2xl border border-outline-variant p-5 zen-shadow">
              <p className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wide mb-4">Top gastos del mes</p>
              <div className="space-y-2">
                {[...monthExpenses].sort((a, b) => b.amount - a.amount).slice(0, 8).map(e => {
                  const virtual = isVirtual(e)
                  const cat = e.category || e.expense_category || e.payment_method || ''
                  return (
                    <div key={e.id} className={`flex items-center justify-between p-3 rounded-xl ${virtual ? 'bg-amber-50 border border-amber-100' : 'bg-surface-container'}`}>
                      <div className="flex items-center gap-2">
                        {virtual && <span className="material-symbols-outlined text-[14px] text-amber-500">swap_horiz</span>}
                        <div>
                          <p className="text-label-md text-on-surface">{e.notes || 'Gasto'}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {cat && <span className="text-label-sm px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant">{cat}</span>}
                            <span className="text-label-sm text-on-surface-variant">{e.expense_date}</span>
                          </div>
                        </div>
                      </div>
                      <p className={`text-label-md font-bold ${virtual ? 'text-amber-600' : 'text-error'}`}>
                        {virtual ? '±' : '-'}{fmt(e.amount)}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TARJETAS ── */}
      {tab === 'tarjetas' && (
        <div className="space-y-5">
          {cards.length === 0 ? (
            <div className="text-center py-16 text-on-surface-variant">Sin tarjetas registradas</div>
          ) : (
            <>
              {cards.map(c => {
                const pct = c.credit_limit > 0 ? (c.current_balance / c.credit_limit) * 100 : 0
                const color = pct > 80 ? '#dc2626' : pct > 50 ? '#d97706' : '#059669'
                const available = (c.credit_limit ?? 0) - (c.current_balance ?? 0)
                const now = new Date()
                const cutDay = c.cutoff_date ?? 0
                const dueDay = c.payment_due_date ?? 0
                const nextCut = new Date(now.getFullYear(), now.getMonth(), cutDay)
                if (nextCut < now) nextCut.setMonth(nextCut.getMonth() + 1)
                const nextDue = new Date(now.getFullYear(), now.getMonth(), dueDay)
                if (nextDue < now) nextDue.setMonth(nextDue.getMonth() + 1)
                const daysToPayment = Math.ceil((nextDue.getTime() - now.getTime()) / 86400000)

                return (
                  <div key={c.id} className="bg-surface rounded-2xl border border-outline-variant p-6 zen-shadow">
                    <div className="flex items-start gap-6">
                      {/* Donut */}
                      <div className="flex-shrink-0">
                        <DonutChart pct={Math.min(pct, 100)} color={color} size={110} label="uso" />
                      </div>
                      {/* Info */}
                      <div className="flex-1 space-y-3">
                        <div>
                          <h3 className="font-display font-extrabold text-body-lg text-on-surface">{c.card_alias || c.bank_name}</h3>
                          <p className="text-label-sm text-on-surface-variant">{c.bank_name}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <p className="text-label-sm text-on-surface-variant">Saldo actual</p>
                            <p className="font-display font-bold text-title-md text-on-surface mt-0.5">{fmt(c.current_balance)}</p>
                          </div>
                          <div>
                            <p className="text-label-sm text-on-surface-variant">Disponible</p>
                            <p className="font-display font-bold text-title-md text-green-600 mt-0.5">{fmt(available)}</p>
                          </div>
                          <div>
                            <p className="text-label-sm text-on-surface-variant">Límite</p>
                            <p className="font-display font-bold text-title-md text-on-surface mt-0.5">{fmt(c.credit_limit)}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-surface-container rounded-xl p-3">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="material-symbols-outlined text-[14px] text-on-surface-variant">calendar_today</span>
                              <p className="text-label-sm text-on-surface-variant">Próximo corte</p>
                            </div>
                            <p className="text-label-md font-semibold text-on-surface">Día {c.cutoff_date}</p>
                            <p className="text-label-sm text-on-surface-variant">{format(nextCut, "d 'de' MMMM", { locale: es })}</p>
                          </div>
                          <div className={`rounded-xl p-3 ${daysToPayment <= 5 ? 'bg-error/10 border border-error/20' : 'bg-surface-container'}`}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className={`material-symbols-outlined text-[14px] ${daysToPayment <= 5 ? 'text-error' : 'text-on-surface-variant'}`}>payments</span>
                              <p className="text-label-sm text-on-surface-variant">Próximo pago</p>
                            </div>
                            <p className={`text-label-md font-semibold ${daysToPayment <= 5 ? 'text-error' : 'text-on-surface'}`}>Día {c.payment_due_date}</p>
                            <p className="text-label-sm text-on-surface-variant">En {daysToPayment} días</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Pago mínimo vs sin intereses */}
                    <div className="mt-4 pt-4 border-t border-outline-variant grid grid-cols-2 gap-3">
                      <div className="flex justify-between items-center bg-surface-container rounded-xl px-4 py-3">
                        <p className="text-label-sm text-on-surface-variant">Pago mínimo</p>
                        <p className="text-label-md font-bold text-amber-600">{fmt(c.minimum_payment)}</p>
                      </div>
                      <div className="flex justify-between items-center bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
                        <p className="text-label-sm text-on-surface-variant">Sin intereses</p>
                        <p className="text-label-md font-bold text-primary">{fmt(c.payment_no_interest || c.current_balance)}</p>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Resumen total tarjetas */}
              <div className="bg-surface-container rounded-2xl border border-outline-variant p-5">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-label-md font-semibold text-on-surface">Deuda total tarjetas</p>
                  <p className="font-display font-extrabold text-headline-sm text-error">{fmt(totalCardDebt)}</p>
                </div>
                <div className="flex justify-between text-label-sm text-on-surface-variant">
                  <span>Pago mínimo total: <span className="font-semibold text-amber-600">{fmt(cards.reduce((s, c) => s + (c.minimum_payment ?? 0), 0))}</span></span>
                  <span>Utilización: <span className="font-semibold">{Math.round((totalCardDebt / cards.reduce((s, c) => s + (c.credit_limit ?? 0), 0)) * 100)}%</span></span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── PAGOS ── */}
      {tab === 'pagos' && (
        <div className="space-y-4">
          {/* Filter chips */}
          <div className="flex gap-2 flex-wrap">
            {([
              { key: 'all', label: 'Todos' },
              { key: 'pending', label: 'Pendientes' },
              { key: 'paid', label: 'Pagados' },
              { key: 'recurring', label: 'Recurrentes' },
            ] as { key: typeof paymentFilter; label: string }[]).map(f => (
              <button key={f.key} onClick={() => setPaymentFilter(f.key)}
                className={`px-3 py-1.5 rounded-xl text-label-md font-semibold transition-all ${paymentFilter === f.key ? 'bg-primary text-on-primary' : 'bg-surface border border-outline-variant text-on-surface-variant hover:bg-surface-container'}`}>
                {f.label}
                {f.key === 'pending' && <span className="ml-1.5 text-[11px]">({payments.filter(p => p.status !== 'Paid' && p.status !== 'paid').length})</span>}
                {f.key === 'recurring' && <span className="ml-1.5 text-[11px]">({payments.filter(p => p.is_recurring).length})</span>}
              </button>
            ))}
          </div>

          {filteredPayments.length === 0 ? (
            <div className="text-center py-12 text-on-surface-variant">Sin pagos con ese filtro</div>
          ) : (
            <div className="space-y-2">
              {filteredPayments.map(p => {
                const isPaid = p.status === 'Paid' || p.status === 'paid'
                const isPast = p.scheduled_date && new Date(p.scheduled_date) < new Date() && !isPaid
                return (
                  <div key={p.id}
                    className={`flex items-center gap-3 p-4 rounded-2xl border transition-colors ${isPaid ? 'bg-surface-container border-transparent opacity-60' : isPast ? 'bg-error/5 border-error/20' : 'bg-surface border-outline-variant'}`}>
                    {/* Status dot */}
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isPaid ? 'bg-green-500' : isPast ? 'bg-error' : 'bg-amber-400'}`} />
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-label-md text-on-surface ${isPaid ? 'line-through' : ''}`}>{p.related_name || p.payment_type || 'Pago'}</p>
                        {p.is_recurring && (
                          <span className="flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            <span className="material-symbols-outlined text-[10px]">repeat</span> Recurrente
                          </span>
                        )}
                        {isPast && !isPaid && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-error/10 text-error border border-error/20">Vencido</span>
                        )}
                      </div>
                      <p className="text-label-sm text-on-surface-variant mt-0.5">
                        {p.scheduled_date ? format(parseISO(p.scheduled_date), "d 'de' MMMM yyyy", { locale: es }) : '—'}
                        {p.payment_type ? ' · ' + p.payment_type : ''}
                      </p>
                    </div>
                    <p className={`text-label-md font-bold flex-shrink-0 ${isPaid ? 'text-on-surface-variant' : 'text-on-surface'}`}>{fmt(p.payment_amount)}</p>
                    <span className={`text-label-sm px-2.5 py-1 rounded-xl border font-medium flex-shrink-0 ${isPaid ? 'bg-surface-container text-on-surface-variant border-outline-variant' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      {isPaid ? 'Pagado' : 'Pendiente'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Summary */}
          <div className="bg-surface-container rounded-2xl p-4 flex justify-between items-center">
            <span className="text-label-md text-on-surface-variant">Total pendiente:</span>
            <span className="font-display font-extrabold text-headline-sm text-error">{fmt(pendingTotal)}</span>
          </div>
        </div>
      )}

      {/* ── FLUJO ── */}
      {tab === 'flujo' && (
        <div className="space-y-5">
          {/* Big cash flow chart */}
          <div className="bg-surface rounded-2xl border border-outline-variant p-6 zen-shadow">
            <p className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wide mb-1">Ingresos vs Gastos</p>
            <p className="text-label-sm text-on-surface-variant mb-5">Últimos 6 meses</p>
            <div className="flex items-end gap-3 h-36 mb-3">
              {cashFlow.map(m => (
                <div key={m.label} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="flex gap-1 items-end w-full h-28">
                    <div className="flex-1 rounded-t-lg transition-all" style={{ height: `${maxCashFlow > 0 ? (m.income / maxCashFlow) * 100 : 0}%`, backgroundColor: '#059669aa' }} />
                    <div className="flex-1 rounded-t-lg transition-all" style={{ height: `${maxCashFlow > 0 ? (m.expense / maxCashFlow) * 100 : 0}%`, backgroundColor: '#dc2626aa' }} />
                  </div>
                  <span className="text-label-sm text-on-surface-variant capitalize">{m.label}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-6 pt-3 border-t border-outline-variant">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-green-600" /><span className="text-label-sm text-on-surface-variant">Ingresos</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-red-600" /><span className="text-label-sm text-on-surface-variant">Gastos</span></div>
            </div>
          </div>

          {/* Month detail */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Ingresos del mes */}
            <div className="bg-surface rounded-2xl border border-outline-variant p-5 zen-shadow">
              <div className="flex items-center justify-between mb-4">
                <p className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wide">Ingresos</p>
                <p className="font-display font-extrabold text-title-lg text-green-600">{fmt(totalMonthIncomes)}</p>
              </div>
              {monthIncomes.length === 0 ? <p className="text-label-sm text-on-surface-variant">Sin ingresos este mes</p> : (
                <div className="space-y-2">
                  {monthIncomes.map(i => {
                    const virtual = i.is_virtual === true
                    return (
                      <div key={i.id} className={`flex justify-between items-center p-2 rounded-xl ${virtual ? 'bg-amber-50' : ''}`}>
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${virtual ? 'bg-amber-500' : 'bg-green-500'}`} />
                          <p className="text-label-md text-on-surface">{i.income_name || 'Ingreso'}</p>
                          {i.is_recurring && <span className="material-symbols-outlined text-[12px] text-on-surface-variant">repeat</span>}
                          {virtual && <span className="text-label-sm text-amber-600 font-medium">Virtual</span>}
                        </div>
                        <p className={`text-label-md font-semibold ${virtual ? 'text-amber-600' : 'text-green-600'}`}>
                          {virtual ? '±' : '+'}{fmt(i.amount)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Gastos por método */}
            <div className="bg-surface rounded-2xl border border-outline-variant p-5 zen-shadow">
              <div className="flex items-center justify-between mb-4">
                <p className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wide">Por método</p>
                <p className="font-display font-extrabold text-title-lg text-error">{fmt(totalMonthExpenses)}</p>
              </div>
              {byMethod.length === 0 ? <p className="text-label-sm text-on-surface-variant">Sin gastos este mes</p> : (
                <HBarChart items={byMethod} color="#dc2626" />
              )}
            </div>
          </div>

          {/* All expenses this month */}
          {monthExpenses.length > 0 && (
            <div className="bg-surface rounded-2xl border border-outline-variant p-5 zen-shadow">
              <p className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wide mb-4">Todos los gastos — {fmtMonth(selectedMonth)}</p>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {[...monthExpenses].sort((a, b) => (b.expense_date ?? '').localeCompare(a.expense_date ?? '')).map(e => {
                  const virtual = isVirtual(e)
                  const cat = e.category || e.expense_category || e.payment_method || ''
                  return (
                    <div key={e.id} className={`flex items-center justify-between p-3 rounded-xl ${virtual ? 'bg-amber-50 border border-amber-100' : 'bg-surface-container'}`}>
                      <div>
                        <p className="text-label-md text-on-surface">{e.notes || 'Gasto'}</p>
                        <div className="flex gap-1.5 mt-0.5 flex-wrap">
                          {cat && <span className="text-label-sm px-1.5 py-0.5 rounded bg-white/70 text-on-surface-variant border border-outline-variant">{cat}</span>}
                          <span className="text-label-sm text-on-surface-variant">{e.expense_date}</span>
                          {virtual && <span className="text-label-sm text-amber-600 font-medium">Virtual</span>}
                        </div>
                      </div>
                      <p className={`text-label-md font-bold ${virtual ? 'text-amber-600' : 'text-error'}`}>
                        {virtual ? '±' : '-'}{fmt(e.amount)}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── METAS ── */}
      {tab === 'metas' && (
        <div className="space-y-5">
          {goals.length === 0 ? (
            <div className="text-center py-16 text-on-surface-variant">Sin metas de ahorro registradas</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {goals.map(g => {
                  const pct = g.target_amount > 0 ? Math.min((g.current_amount / g.target_amount) * 100, 100) : 0
                  const remaining = (g.target_amount ?? 0) - (g.current_amount ?? 0)
                  const monthsLeft = g.monthly_contribution > 0 ? Math.ceil(remaining / g.monthly_contribution) : null
                  const color = pct >= 100 ? '#059669' : pct >= 60 ? '#0058bc' : pct >= 30 ? '#d97706' : '#dc2626'
                  return (
                    <div key={g.id} className="bg-surface rounded-2xl border border-outline-variant p-5 zen-shadow">
                      <div className="flex items-center gap-5">
                        <DonutChart pct={pct} color={color} size={90} label="%" />
                        <div className="flex-1 space-y-2">
                          <div>
                            <h3 className="font-display font-bold text-label-lg text-on-surface">{g.goal_name}</h3>
                            {g.status && <span className="text-label-sm px-2 py-0.5 rounded-full bg-primary/10 text-primary">{g.status}</span>}
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-label-sm">
                              <span className="text-on-surface-variant">Ahorrado</span>
                              <span className="font-semibold text-on-surface">{fmt(g.current_amount)}</span>
                            </div>
                            <div className="flex justify-between text-label-sm">
                              <span className="text-on-surface-variant">Meta</span>
                              <span className="font-semibold text-on-surface">{fmt(g.target_amount)}</span>
                            </div>
                            <div className="flex justify-between text-label-sm">
                              <span className="text-on-surface-variant">Faltante</span>
                              <span className="font-semibold text-error">{fmt(remaining)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {(g.monthly_contribution > 0 || g.target_date) && (
                        <div className="mt-4 pt-3 border-t border-outline-variant flex gap-4">
                          {g.monthly_contribution > 0 && (
                            <div>
                              <p className="text-label-sm text-on-surface-variant">Contribución mensual</p>
                              <p className="text-label-md font-semibold text-primary">{fmt(g.monthly_contribution)}</p>
                            </div>
                          )}
                          {monthsLeft && (
                            <div>
                              <p className="text-label-sm text-on-surface-variant">Tiempo estimado</p>
                              <p className="text-label-md font-semibold text-on-surface">{monthsLeft} meses</p>
                            </div>
                          )}
                          {g.target_date && (
                            <div>
                              <p className="text-label-sm text-on-surface-variant">Fecha meta</p>
                              <p className="text-label-md font-semibold text-on-surface">{format(parseISO(g.target_date), "MMM yyyy", { locale: es })}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Total savings summary */}
              <div className="bg-surface-container rounded-2xl border border-outline-variant p-5">
                <div className="flex justify-between items-center">
                  <span className="text-label-md text-on-surface-variant">Total ahorrado en todas las metas</span>
                  <span className="font-display font-extrabold text-headline-sm text-primary">{fmt(goals.reduce((s, g) => s + (g.current_amount ?? 0), 0))}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-label-sm text-on-surface-variant">Total objetivo</span>
                  <span className="text-label-md font-semibold text-on-surface">{fmt(goals.reduce((s, g) => s + (g.target_amount ?? 0), 0))}</span>
                </div>
              </div>
            </>
          )}

          {/* Deudas */}
          {debts.length > 0 && (
            <div className="bg-surface rounded-2xl border border-outline-variant p-5 zen-shadow">
              <p className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wide mb-4">Deudas activas</p>
              <div className="space-y-3">
                {debts.map(d => (
                  <div key={d.id} className="flex items-center justify-between p-3 bg-surface-container rounded-xl">
                    <div>
                      <p className="text-label-md font-medium text-on-surface">{d.debt_name}</p>
                      <p className="text-label-sm text-on-surface-variant">Día {d.payment_day} · {d.debt_type} {d.interest_rate ? `· ${d.interest_rate}%` : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-label-md font-bold text-error">{fmt(d.total_balance)}</p>
                      <p className="text-label-sm text-on-surface-variant">{fmt(d.monthly_payment)}/mes</p>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-outline-variant">
                  <span className="text-label-md text-on-surface-variant">Total deuda</span>
                  <span className="font-display font-bold text-headline-sm text-error">{fmt(totalDebt)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
