import { NextResponse } from 'next/server';

export const revalidate = 60; // cache for 1 minute

export interface LQ45StockItem {
  ticker: string;
  name: string;
  category: 'Bank' | 'Mining' | 'Telco' | 'Consumer' | 'Property';
  price: number;
  change: number;
  changePercent: number;
  fundamental: {
    per: number;
    pbv: number;
    roe: number;
    eps: number;
    marketCap: string;
    divYield: string;
    high52w: number;
    low52w: number;
    sentiment: 'Strong Buy' | 'Buy' | 'Hold';
    description: string;
  };
  miniChart: number[];
}

const LQ45_STOCKS: LQ45StockItem[] = [
  // BANKING
  {
    ticker: 'BBCA.JK',
    name: 'Bank Central Asia Tbk',
    category: 'Bank',
    price: 10150,
    change: 125,
    changePercent: 1.25,
    fundamental: {
      per: 21.4,
      pbv: 4.85,
      roe: 23.8,
      eps: 474,
      marketCap: 'Rp 1.251 Triliun',
      divYield: '2.8%',
      high52w: 10500,
      low52w: 8850,
      sentiment: 'Strong Buy',
      description: 'Bank swasta terbesar di Indonesia dengan CASA kuat dan profitabilitas konsisten tinggi.',
    },
    miniChart: [9850, 9900, 9875, 10000, 9950, 10050, 10100, 10150],
  },
  {
    ticker: 'BBRI.JK',
    name: 'Bank Rakyat Indonesia Tbk',
    category: 'Bank',
    price: 4880,
    change: 80,
    changePercent: 1.67,
    fundamental: {
      per: 13.2,
      pbv: 2.35,
      roe: 19.4,
      eps: 370,
      marketCap: 'Rp 739 Triliun',
      divYield: '6.4%',
      high52w: 6400,
      low52w: 4300,
      sentiment: 'Strong Buy',
      description: 'Pemimpin sektor kredit mikro UMKM dan pembayar dividen terbesar di perbankan nasional.',
    },
    miniChart: [4680, 4720, 4700, 4780, 4810, 4800, 4840, 4880],
  },
  {
    ticker: 'BMRI.JK',
    name: 'Bank Mandiri (Persero) Tbk',
    category: 'Bank',
    price: 6475,
    change: 100,
    changePercent: 1.57,
    fundamental: {
      per: 11.8,
      pbv: 2.18,
      roe: 21.1,
      eps: 548,
      marketCap: 'Rp 604 Triliun',
      divYield: '5.2%',
      high52w: 7450,
      low52w: 5800,
      sentiment: 'Strong Buy',
      description: 'Bank BUMN dengan aset korporasi terbesar dan rasio efisiensi operasional terbaik.',
    },
    miniChart: [6250, 6300, 6280, 6350, 6400, 6390, 6425, 6475],
  },
  {
    ticker: 'BBNI.JK',
    name: 'Bank Negara Indonesia Tbk',
    category: 'Bank',
    price: 5225,
    change: 50,
    changePercent: 0.97,
    fundamental: {
      per: 9.4,
      pbv: 1.28,
      roe: 14.8,
      eps: 556,
      marketCap: 'Rp 194 Triliun',
      divYield: '4.8%',
      high52w: 6125,
      low52w: 4600,
      sentiment: 'Buy',
      description: 'Fokus pada segmen korporasi internasional dan digitalisasi perbankan ekspor-impor.',
    },
    miniChart: [5100, 5125, 5150, 5130, 5180, 5200, 5190, 5225],
  },

  // MINING & ENERGY
  {
    ticker: 'ADRO.JK',
    name: 'Adaro Energy Indonesia Tbk',
    category: 'Mining',
    price: 3680,
    change: -40,
    changePercent: -1.08,
    fundamental: {
      per: 5.6,
      pbv: 1.15,
      roe: 22.4,
      eps: 658,
      marketCap: 'Rp 117 Triliun',
      divYield: '11.5%',
      high52w: 4200,
      low52w: 2580,
      sentiment: 'Buy',
      description: 'Raksasa energi termal dan metalurgi dengan diversifikasi agresif ke energi hijau alumunium.',
    },
    miniChart: [3750, 3720, 3740, 3700, 3690, 3710, 3700, 3680],
  },
  {
    ticker: 'PTBA.JK',
    name: 'Bukit Asam Tbk',
    category: 'Mining',
    price: 2710,
    change: 20,
    changePercent: 0.74,
    fundamental: {
      per: 6.8,
      pbv: 1.34,
      roe: 19.8,
      eps: 398,
      marketCap: 'Rp 31.2 Triliun',
      divYield: '14.2%',
      high52w: 3050,
      low52w: 2320,
      sentiment: 'Buy',
      description: 'BUMN pertambangan batu bara dengan cadangan terbesar dan imbal hasil dividen tertinggi.',
    },
    miniChart: [2650, 2670, 2660, 2680, 2690, 2700, 2690, 2710],
  },
  {
    ticker: 'ANTM.JK',
    name: 'Aneka Tambang Tbk',
    category: 'Mining',
    price: 1435,
    change: 35,
    changePercent: 2.50,
    fundamental: {
      per: 14.1,
      pbv: 1.45,
      roe: 11.2,
      eps: 102,
      marketCap: 'Rp 34.5 Triliun',
      divYield: '3.1%',
      high52w: 1850,
      low52w: 1220,
      sentiment: 'Strong Buy',
      description: 'Produsen emas dan nikel terintegrasi nasional penopang rantai pasok kendaraan listrik.',
    },
    miniChart: [1370, 1385, 1395, 1400, 1410, 1405, 1420, 1435],
  },

  // TELCO & INFRASTRUCTURE
  {
    ticker: 'TLKM.JK',
    name: 'Telkom Indonesia Tbk',
    category: 'Telco',
    price: 2980,
    change: 40,
    changePercent: 1.36,
    fundamental: {
      per: 11.5,
      pbv: 2.12,
      roe: 18.5,
      eps: 259,
      marketCap: 'Rp 295 Triliun',
      divYield: '5.8%',
      high52w: 4080,
      low52w: 2750,
      sentiment: 'Strong Buy',
      description: 'Pemimpin infrastruktur telekomunikasi, serat optik Indihome, dan data center terbesar di Indonesia.',
    },
    miniChart: [2890, 2910, 2900, 2930, 2950, 2940, 2960, 2980],
  },
  {
    ticker: 'ISAT.JK',
    name: 'Indosat Ooredoo Hutchison Tbk',
    category: 'Telco',
    price: 11425,
    change: 225,
    changePercent: 2.01,
    fundamental: {
      per: 18.4,
      pbv: 2.95,
      roe: 16.2,
      eps: 620,
      marketCap: 'Rp 92.1 Triliun',
      divYield: '2.5%',
      high52w: 12100,
      low52w: 8900,
      sentiment: 'Buy',
      description: 'Operator seluler pertumbuhan tercepat pasca-merger dengan jangkauan jaringan 5G ekspansif.',
    },
    miniChart: [11050, 11150, 11100, 11200, 11250, 11300, 11350, 11425],
  },

  // CONSUMER & RETAIL
  {
    ticker: 'ICBP.JK',
    name: 'Indofood CBP Sukses Makmur Tbk',
    category: 'Consumer',
    price: 11250,
    change: 150,
    changePercent: 1.35,
    fundamental: {
      per: 15.8,
      pbv: 3.10,
      roe: 20.4,
      eps: 712,
      marketCap: 'Rp 131 Triliun',
      divYield: '3.2%',
      high52w: 11800,
      low52w: 9850,
      sentiment: 'Strong Buy',
      description: 'Produsen Indomie dan FMCG dominan dengan pangsa pasar ekspor global di 100+ negara.',
    },
    miniChart: [10950, 11000, 11050, 11025, 11100, 11150, 11200, 11250],
  },
  {
    ticker: 'AMRT.JK',
    name: 'Sumber Alfaria Trijaya Tbk (Alfamart)',
    category: 'Consumer',
    price: 2840,
    change: 30,
    changePercent: 1.07,
    fundamental: {
      per: 32.5,
      pbv: 7.20,
      roe: 24.5,
      eps: 87,
      marketCap: 'Rp 118 Triliun',
      divYield: '1.2%',
      high52w: 3120,
      low52w: 2450,
      sentiment: 'Buy',
      description: 'Jaringan ritel minimarket terbesar di Indonesia dengan efisiensi logistik terdepan.',
    },
    miniChart: [2780, 2790, 2800, 2810, 2820, 2815, 2830, 2840],
  },

  // PROPERTY & MULTI
  {
    ticker: 'ASII.JK',
    name: 'Astra International Tbk',
    category: 'Property',
    price: 5125,
    change: 75,
    changePercent: 1.49,
    fundamental: {
      per: 7.2,
      pbv: 1.05,
      roe: 15.2,
      eps: 710,
      marketCap: 'Rp 207 Triliun',
      divYield: '8.1%',
      high52w: 5800,
      low52w: 4350,
      sentiment: 'Strong Buy',
      description: 'Konglomerasi otomotif, alat berat, pertambangan, dan properti terkemuka di Asia Tenggara.',
    },
    miniChart: [4980, 5000, 5025, 5050, 5040, 5080, 5100, 5125],
  },
  {
    ticker: 'CTRA.JK',
    name: 'Ciputra Development Tbk',
    category: 'Property',
    price: 1310,
    change: 25,
    changePercent: 1.95,
    fundamental: {
      per: 12.4,
      pbv: 1.18,
      roe: 10.1,
      eps: 106,
      marketCap: 'Rp 24.3 Triliun',
      divYield: '1.8%',
      high52w: 1420,
      low52w: 1050,
      sentiment: 'Buy',
      description: 'Pengembang kota mandiri terpopuler dengan land bank luas di seluruh kepulauan Indonesia.',
    },
    miniChart: [1265, 1275, 1280, 1285, 1290, 1295, 1300, 1310],
  },
];

import https from 'https';

function fetchLiveYahooQuote(ticker: string): Promise<{ price: number; change: number; changePercent: number } | null> {
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
            resolve(null);
            return;
          }
          const price = Number(meta.regularMarketPrice ?? 0);
          const prevClose = Number(meta.chartPreviousClose ?? meta.previousClose ?? price);
          const change = price - prevClose;
          const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
          resolve({ price, change, changePercent });
        } catch (err) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

export async function GET() {
  // Fetch live IHSG and all LQ45 stock prices in parallel
  const ihsgQuotePromise = fetchLiveYahooQuote('^JKSE');
  const stockQuotesPromises = LQ45_STOCKS.map((s) => fetchLiveYahooQuote(s.ticker));

  const [ihsgQuote, ...stockQuotes] = await Promise.all([ihsgQuotePromise, ...stockQuotesPromises]);

  const ihsg = {
    ticker: '^JKSE',
    name: 'IHSG (Indeks Harga Saham Gabungan)',
    price: ihsgQuote?.price ? Math.round(ihsgQuote.price * 100) / 100 : 7325.45,
    change: ihsgQuote ? Math.round(ihsgQuote.change * 100) / 100 : 48.25,
    changePercent: ihsgQuote ? Math.round(ihsgQuote.changePercent * 100) / 100 : 0.66,
  };

  const stocks = LQ45_STOCKS.map((s, idx) => {
    const live = stockQuotes[idx];
    if (live && live.price > 0) {
      const price = Math.round(live.price);
      const change = Math.round(live.change);
      const changePercent = Math.round(live.changePercent * 100) / 100;
      // update miniChart last point to reflect live price
      const updatedChart = [...s.miniChart];
      updatedChart[updatedChart.length - 1] = price;
      return {
        ...s,
        price,
        change,
        changePercent,
        miniChart: updatedChart,
      };
    }
    return s;
  });

  return NextResponse.json({
    ihsg,
    stocks,
  });
}
