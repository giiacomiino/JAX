'use client'

import { useState } from 'react'
import { MainDashboard } from '@/components/dashboard/main-dashboard'
import { QuickAdd } from '@/components/dashboard/quick-add'
import { Greeting } from '@/components/dashboard/greeting'

export default function DashboardPage() {
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="space-y-4 sm:space-y-5 max-w-6xl mx-auto">
      <div>
        <h1 className="font-display text-[18px] sm:text-headline-lg font-bold text-on-surface" style={{ letterSpacing: '-0.025em' }}>
          Jax Overview
        </h1>
        <Greeting />
      </div>

      <QuickAdd onCreated={() => setRefreshKey(k => k + 1)} />

      <MainDashboard refreshKey={refreshKey} />
    </div>
  )
}
