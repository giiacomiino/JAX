import YahooFinanceClass from 'yahoo-finance2'

const yf = new YahooFinanceClass({ suppressNotices: ['yahooSurvey'] })

function buildSymbol(ticker: string, market: 'usa' | 'mx'): string {
  const clean = ticker.replace(/\s+/g, '')
  if (market === 'mx') return clean.toUpperCase().endsWith('.MX') ? clean : `${clean}.MX`
  return clean
}

export async function getPrice(ticker: string, market: 'usa' | 'mx'): Promise<number | null> {
  const symbol = buildSymbol(ticker, market)
  try {
    const quote = await yf.quote(symbol, {}, { validateResult: false })
    return (quote as { regularMarketPrice?: number }).regularMarketPrice ?? null
  } catch {
    return null
  }
}

export async function getPrices(
  positions: Array<{ ticker: string; market: 'usa' | 'mx' }>
): Promise<Record<string, number | null>> {
  const results = await Promise.all(
    positions.map(async p => ({
      key: `${p.ticker}-${p.market}`,
      price: await getPrice(p.ticker, p.market),
    }))
  )
  return Object.fromEntries(results.map(r => [r.key, r.price]))
}
