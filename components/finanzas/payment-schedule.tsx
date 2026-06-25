import type { Base44PaymentSchedule } from '@/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
}

const statusStyles = {
  Pending: 'bg-primary/10 text-primary border-primary/20',
  Overdue: 'bg-error/10 text-error border-error/20',
  Paid: 'bg-surface-container text-on-surface-variant border-outline-variant',
}
const statusLabels = { Pending: 'Pendiente', Overdue: 'Vencido', Paid: 'Pagado' }

export function PaymentSchedule({ payments }: { payments: Base44PaymentSchedule[] }) {
  const upcoming = payments
    .filter(p => p.status !== 'Paid')
    .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())

  const totalPending = upcoming.reduce((s, p) => s + p.amount, 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-label-md font-semibold text-on-surface">Pagos programados</h2>
        <span className="text-label-md font-bold text-error">{fmt(totalPending)}</span>
      </div>
      <div className="space-y-2">
        {upcoming.length === 0 ? (
          <p className="text-label-md text-on-surface-variant text-center py-4">Sin pagos pendientes</p>
        ) : upcoming.map(p => (
          <div key={p.id} className="flex items-center justify-between bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3">
            <div>
              <p className="text-label-md font-medium text-on-surface">{p.description}</p>
              <p className="text-label-sm text-on-surface-variant">
                {format(new Date(p.scheduled_date), "d MMM yyyy", { locale: es })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-body-md font-bold text-on-surface">{fmt(p.amount)}</span>
              <span className={`text-label-sm px-2 py-0.5 rounded-full border ${statusStyles[p.status]}`}>
                {statusLabels[p.status]}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
