import type { Base44SavingsGoal } from '@/types'

function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
}

export function SavingsGoals({ goals }: { goals: Base44SavingsGoal[] }) {
  return (
    <div className="space-y-3">
      <h2 className="text-label-md font-semibold text-on-surface">Metas de ahorro</h2>
      <div className="space-y-3">
        {goals.map(g => {
          const pct = Math.round((g.current_amount / g.target_amount) * 100)
          return (
            <div key={g.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-label-md font-medium text-on-surface">{g.name}</p>
                <span className="text-label-sm text-primary font-semibold">{pct}%</span>
              </div>
              <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
              <div className="flex justify-between text-label-sm text-on-surface-variant">
                <span>{fmt(g.current_amount)}</span>
                <span>Meta: {fmt(g.target_amount)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
