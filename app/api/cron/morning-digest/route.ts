import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFinanzasData } from '@/lib/base44'
import { sendMessage, bold, line } from '@/lib/telegram'
import { format, isToday, isTomorrow, addDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns'
import { es } from 'date-fns/locale'

export async function GET() {
  const supabase = createClient()

  const [{ data: tasks }, { data: events }, finanzas] = await Promise.all([
    supabase.from('tasks').select('*').eq('status', 'pending').order('due_date', { ascending: true }),
    supabase.from('events').select('*').gte('starts_at', startOfDay(new Date()).toISOString()).lte('starts_at', endOfDay(addDays(new Date(), 1)).toISOString()).order('starts_at'),
    getFinanzasData(),
  ])

  const today = new Date()
  const lines: string[] = []

  lines.push(line(bold(`🌅 Buenos días, Giacomo — ${format(today, "EEEE d 'de' MMMM", { locale: es })}`)))
  lines.push('')

  // Tareas urgentes
  const urgentTasks = (tasks ?? []).filter(t => t.priority === 'high' || (t.due_date && isToday(new Date(t.due_date))))
  if (urgentTasks.length > 0) {
    lines.push(bold('📌 Tareas para hoy:'))
    urgentTasks.slice(0, 5).forEach(t => lines.push(`• ${t.title}`))
    lines.push('')
  }

  // Eventos del día
  const todayEvents = (events ?? []).filter(e => isToday(new Date(e.starts_at)))
  if (todayEvents.length > 0) {
    lines.push(bold('📅 Agenda de hoy:'))
    todayEvents.forEach(e => lines.push(`• ${format(new Date(e.starts_at), 'HH:mm')} — ${e.title}`))
    lines.push('')
  }

  // Pagos próximos (3 días)
  const upcoming = finanzas.payments
    .filter(p => p.status !== 'Paid')
    .filter(p => isWithinInterval(new Date(p.scheduled_date), { start: today, end: addDays(today, 3) }))
  if (upcoming.length > 0) {
    lines.push(bold('💸 Pagos próximos:'))
    upcoming.forEach(p => {
      const when = isToday(new Date(p.scheduled_date)) ? 'Hoy' : isTomorrow(new Date(p.scheduled_date)) ? 'Mañana' : format(new Date(p.scheduled_date), 'd MMM', { locale: es })
      lines.push(`• ${when} — ${p.description}: $${p.amount.toLocaleString('es-MX')}`)
    })
  }

  await sendMessage(lines.join('\n'))
  return NextResponse.json({ ok: true, sent: lines.length > 0 })
}
