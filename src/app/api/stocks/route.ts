import { NextResponse } from 'next/server';
import https from 'https';

export const revalidate = 60; // cache for 60 seconds

interface StockResult {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
}

function fetchYahooChart(ticker: string): Promise<StockResult> {
  return new Promise((resolve) => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`;
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      rejectUnauthorized: false,
    };

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const meta = json?.chart?.result?.[0]?.meta;
          if (!meta) {
            throw new Error('No chart meta found');
          }

          const price = Number(meta.regularMarketPrice ?? 0);
          const prevClose = Number(meta.chartPreviousClose ?? meta.previousClose ?? price);
          const change = price - prevClose;
          const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

          resolve({
            ticker,
            name: meta.shortName || meta.longName || ticker.replace('.JK', ''),
            price,
            change,
            changePercent,
            currency: meta.currency || 'IDR',
          });
        } catch (err) {
          console.error(`Error parsing stock data for ${ticker}:`, err);
          resolve({
            ticker,
            name: ticker.replace('.JK', ''),
            price: 0,
            change: 0,
            changePercent: 0,
            currency: 'IDR',
          });
        }
      });
    }).on('error', (err) => {
      console.error(`Network error fetching ${ticker}:`, err);
      resolve({
        ticker,
        name: ticker.replace('.JK', ''),
        price: 0,
        change: 0,
        changePercent: 0,
        currency: 'IDR',
      });
    });
  });
}

export async function GET() {
  const tickers = ['BBCA.JK', 'ELTY.JK'];

  try {
    const results = await Promise.all(tickers.map((t) => fetchYahooChart(t)));

    return NextResponse.json(
      { stocks: results },
      {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
      }
    );
  } catch (error) {
    console.error('Stock API error:', error);
    return NextResponse.json({ stocks: [], error: 'Failed to fetch stock data' }, { status: 500 });
  }
}
