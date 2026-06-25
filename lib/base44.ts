import type { FinanzasData } from '@/types'

const BASE_URL = 'https://app.base44.com/api/apps'
const APP_ID = process.env.BASE44_APP_ID!
const API_KEY = process.env.BASE44_API_KEY!

const cache: { data: FinanzasData | null; fetchedAt: number } = { data: null, fetchedAt: 0 }
const CACHE_TTL = 300_000 // 5 minutes

async function fetchEntity<T>(entity: string): Promise<T[]> {
  const url = `${BASE_URL}/${APP_ID}/entities/${entity}?api_key=${API_KEY}`
  try {
    const res = await fetch(url, { next: { revalidate: 300 } })
    if (!res.ok) return []
    const json = await res.json()
    return Array.isArray(json) ? json : []
  } catch {
    return []
  }
}

export async function getFinanzasData(): Promise<FinanzasData> {
  const now = Date.now()
  if (cache.data && now - cache.fetchedAt < CACHE_TTL) return cache.data

  const [payments, expenses, recurringExpenses, categories] = await Promise.all([
    fetchEntity('PaymentSchedule'),
    fetchEntity('Expense'),
    fetchEntity('RecurringExpense'),
    fetchEntity('Category'),
  ])

  const data: FinanzasData = {
    payments: payments as FinanzasData['payments'],
    accounts: [] as FinanzasData['accounts'],
    creditCards: [] as FinanzasData['creditCards'],
    savingsGoals: [] as FinanzasData['savingsGoals'],
    debts: [] as FinanzasData['debts'],
    incomes: [] as FinanzasData['incomes'],
  }

  cache.data = data
  cache.fetchedAt = now
  return { ...data, _raw: { expenses, recurringExpenses, categories } } as FinanzasData & { _raw: unknown }
}

export async function getRawEntities() {
  const url = (e: string) => `${BASE_URL}/${APP_ID}/entities/${e}?api_key=${API_KEY}`
  const entities = ['PaymentSchedule', 'Expense', 'RecurringExpense', 'Category']
  const results: Record<string, unknown[]> = {}
  await Promise.all(
    entities.map(async e => {
      try {
        const res = await fetch(url(e))
        results[e] = res.ok ? await res.json() : []
      } catch {
        results[e] = []
      }
    })
  )
  return results
}
