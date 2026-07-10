import { NextResponse } from 'next/server';

export const revalidate = 3600; // cache for 1 hour

interface NewsItem {
  title: string;
  url: string;
  source: string;
}

// In-memory cache
let cachedNews: { data: NewsItem[]; timestamp: number } | null = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in ms

async function fetchFromGNews(): Promise<NewsItem[]> {
  // GNews free tier — top headlines for Indonesia
  const apiKey = process.env.GNEWS_API_KEY;

  if (apiKey) {
    try {
      const res = await fetch(
        `https://gnews.io/api/v4/top-headlines?country=id&lang=id&max=5&apikey=${apiKey}`,
        { next: { revalidate: 3600 } }
      );
      if (res.ok) {
        const json = await res.json();
        return (json.articles || []).slice(0, 5).map((a: any) => ({
          title: a.title,
          url: a.url,
          source: a.source?.name || 'Unknown',
        }));
      }
    } catch (err) {
      console.error('GNews fetch error:', err);
    }
  }

  // Fallback: fetch from Google News RSS via a public proxy
  try {
    const rssUrl = 'https://news.google.com/rss?hl=id&gl=ID&ceid=ID:id';
    const res = await fetch(rssUrl, { next: { revalidate: 3600 } });
    if (res.ok) {
      const xml = await res.text();
      // Simple XML parse for <item><title>...</title></item>
      const items: NewsItem[] = [];
      const itemRegex = /<item>[\s\S]*?<title><!\[CDATA\[(.*?)\]\]><\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<source[^>]*>(.*?)<\/source>[\s\S]*?<\/item>/g;
      let match;
      while ((match = itemRegex.exec(xml)) !== null && items.length < 5) {
        items.push({
          title: match[1].trim(),
          url: match[2].trim(),
          source: match[3]?.trim() || 'Google News',
        });
      }
      if (items.length > 0) return items;

      // Fallback regex without CDATA
      const simpleRegex = /<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<\/item>/g;
      let simpleMatch;
      const simpleItems: NewsItem[] = [];
      while ((simpleMatch = simpleRegex.exec(xml)) !== null && simpleItems.length < 5) {
        const title = simpleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim();
        if (title && !title.includes('Google News')) {
          simpleItems.push({
            title,
            url: simpleMatch[2].trim(),
            source: 'Google News',
          });
        }
      }
      return simpleItems;
    }
  } catch (err) {
    console.error('Google News RSS fetch error:', err);
  }

  return [];
}

export async function GET() {
  try {
    // Check in-memory cache
    if (cachedNews && Date.now() - cachedNews.timestamp < CACHE_DURATION) {
      return NextResponse.json({ news: cachedNews.data, cached: true }, {
        headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
      });
    }

    const news = await fetchFromGNews();

    cachedNews = { data: news, timestamp: Date.now() };

    return NextResponse.json({ news, cached: false }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    });
  } catch (error) {
    console.error('News API error:', error);
    return NextResponse.json({ news: [], error: 'Failed to fetch news' }, { status: 500 });
  }
}
