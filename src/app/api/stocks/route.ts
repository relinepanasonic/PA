import { NextResponse } from 'next/server';

export const revalidate = 300; // cache for 5 minutes

interface StockResult {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
}

export async function GET() {
  const tickers = ['BBCA.JK', 'ELTY.JK'];

  try {
    // Dynamic import to avoid SSR bundling issues
    const yahooFinance = (await import('yahoo-finance2')).default;

    const results: StockResult[] = [];

    for (const ticker of tickers) {
      try {
        const quote: any = await yahooFinance.quote(ticker);
        results.push({
          ticker,
          name: quote?.shortName || quote?.longName || ticker,
          price: quote?.regularMarketPrice ?? 0,
          change: quote?.regularMarketChange ?? 0,
          changePercent: quote?.regularMarketChangePercent ?? 0,
          currency: quote?.currency || 'IDR',
        });
      } catch (err) {
        console.error(`Failed to fetch ${ticker}:`, err);
        results.push({
          ticker,
          name: ticker.replace('.JK', ''),
          price: 0,
          change: 0,
          changePercent: 0,
          currency: 'IDR',
        });
      }
    }

    return NextResponse.json({ stocks: results }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (error) {
    console.error('Stock API error:', error);
    return NextResponse.json({ stocks: [], error: 'Failed to fetch stock data' }, { status: 500 });
  }
}
