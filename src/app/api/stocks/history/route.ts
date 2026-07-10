import { NextResponse } from 'next/server';
import https from 'https';

export const revalidate = 300; // cache for 5 minutes

interface HistoryPoint {
  date: string;
  dateFull: string;
  price: number;
}

function fetchHistoricalChart(ticker: string): Promise<HistoryPoint[]> {
  return new Promise((resolve) => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1mo&interval=1d`;
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
          const result = json?.chart?.result?.[0];
          if (!result) {
            resolve([]);
            return;
          }

          const timestamps: number[] = result.timestamp || [];
          const closes: (number | null)[] = result.indicators?.quote?.[0]?.close || [];

          const points: HistoryPoint[] = [];
          for (let i = 0; i < timestamps.length; i++) {
            const price = closes[i];
            if (typeof price === 'number' && !isNaN(price) && price > 0) {
              const d = new Date(timestamps[i] * 1000);
              const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
              const dateFull = d.toISOString().split('T')[0];
              points.push({
                date: dateStr,
                dateFull,
                price: Math.round(price),
              });
            }
          }

          resolve(points);
        } catch (err) {
          console.error(`Error parsing historical chart for ${ticker}:`, err);
          resolve([]);
        }
      });
    }).on('error', (err) => {
      console.error(`Network error fetching historical chart for ${ticker}:`, err);
      resolve([]);
    });
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let ticker = (searchParams.get('ticker') || 'BBCA.JK').toUpperCase().trim();
  if (!ticker.endsWith('.JK')) {
    ticker = `${ticker}.JK`;
  }

  try {
    const history = await fetchHistoricalChart(ticker);
    return NextResponse.json({ ticker, history });
  } catch (err) {
    console.error('Error in history route:', err);
    return NextResponse.json({ ticker, history: [] }, { status: 500 });
  }
}
