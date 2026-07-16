import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import YahooFinanceClass from 'yahoo-finance2'

const yf = new YahooFinanceClass({ suppressNotices: ['yahooSurvey'] })

export async function GET() {
  const supabase = createAdminClient()
  const { data: positions } = await supabase
    .from('portfolio_positions')
    .select('ticker, market')

  if (!positions?.length) return NextResponse.json({})

  const period1 = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000)
  const period2 = new Date()

  const results: Record<string, { dates: string[]; closes: number[] } | null> = {}

  function buildSymbol(ticker: string, market: string): string {
    const clean = ticker.replace(/\s+/g, '')
    if (market === 'mx') return clean.toUpperCase().endsWith('.MX') ? clean : `${clean}.MX`
    return clean
  }

  await Promise.all(
    positions.map(async (p) => {
      const symbol = buildSymbol(p.ticker, p.market)
      const key = `${p.ticker}-${p.market}`
      try {
        const history = await yf.historical(
          symbol,
          { period1, period2, interval: '1wk' },
          { validateResult: false }
        )
        const filtered = history.filter((h: { close: number | null; date: Date }) => h.close && h.close > 0)
        results[key] = filtered.length
          ? {
              dates: filtered.map((h: { date: Date }) => h.date.toISOString().slice(0, 10)),
              closes: filtered.map((h: { close: number }) => h.close),
            }
          : null
      } catch {
        results[key] = null
      }
    })
  )

  return NextResponse.json(results, {
    headers: { 'Cache-Control': 's-maxage=300' },
  })
}
