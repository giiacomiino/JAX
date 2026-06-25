import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getValidToken, createCalendarEvent, type GoogleAccount } from '@/lib/google-calendar'
import { getRawEntities } from '@/lib/base44'
import { addMonths, format, startOfDay } from 'date-fns'

const fmtMXN = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n ?? 0)

export async function POST() {
  try {
    const supabase = createAdminClient()
    const { data: accounts } = await supabase.from('google_accounts').select('*')

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ error: 'No hay cuentas de Google conectadas' }, { status: 400 })
    }

    const raw = await getRawEntities()
    const cards = (raw.CreditCard ?? []) as Array<{
      id: string; card_alias?: string; bank_name?: string
      current_balance?: number; minimum_payment?: number; payment_due_date?: number
    }>
    const debts = (raw.Debt ?? []) as Array<{
      id: string; debt_name?: string; monthly_payment?: number; payment_day?: number
    }>
    const schedules = (raw.PaymentSchedule ?? []) as Array<{
      id: string; related_name?: string; payment_amount?: number
      scheduled_date?: string; status: string; is_recurring?: boolean
    }>

    const today = startOfDay(new Date())
    const horizon = addMonths(today, 3)

    // Build events list
    const events: Array<{ summary: string; description: string; date: string; colorId: string }> = []

    // Card payments — saldo por corte on due date
    for (const card of cards) {
      if (!card.payment_due_date || !(card.current_balance ?? 0)) continue
      for (let m = 0; m < 3; m++) {
        const base = addMonths(today, m)
        const payDate = new Date(base.getFullYear(), base.getMonth(), card.payment_due_date)
        if (payDate < today || payDate > horizon) continue
        const name = card.card_alias || card.bank_name || 'Tarjeta'
        events.push({
          summary: `💳 Pago ${name} — ${fmtMXN(card.current_balance ?? 0)}`,
          description: [
            `Saldo total: ${fmtMXN(card.current_balance ?? 0)}`,
            `Pago mínimo: ${fmtMXN(card.minimum_payment ?? 0)}`,
            `Generado por JAX desde FinWise`,
          ].join('\n'),
          date: format(payDate, 'yyyy-MM-dd'),
          colorId: '11', // Tomato
        })
      }
    }

    // Debt payments
    for (const debt of debts) {
      if (!debt.payment_day || !(debt.monthly_payment ?? 0)) continue
      for (let m = 0; m < 3; m++) {
        const base = addMonths(today, m)
        const payDate = new Date(base.getFullYear(), base.getMonth(), debt.payment_day)
        if (payDate < today || payDate > horizon) continue
        events.push({
          summary: `🏦 ${debt.debt_name} — ${fmtMXN(debt.monthly_payment ?? 0)}`,
          description: `Pago mensual: ${fmtMXN(debt.monthly_payment ?? 0)}\nGenerado por JAX desde FinWise`,
          date: format(payDate, 'yyyy-MM-dd'),
          colorId: '3', // Grape
        })
      }
    }

    // Recurring payment schedules
    for (const sched of schedules) {
      if (!sched.scheduled_date || (sched.status === 'Paid' || sched.status === 'paid')) continue
      const d = new Date(sched.scheduled_date)
      if (d < today || d > horizon) continue
      events.push({
        summary: `📅 ${sched.related_name ?? 'Pago'} — ${fmtMXN(sched.payment_amount ?? 0)}`,
        description: `Generado por JAX desde FinWise`,
        date: format(d, 'yyyy-MM-dd'),
        colorId: '5', // Banana
      })
    }

    // Push to all connected accounts
    let totalCreated = 0
    let totalFailed = 0

    for (const account of accounts as GoogleAccount[]) {
      const token = await getValidToken(account)
      if (!token) { totalFailed += events.length; continue }

      for (const ev of events) {
        const ok = await createCalendarEvent(token, ev)
        if (ok) totalCreated++; else totalFailed++
      }
    }

    return NextResponse.json({
      created: totalCreated,
      failed: totalFailed,
      accounts: accounts.length,
      events: events.length,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
