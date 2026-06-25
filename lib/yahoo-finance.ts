import yahooFinance from 'yahoo-finance2'

export async function getPrice(ticker: string, market: 'usa' | 'mx'): Promise<number | null> {
  const symbol = market === 'mx' ? `${ticker}.MX` : ticker
  try {
    const quote = await yahooFinance.quote(symbol)
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
