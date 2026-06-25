import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPrices } from '@/lib/yahoo-finance'
import { sendMessage, bold } from '@/lib/telegram'

export async function GET() {
  const supabase = createClient()
  const { data: positions, error } = await supabase.from('portfolio_positions').select('*')

  if (error || !positions?.length) return NextResponse.json({ ok: true, alerts: 0 })

  const prices = await getPrices(positions.map(p => ({ ticker: p.ticker, market: p.market })))

  const alerts = positions.filter(p => {
    const current = prices[`${p.ticker}-${p.market}`]
    if (current === null || current === undefined) return false
    const pnlPct = ((current - p.purchase_price) / p.purchase_price) * 100
    return pnlPct <= -Math.abs(p.alert_threshold_pct)
  })

  if (alerts.length === 0) return NextResponse.json({ ok: true, alerts: 0 })

  const lines = [
    bold('⚠️ Alerta de Portfolio — Caída significativa:'),
    ...alerts.map(p => {
      const current = prices[`${p.ticker}-${p.market}`]!
      const pnlPct = ((current - p.purchase_price) / p.purchase_price) * 100
      return `• ${p.ticker}: ${pnlPct.toFixed(2)}% (umbral: -${p.alert_threshold_pct}%)`
    }),
  ]

  await sendMessage(lines.join('\n'))
  return NextResponse.json({ ok: true, alerts: alerts.length })
}
