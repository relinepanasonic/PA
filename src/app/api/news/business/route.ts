import { NextResponse } from 'next/server';

export const revalidate = 1800; // cache for 30 minutes

interface NewsItem {
  title: string;
  url: string;
  source: string;
}

let cachedBusinessNews: { data: NewsItem[]; timestamp: number } | null = null;
const CACHE_DURATION = 30 * 60 * 1000;

export async function GET() {
  if (cachedBusinessNews && Date.now() - cachedBusinessNews.timestamp < CACHE_DURATION) {
    return NextResponse.json({
      news: cachedBusinessNews.data,
      cached: true,
    });
  }

  const apiKey = process.env.GNEWS_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch(
        `https://gnews.io/api/v4/top-headlines?country=id&lang=id&topic=business&max=5&apikey=${apiKey}`,
        { next: { revalidate: 1800 } }
      );
      if (res.ok) {
        const json = await res.json();
        const articles = (json.articles || []).slice(0, 5).map((a: any) => ({
          title: a.title,
          url: a.url,
          source: a.source?.name || 'Ekonomi Bisnis',
        }));
        if (articles.length > 0) {
          cachedBusinessNews = { data: articles, timestamp: Date.now() };
          return NextResponse.json({ news: articles });
        }
      }
    } catch (err) {
      console.error('GNews business fetch error:', err);
    }
  }

  // Fallback: fetch Google News RSS Business Section for Indonesia
  try {
    const rssUrl = 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=id&gl=ID&ceid=ID:id';
    const res = await fetch(rssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 1800 },
    });

    if (res.ok) {
      const xml = await res.text();
      const items: NewsItem[] = [];

      // Regex to parse RSS item
      const itemRegex = /<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?(?:<source[^>]*>(.*?)<\/source>)?[\s\S]*?<\/item>/g;
      let match;
      while ((match = itemRegex.exec(xml)) !== null && items.length < 5) {
        let title = match[1] || '';
        title = title.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
        let source = (match[3] || '').replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();

        // Often Google News title ends with "- SourceName"
        if (!source && title.includes(' - ')) {
          const parts = title.split(' - ');
          source = parts.pop() || 'Google News';
          title = parts.join(' - ');
        }

        items.push({
          title,
          url: match[2].trim(),
          source: source || 'Berita Ekonomi IDX',
        });
      }

      if (items.length > 0) {
        cachedBusinessNews = { data: items, timestamp: Date.now() };
        return NextResponse.json({ news: items });
      }
    }
  } catch (err) {
    console.error('RSS Business fetch error:', err);
  }

  // Fallback default curated business headlines if network fails
  const fallbackNews: NewsItem[] = [
    {
      title: 'IHSG & Saham LQ45 Diprediksi Menguat Seiring Optimisme Kinerja Keuangan Emiten Kuartal Terkini',
      url: 'https://idx.co.id',
      source: 'IDX Bursa Efek Indonesia',
    },
    {
      title: 'Bank Central Asia (BBCA) Catatkan Likuiditas Stabil dan Penyaluran Kredit Ekspansif',
      url: 'https://www.bca.co.id',
      source: 'Investor Daily',
    },
    {
      title: 'Tren Investasi Saham Domestik Meningkat, Investor Ritel Diimbau Perhatikan Fundamental & Manajemen Risiko',
      url: 'https://idx.co.id',
      source: 'Bisnis Indonesia',
    },
    {
      title: 'Kinerja Sektor Perbankan dan Infrastruktur Jadi Motor Utama Pergerakan Indeks LQ45',
      url: 'https://idx.co.id',
      source: 'Kontan Bisnis',
    },
  ];

  return NextResponse.json({ news: fallbackNews, fallback: true });
}
