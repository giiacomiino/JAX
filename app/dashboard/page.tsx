import { UrgentTasks } from '@/components/dashboard/urgent-tasks'
import { UpcomingEvents } from '@/components/dashboard/upcoming-events'
import { PendingPayments } from '@/components/dashboard/pending-payments'
import { PortfolioSummary } from '@/components/dashboard/portfolio-summary'
import { ActiveProjects } from '@/components/dashboard/active-projects'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function DashboardPage() {
  const now = new Date()

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-display-lg font-bold text-on-surface mb-2">Jax Overview</h1>
        <p className="text-body-lg text-on-surface-variant max-w-2xl">
          Buenos días, Giacomo. Aquí está tu resumen del{' '}
          <span className="capitalize">{format(now, "EEEE d 'de' MMMM", { locale: es })}</span>.
        </p>
      </div>

      <div className="bento-grid">
        {/* Tareas — 8 cols */}
        <div className="col-span-12 lg:col-span-8">
          <UrgentTasks />
        </div>

        {/* Portfolio — 4 cols */}
        <div className="col-span-12 lg:col-span-4">
          <PortfolioSummary />
        </div>

        {/* Proyectos activos — 4 cols */}
        <div className="col-span-12 lg:col-span-4">
          <ActiveProjects />
        </div>

        {/* Agenda — 4 cols */}
        <div className="col-span-12 lg:col-span-4">
          <UpcomingEvents />
        </div>

        {/* Pagos — 4 cols */}
        <div className="col-span-12 lg:col-span-4">
          <PendingPayments />
        </div>
      </div>
    </div>
  )
}
