const BASE_URL = 'https://app.base44.com/api'
const APP_ID = process.env.BASE44_APP_ID!
const API_KEY = process.env.BASE44_API_KEY!
const EMAIL = process.env.BASE44_EMAIL!
const PASSWORD = process.env.BASE44_PASSWORD!

let userToken: string | null = null
let tokenFetchedAt = 0
const TOKEN_TTL = 3600_000 // 1 hour

async function getUserToken(): Promise<string | null> {
  if (!EMAIL || !PASSWORD) return null
  const now = Date.now()
  if (userToken && now - tokenFetchedAt < TOKEN_TTL) return userToken

  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'app-id': APP_ID },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    })
    if (!res.ok) return null
    const data = await res.json()
    userToken = data.access_token ?? data.token ?? null
    tokenFetchedAt = now
    return userToken
  } catch {
    return null
  }
}

async function fetchEntity<T>(entity: string): Promise<T[]> {
  const token = await getUserToken()
  const headers: Record<string, string> = {}

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  } else {
    headers['api-key'] = API_KEY
  }

  try {
    const res = await fetch(
      `${BASE_URL}/apps/${APP_ID}/entities/${entity}?api_key=${API_KEY}`,
      { headers, next: { revalidate: 300 } }
    )
    if (!res.ok) return []
    const json = await res.json()
    return Array.isArray(json) ? json : []
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

// Legacy wrapper for cron jobs
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
