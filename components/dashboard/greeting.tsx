'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

function getGreeting(hour: number) {
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export function Greeting() {
  const [dateStr, setDateStr] = useState('')
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    const now = new Date()
    setDateStr(format(now, "EEEE d 'de' MMMM", { locale: es }))
    setGreeting(getGreeting(now.getHours()))
  }, [])

  if (!dateStr) return null

  return (
    <p className="text-sm sm:text-body-lg text-on-surface-variant max-w-2xl">
      {greeting}, Giacomo. Aquí está tu resumen del{' '}
      <span className="capitalize">{dateStr}</span>.
    </p>
  )
}
