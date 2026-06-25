import { UrgentTasks } from '@/components/dashboard/urgent-tasks'
import { UpcomingEvents } from '@/components/dashboard/upcoming-events'
import { PendingPayments } from '@/components/dashboard/pending-payments'
import { PortfolioSummary } from '@/components/dashboard/portfolio-summary'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function DashboardPage() {
  const now = new Date()

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-headline-lg font-bold text-on-surface">Buenos días, Giacomo</h1>
        <p className="text-on-surface-variant text-label-md mt-1 capitalize">
          {format(now, "EEEE, d 'de' MMMM yyyy", { locale: es })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <UrgentTasks />
        <UpcomingEvents />
        <PendingPayments />
        <PortfolioSummary />
      </div>
    </div>
  )
}
