import { NextResponse } from 'next/server'
import { createAdminClient as createClient } from '@/lib/supabase/admin'
import { getPrices } from '@/lib/yahoo-finance'
import type { CreatePositionInput, PositionWithPrice } from '@/types'

export async function GET() {
  const supabase = createClient()
  const { data: positions, error } = await supabase
    .from('portfolio_positions')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const prices = await getPrices(positions.map(p => ({ ticker: p.ticker, market: p.market })))

  const withPrices: PositionWithPrice[] = positions.map(p => {
    const current_price = prices[`${p.ticker}-${p.market}`] ?? null
    const value_total = current_price !== null ? current_price * p.shares : null
    const pnl_amount = current_price !== null ? (current_price - p.purchase_price) * p.shares : null
    const pnl_pct = current_price !== null ? ((current_price - p.purchase_price) / p.purchase_price) * 100 : null
    const alert_triggered = pnl_pct !== null && pnl_pct <= -Math.abs(p.alert_threshold_pct)
    return { ...p, current_price, value_total, pnl_amount, pnl_pct, alert_triggered }
  })

  return NextResponse.json(withPrices, {
    headers: { 'Cache-Control': 'no-store' },
  })
}

export async function POST(request: Request) {
  const body: CreatePositionInput = await request.json()

  if (!body.ticker?.trim()) {
    return NextResponse.json({ error: 'El ticker es requerido' }, { status: 400 })
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('portfolio_positions')
    .insert({
      ticker: body.ticker.trim().toUpperCase(),
      market: body.market,
      purchase_price: body.purchase_price,
      shares: body.shares,
      alert_threshold_pct: body.alert_threshold_pct,
      currency: body.currency,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
