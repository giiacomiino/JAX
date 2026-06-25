import type { Base44CreditCard } from '@/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
}

export function CreditCards({ cards }: { cards: Base44CreditCard[] }) {
  return (
    <div className="space-y-3">
      <h2 className="text-label-md font-semibold text-on-surface">Tarjetas de crédito</h2>
      <div className="space-y-3">
        {cards.map(card => {
          const usagePct = Math.round((card.current_balance / card.credit_limit) * 100)
          const isHigh = usagePct > 70
          return (
            <div key={card.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-label-md font-semibold text-on-surface">{card.name}</p>
                <span className={`text-label-sm px-2 py-0.5 rounded-full ${isHigh ? 'bg-error/10 text-error' : 'bg-surface-container text-on-surface-variant'}`}>
                  {usagePct}% usado
                </span>
              </div>
              <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${isHigh ? 'bg-error' : 'bg-primary'}`} style={{ width: `${Math.min(usagePct, 100)}%` }} />
              </div>
              <div className="flex justify-between text-label-sm text-on-surface-variant">
                <span>Saldo: <span className="text-on-surface font-medium">{fmt(card.current_balance)}</span></span>
                <span>Límite: {fmt(card.credit_limit)}</span>
              </div>
              <div className="flex justify-between text-label-sm text-on-surface-variant pt-1 border-t border-outline-variant">
                <span>Corte: {format(new Date(card.cut_date), "d MMM", { locale: es })}</span>
                <span>Pago mínimo: <span className="text-on-surface font-medium">{fmt(card.minimum_payment)}</span></span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
