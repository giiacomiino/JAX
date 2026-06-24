export type Priority = 'high' | 'medium' | 'low'
export type Category = 'work' | 'personal' | 'finance' | 'other'
export type TaskStatus = 'pending' | 'completed'
export type Market = 'usa' | 'mx'
export type Currency = 'USD' | 'MXN'

export interface Task {
  id: string
  title: string
  description: string | null
  due_date: string | null
  priority: Priority
  category: Category
  status: TaskStatus
  created_at: string
}

export interface CreateTaskInput {
  title: string
  description?: string
  due_date?: string
  priority: Priority
  category: Category
}

export interface Event {
  id: string
  title: string
  description: string | null
  starts_at: string
  ends_at: string | null
  reminder_minutes: number
  created_at: string
}

export interface CreateEventInput {
  title: string
  description?: string
  starts_at: string
  ends_at?: string
  reminder_minutes: number
}

export interface PortfolioPosition {
  id: string
  ticker: string
  market: Market
  purchase_price: number
  shares: number
  alert_threshold_pct: number
  currency: Currency
  created_at: string
}

export interface CreatePositionInput {
  ticker: string
  market: Market
  purchase_price: number
  shares: number
  alert_threshold_pct: number
  currency: Currency
}

export interface PositionWithPrice extends PortfolioPosition {
  current_price: number | null
  value_total: number | null
  pnl_amount: number | null
  pnl_pct: number | null
  alert_triggered: boolean
}

// base44 types
export interface Base44PaymentSchedule {
  id: string
  description: string
  amount: number
  scheduled_date: string
  status: 'Pending' | 'Overdue' | 'Paid'
  category?: string
}

export interface Base44Account {
  id: string
  name: string
  type: 'Debit' | 'Cash' | 'Savings'
  balance: number
  currency: string
}

export interface Base44CreditCard {
  id: string
  name: string
  current_balance: number
  credit_limit: number
  cut_date: string
  minimum_payment: number
}

export interface Base44SavingsGoal {
  id: string
  name: string
  target_amount: number
  current_amount: number
}

export interface Base44Debt {
  id: string
  name: string
  total_amount: number
  remaining_amount: number
  next_payment_date: string
  next_payment_amount: number
}

export interface Base44Income {
  id: string
  description: string
  amount: number
  date: string
}

export interface FinanzasData {
  payments: Base44PaymentSchedule[]
  accounts: Base44Account[]
  creditCards: Base44CreditCard[]
  savingsGoals: Base44SavingsGoal[]
  debts: Base44Debt[]
  incomes: Base44Income[]
}
