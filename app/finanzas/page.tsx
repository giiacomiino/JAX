'use client'

import { useEffect, useState } from 'react'
import { PaymentSchedule } from '@/components/finanzas/payment-schedule'
import { AccountsGrid } from '@/components/finanzas/accounts-grid'
import { CreditCards } from '@/components/finanzas/credit-cards'
import { SavingsGoals } from '@/components/finanzas/savings-goals'
import type { FinanzasData } from '@/types'

export default function FinanzasPage() {
  const [data, setData] = useState<FinanzasData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/finanzas')
      .then(r => r.ok ? r.json() : Promise.reject('Error al cargar'))
      .then(setData)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-headline-lg font-bold text-on-surface">Finanzas</h1>
        <p className="text-on-surface-variant text-label-md mt-1">Resumen financiero desde base44</p>
      </div>

      {loading && <div className="text-center py-12 text-on-surface-variant text-label-md">Cargando datos...</div>}
      {error && <div className="text-center py-12 text-error text-label-md">{error}</div>}

      {data && (
        <div className="space-y-8">
          {data.payments.length > 0 && <PaymentSchedule payments={data.payments} />}
          {data.accounts.length > 0 && <AccountsGrid accounts={data.accounts} />}
          {data.creditCards.length > 0 && <CreditCards cards={data.creditCards} />}
          {data.savingsGoals.length > 0 && <SavingsGoals goals={data.savingsGoals} />}
          {!data.payments.length && !data.accounts.length && !data.creditCards.length && (
            <div className="text-center py-12 text-on-surface-variant text-label-md">
              Sin datos financieros disponibles
            </div>
          )}
        </div>
      )}
    </div>
  )
}
