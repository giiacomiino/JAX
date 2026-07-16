import { createAdminClient } from './supabase/admin'

const BASE_URL = 'https://app.base44.com/api'
const APP_ID = process.env.BASE44_APP_ID!
const API_KEY = process.env.BASE44_API_KEY!
const CACHE_TTL_SECONDS = 300

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
  try {
    const res = await fetch(url, { headers: getAuthHeaders(), cache: 'no-store' })
    if (!res.ok) return []
    const json = await res.json()
    const arr: T[] = Array.isArray(json) ? json : []
    return userId ? arr.filter(item => item.created_by_id === userId) : arr
  } catch {
    return []
  }
}

async function fetchFromBase44(): Promise<Record<string, unknown[]>> {
  const entities = ['CreditCard', 'Account', 'SavingsGoal', 'Debt', 'Income', 'Expense', 'PaymentSchedule', 'Budget', 'BudgetCategory']
  const results: Record<string, unknown[]> = {}
  await Promise.all(entities.map(async e => { results[e] = await fetchEntity(e) }))
  return results
}

async function readFromSupabaseCache(): Promise<Record<string, unknown[]> | null> {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('finanzas_cache')
      .select('data, synced_at')
      .eq('id', 1)
      .single()

    if (!data) return null

    const ageSeconds = (Date.now() - new Date(data.synced_at).getTime()) / 1000
    if (ageSeconds > CACHE_TTL_SECONDS) return null

    return data.data as Record<string, unknown[]>
  } catch {
    return null
  }
}

export async function writeToSupabaseCache(data: Record<string, unknown[]>): Promise<void> {
  try {
    const supabase = createAdminClient()
    await supabase.from('finanzas_cache').upsert({ id: 1, data, synced_at: new Date().toISOString() })
  } catch {
    // Non-fatal: cache write failure doesn't break the response
  }
}

export async function invalidateCache(): Promise<void> {
  try {
    const supabase = createAdminClient()
    await supabase.from('finanzas_cache').delete().eq('id', 1)
  } catch {
    // Ignore
  }
}

export async function getRawEntities(): Promise<Record<string, unknown[]>> {
  // Try Supabase persistent cache first (shared across all Vercel instances)
  const cached = await readFromSupabaseCache()
  if (cached) {
    // Reject cached data that is all-empty (caused by a previous token failure)
    const totalCached = Object.values(cached).reduce((s, arr) => s + arr.length, 0)
    if (totalCached > 0) return cached
  }

  // Cache miss: fetch fresh from base44
  const fresh = await fetchFromBase44()

  // Only persist to cache if we actually got data — prevents caching a token failure as zeros
  const totalFresh = Object.values(fresh).reduce((s, arr) => s + arr.length, 0)
  if (totalFresh > 0) {
    await writeToSupabaseCache(fresh)
  }

  return fresh
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
