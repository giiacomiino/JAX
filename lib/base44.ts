import type { FinanzasData } from '@/types'

const BASE_URL = 'https://api.base44.com/api/apps'
const APP_ID = process.env.BASE44_APP_ID!
const API_KEY = process.env.BASE44_API_KEY!

const cache: { data: FinanzasData | null; fetchedAt: number } = { data: null, fetchedAt: 0 }
const CACHE_TTL = 300_000 // 5 minutes

async function fetchEntity<T>(entity: string): Promise<T[]> {
  const res = await fetch(`${BASE_URL}/${APP_ID}/entities/${entity}/`, {
    headers: { 'api-key': API_KEY },
    next: { revalidate: 300 },
  })
  if (!res.ok) return []
  const json = await res.json()
  return Array.isArray(json) ? json : []
}

export async function getFinanzasData(): Promise<FinanzasData> {
  const now = Date.now()
  if (cache.data && now - cache.fetchedAt < CACHE_TTL) return cache.data

  const [payments, accounts, creditCards, savingsGoals, debts, incomes] = await Promise.all([
    fetchEntity('PaymentSchedule'),
    fetchEntity('Account'),
    fetchEntity('CreditCard'),
    fetchEntity('SavingsGoal'),
    fetchEntity('Debt'),
    fetchEntity('Income'),
  ])

  const data: FinanzasData = {
    payments: payments as FinanzasData['payments'],
    accounts: accounts as FinanzasData['accounts'],
    creditCards: creditCards as FinanzasData['creditCards'],
    savingsGoals: savingsGoals as FinanzasData['savingsGoals'],
    debts: debts as FinanzasData['debts'],
    incomes: incomes as FinanzasData['incomes'],
  }

  cache.data = data
  cache.fetchedAt = now
  return data
}
