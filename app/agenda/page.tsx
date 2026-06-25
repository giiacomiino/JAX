import { WeeklyView } from '@/components/agenda/weekly-view'

export default function AgendaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline-lg font-bold text-on-surface">Agenda</h1>
        <p className="text-on-surface-variant text-label-md mt-1">Vista semanal de eventos</p>
      </div>
      <WeeklyView />
    </div>
  )
}
