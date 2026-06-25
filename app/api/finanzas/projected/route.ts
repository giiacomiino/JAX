import { NextResponse } from 'next/server'
import { getRawEntities } from '@/lib/base44'
import { addMonths, format, startOfDay } from 'date-fns'

interface CreditCard {
  id: string; card_alias: string; bank_name: string
  minimum_payment: number; payment_due_date: number; current_balance: number
}
interface Debt {
  id: string; debt_name: string; monthly_payment: number; payment_day: number
}
interface PaymentSchedule {
  id: string; related_name: string; payment_amount: number
  scheduled_date: string; status: string; is_recurring: boolean; payment_type: string
}

export async function GET() {
  try {
    const raw = await getRawEntities()
    const cards = (raw.CreditCard ?? []) as CreditCard[]
    const debts = (raw.Debt ?? []) as Debt[]
    const schedules = (raw.PaymentSchedule ?? []) as PaymentSchedule[]

    const projected: Array<{
      id: string; title: string; date: string; amount: number
      type: 'card_payment' | 'debt_payment' | 'recurring_expense'
      status: string; color: string
    }> = []

    const today = startOfDay(new Date())
    const horizon = addMonths(today, 3) // project 3 months ahead

    // Credit card minimum payments — project next 3 months
    for (const card of cards) {
      if (!card.payment_due_date || !card.current_balance) continue
      for (let m = 0; m < 3; m++) {
        const base = addMonths(today, m)
        const payDate = new Date(base.getFullYear(), base.getMonth(), card.payment_due_date)
        if (payDate < today || payDate > horizon) continue
        projected.push({
          id: `card-${card.id}-${m}`,
          title: `💳 ${card.card_alias || card.bank_name} — mínimo`,
          date: format(payDate, 'yyyy-MM-dd'),
          amount: card.minimum_payment ?? 0,
          type: 'card_payment',
          status: 'pending',
          color: '#dc2626',
        })
      }
    }

    // Debt monthly payments — project next 3 months
    for (const debt of debts) {
      if (!debt.payment_day || !debt.monthly_payment) continue
      for (let m = 0; m < 3; m++) {
        const base = addMonths(today, m)
        const payDate = new Date(base.getFullYear(), base.getMonth(), debt.payment_day)
        if (payDate < today || payDate > horizon) continue
        projected.push({
          id: `debt-${debt.id}-${m}`,
          title: `🏦 ${debt.debt_name}`,
          date: format(payDate, 'yyyy-MM-dd'),
          amount: debt.monthly_payment ?? 0,
          type: 'debt_payment',
          status: 'pending',
          color: '#7c3aed',
        })
      }
    }

    // Recurring payment schedules — next occurrences
    for (const sched of schedules) {
      if (!sched.scheduled_date) continue
      const isPaid = sched.status === 'Paid' || sched.status === 'paid'
      projected.push({
        id: `sched-${sched.id}`,
        title: sched.related_name || sched.payment_type || 'Pago',
        date: sched.scheduled_date.split('T')[0],
        amount: sched.payment_amount ?? 0,
        type: 'recurring_expense',
        status: isPaid ? 'paid' : 'pending',
        color: isPaid ? '#059669' : '#d97706',
      })
    }

    return NextResponse.json(projected)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
