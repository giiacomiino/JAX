const BASE_URL = 'https://app.base44.com/api'
const APP_ID = process.env.BASE44_APP_ID!
const API_KEY = process.env.BASE44_API_KEY!

function getAuthHeaders(): Record<string, string> {
  const token = process.env.BASE44_ACCESS_TOKEN
  if (token) return { Authorization: `Bearer ${token}` }
  return {}
}

async function fetchEntity<T extends { created_by_id?: string }>(entity: string): Promise<T[]> {
  const token = process.env.BASE44_ACCESS_TOKEN
  const userId = process.env.BASE44_USER_ID
  const url = token
    ? `${BASE_URL}/apps/${APP_ID}/entities/${entity}`
    : `${BASE_URL}/apps/${APP_ID}/entities/${entity}?api_key=${API_KEY}`
  const headers = getAuthHeaders()
  try {
    const res = await fetch(url, { headers, next: { revalidate: 300 } })
    if (!res.ok) return []
    const json = await res.json()
    const arr: T[] = Array.isArray(json) ? json : []
    return userId ? arr.filter(item => item.created_by_id === userId) : arr
  } catch {
    return []
  }
}

const cache: { data: Record<string, unknown[]> | null; fetchedAt: number } = { data: null, fetchedAt: 0 }
const CACHE_TTL = 300_000

export async function getRawEntities(): Promise<Record<string, unknown[]>> {
  const now = Date.now()
  if (cache.data && now - cache.fetchedAt < CACHE_TTL) return cache.data

  const entities = ['CreditCard', 'Account', 'SavingsGoal', 'Debt', 'Income', 'Expense', 'PaymentSchedule']
  const results: Record<string, unknown[]> = {}

  await Promise.all(
    entities.map(async e => {
      results[e] = await fetchEntity(e)
    })
  )

  cache.data = results
  cache.fetchedAt = now
  return results
}

export async function getFinanzasData() {
  const raw = await getRawEntities()
  return {
    payments: (raw.PaymentSchedule ?? []) as Array<{ description: string; amount: number; scheduled_date: string; status: string }>,
    accounts: (raw.Account ?? []) as Array<{ name: string; balance: number; type: string; currency: string }>,
    creditCards: (raw.CreditCard ?? []) as Array<{ name: string; current_balance: number; credit_limit: number; cut_date: string; minimum_payment: number }>,
    savingsGoals: (raw.SavingsGoal ?? []) as Array<{ name: string; target_amount: number; current_amount: number }>,
    debts: (raw.Debt ?? []) as Array<{ name: string; total_amount: number; remaining_amount: number; next_payment_date: string; next_payment_amount: number }>,
    incomes: (raw.Income ?? []) as Array<{ description: string; amount: number; date: string }>,
  }
}
