import { NextResponse } from 'next/server'
import { getFinanzasData } from '@/lib/base44'
import { sendMessage, bold } from '@/lib/telegram'
import { isTomorrow } from 'date-fns'

export async function GET() {
  const finanzas = await getFinanzasData()

  const tomorrowPayments = finanzas.payments.filter(
    p => p.status !== 'Paid' && isTomorrow(new Date(p.scheduled_date))
  )

  if (tomorrowPayments.length === 0) {
    return NextResponse.json({ ok: true, sent: false })
  }

  const lines = [
    bold('🔔 Recordatorio — Pagos para mañana:'),
    ...tomorrowPayments.map(p => `• ${p.description}: $${p.amount.toLocaleString('es-MX')}`),
  ]

  await sendMessage(lines.join('\n'))
  return NextResponse.json({ ok: true, sent: true, count: tomorrowPayments.length })
}
