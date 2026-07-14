'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  LineChart,
  RefreshCw,
  ExternalLink,
  Newspaper,
  Sparkles,
  AlertCircle,
  ChevronRight,
  BarChart2,
  Layers,
  Wallet,
  Activity,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Modal from '@/components/ui/Modal';
import CurrencyInput from '@/components/ui/CurrencyInput';
import Badge from '@/components/ui/Badge';
import { PortfolioStock } from '@/lib/types/database';
import { LQ45StockItem } from '@/app/api/stocks/lq45/route';

interface HistoryPoint {
  date: string;
  dateFull: string;
  price: number;
}

interface BusinessNews {
  title: string;
  url: string;
  source: string;
}

// Helper SVG Mini Sparkline inside cards
function MiniSparkline({ data, isUp }: { data: number[]; isUp: boolean }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 120;
  const height = 36;

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 8) - 4;
      return `${x},${y}`;
    })
    .join(' ');

  const strokeColor = isUp ? '#34d399' : '#f87171';
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export default function InvestasiPage() {
  const [portfolio, setPortfolio] = useState<PortfolioStock[]>([]);
  const [lq45Stocks, setLq45Stocks] = useState<LQ45StockItem[]>([]);
  const [ihsgData, setIhsgData] = useState<{
    ticker: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
  } | null>(null);

  // Sector filter for horizontal LQ45 carousel
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // IHSG 30-day Chart
  const [ihsgHistory, setIhsgHistory] = useState<HistoryPoint[]>([]);
  const [ihsgChartLoading, setIhsgChartLoading] = useState(true);

  // Selected Stock Detail Modal (Technical & Fundamental)
  const [selectedStockDetail, setSelectedStockDetail] = useState<LQ45StockItem | null>(null);
  const [stockHistory, setStockHistory] = useState<HistoryPoint[]>([]);
  const [stockHistoryLoading, setStockHistoryLoading] = useState(false);

  // Add Portfolio Form inside Detail Modal or standalone Add Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [formTicker, setFormTicker] = useState('');
  const [formBuyPrice, setFormBuyPrice] = useState('');
  const [formLots, setFormLots] = useState('1');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Business News
  const [news, setNews] = useState<BusinessNews[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);

  // Loading state
  const [loading, setLoading] = useState(true);

  // Load Portfolio & LQ45 Snapshot
  const fetchPageData = useCallback(async () => {
    setLoading(true);
    try {
      const [portRes, lqRes] = await Promise.all([
        fetch('/api/investasi/portfolio'),
        fetch('/api/stocks/lq45'),
      ]);

      if (portRes.ok) {
        const pData = await portRes.json();
        setPortfolio(pData.portfolio || []);
      }

      if (lqRes.ok) {
        const lqData = await lqRes.json();
        setLq45Stocks(lqData.stocks || []);
        setIhsgData(lqData.ihsg || null);
      }
    } catch (err) {
      console.error('Failed fetching investasi data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch IHSG 30-day History
  const fetchIhsgHistory = useCallback(async () => {
    setIhsgChartLoading(true);
    try {
      const res = await fetch('/api/stocks/history?ticker=%5EJKSE');
      if (res.ok) {
        const data = await res.json();
        setIhsgHistory(data.history || []);
      }
    } catch (err) {
      console.error('Error fetching IHSG history:', err);
    } finally {
      setIhsgChartLoading(false);
    }
  }, []);

  // Fetch stock detail 30-day chart when clicked
  const handleOpenStockDetail = async (stock: LQ45StockItem) => {
    setSelectedStockDetail(stock);
    setFormTicker(stock.ticker);
    setStockHistoryLoading(true);
    try {
      const res = await fetch(`/api/stocks/history?ticker=${encodeURIComponent(stock.ticker)}`);
      if (res.ok) {
        const data = await res.json();
        setStockHistory(data.history || []);
      }
    } catch (err) {
      console.error('Error fetching stock history:', err);
    } finally {
      setStockHistoryLoading(false);
    }
  };

  // Fetch Business News
  const fetchBusinessNews = useCallback(async () => {
    setNewsLoading(true);
    try {
      const res = await fetch('/api/news/business');
      if (res.ok) {
        const data = await res.json();
        setNews(data.news || []);
      }
    } catch (err) {
      console.error('Failed loading business news:', err);
    } finally {
      setNewsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPageData();
    fetchIhsgHistory();
    fetchBusinessNews();
  }, [fetchPageData, fetchIhsgHistory, fetchBusinessNews]);

  // Handle Add Stock submission
  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formTicker.trim() || !formBuyPrice || !formLots) {
      setErrorMsg('Semua kolom wajib diisi');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/investasi/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: formTicker,
          buy_price: parseFloat(formBuyPrice),
          lots: parseFloat(formLots),
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setSelectedStockDetail(null);
        setFormTicker('');
        setFormBuyPrice('');
        setFormLots('1');
        await fetchPageData();
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Gagal menambahkan saham');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menambahkan saham');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStock = async (id: string) => {
    if (!confirm('Hapus saham ini dari portofolio?')) return;
    try {
      const res = await fetch(`/api/investasi/portfolio?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchPageData();
      }
    } catch (err) {
      console.error('Failed deleting stock:', err);
    }
  };

  // Build live quote map for portfolio lookup
  const liveQuoteMap: Record<string, LQ45StockItem> = {};
  lq45Stocks.forEach((item) => {
    liveQuoteMap[item.ticker.toUpperCase()] = item;
  });

  // Calculate Overall Portfolio Value & PnL (1 Lot = 100 shares)
  let totalInvestedModal = 0;
  let totalCurrentValue = 0;

  portfolio.forEach((item) => {
    const quote = liveQuoteMap[item.ticker];
    const currentPrice = quote ? quote.price : item.buy_price;
    const totalShares = item.lots * 100;

    totalInvestedModal += item.buy_price * totalShares;
    totalCurrentValue += currentPrice * totalShares;
  });

  const totalPnL = totalCurrentValue - totalInvestedModal;
  const totalPnLPercent = totalInvestedModal > 0 ? (totalPnL / totalInvestedModal) * 100 : 0;

  // Filtered LQ45 cards
  const categories = ['All', 'Bank', 'Mining', 'Telco', 'Consumer', 'Property'];
  const filteredLq45 =
    selectedCategory === 'All'
      ? lq45Stocks
      : lq45Stocks.filter((s) => s.category === selectedCategory);

  return (
    <div className="space-y-7 pb-10 animate-fade-in">
      {/* ── SECTION 1: MY BALANCE HEADER (Hero Neon Wallet Concept) ───────────── */}
      <div className="glow-card rounded-[32px] p-6 border border-white/15 bg-gradient-to-br from-slate-900/90 via-[#0b1729] to-blue-950/80 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-400/30">
                <Wallet size={18} />
              </div>
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                My Balance · Portofolio Saham
              </span>
            </div>
            <button
              onClick={() => {
                fetchPageData();
                fetchIhsgHistory();
              }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw size={15} />
            </button>
          </div>

          <div className="flex flex-wrap items-baseline justify-between gap-4 mt-1">
            <div>
              <p className="text-3xl md:text-4xl font-black text-white tracking-tight">
                Rp {Math.round(totalCurrentValue).toLocaleString('id-ID')}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Modal Terinvestasi: Rp {Math.round(totalInvestedModal).toLocaleString('id-ID')} ({portfolio.length} Emiten)
              </p>
            </div>

            {/* Small Sleek Pill Badge for Total Profit/Loss */}
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl border backdrop-blur-md shadow-lg ${
                totalPnL >= 0
                  ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-400'
                  : 'bg-red-500/15 border-red-400/30 text-red-400'
              }`}
            >
              {totalPnL >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
              <div>
                <p className="text-xs font-black">
                  {totalPnL >= 0 ? '+' : ''}Rp {Math.round(totalPnL).toLocaleString('id-ID')}
                </p>
                <p className="text-[10px] opacity-85">
                  ({totalPnL >= 0 ? '+' : ''}
                  {totalPnLPercent.toFixed(2)}% Total Return)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: CHART IHSG (^JKSE) ──────────────────────────────────── */}
      <section className="glass-card rounded-3xl p-5 border border-white/10 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-400">
                <Activity size={16} />
              </span>
              <h2 className="text-base font-extrabold text-white">
                Indeks Harga Saham Gabungan (IHSG — ^JKSE)
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Sentimen Pasar Modal Indonesia 30 Hari Terakhir</p>
          </div>

          {ihsgData && (
            <div className="flex items-center gap-3">
              <span className="text-xl font-black text-white font-mono">
                {ihsgData.price.toLocaleString('id-ID', { minimumFractionDigits: 2 })}
              </span>
              <div
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold ${
                  ihsgData.changePercent >= 0
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-red-500/15 text-red-400 border border-red-500/30'
                }`}
              >
                {ihsgData.changePercent >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                {ihsgData.changePercent >= 0 ? '+' : ''}
                {ihsgData.changePercent.toFixed(2)}%
              </div>
            </div>
          )}
        </div>

        {/* Recharts AreaChart IHSG */}
        <div className="h-44 w-full pt-1">
          {ihsgChartLoading ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs gap-2">
              <RefreshCw className="animate-spin" size={16} />
              <span>Memuat grafik IHSG...</span>
            </div>
          ) : ihsgHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ihsgHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIhsg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis
                  domain={['auto', 'auto']}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  tickFormatter={(v) => v.toLocaleString('id-ID')}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0a1628',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(val: any) => [Number(val).toLocaleString('id-ID'), 'Level IHSG']}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorIhsg)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
              Grafik IHSG saat ini sedang disinkronkan
            </div>
          )}
        </div>
      </section>

      {/* ── SECTION 3: MINI CARDS OF LQ45 (Horizontal Swipe with Filter) ──────── */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <Layers size={18} className="text-blue-400" />
              Saham Unggulan LQ45 (Swipe Horizontal)
            </h2>
            <p className="text-xs text-slate-400">Klik kartu saham untuk melihat detail teknikal & fundamental</p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/25 scale-105'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Horizontal Swipe Carousel */}
        <div className="flex overflow-x-auto gap-3.5 pb-2 pt-1 scroll-smooth no-scrollbar">
          {filteredLq45.map((s) => {
            const isUp = s.changePercent >= 0;
            return (
              <div
                key={s.ticker}
                onClick={() => handleOpenStockDetail(s)}
                className="min-w-[210px] w-[210px] flex-shrink-0 glow-card rounded-3xl p-4 border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-800/40 hover:border-blue-400/40 cursor-pointer transition-all hover:-translate-y-1 group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-white text-sm tracking-tight">
                      {s.ticker.replace('.JK', '')}
                    </span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold">
                      {s.category}
                    </span>
                  </div>
                  <ChevronRight size={14} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
                </div>

                <div className="flex items-baseline justify-between mb-3">
                  <span className="text-lg font-black text-white font-mono">
                    Rp {s.price.toLocaleString('id-ID')}
                  </span>
                  <span
                    className={`text-xs font-bold flex items-center ${
                      isUp ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {isUp ? '+' : ''}
                    {s.changePercent.toFixed(2)}%
                  </span>
                </div>

                {/* Mini Sparkline SVG right inside card */}
                <div className="flex justify-center pt-1 border-t border-white/5">
                  <MiniSparkline data={s.miniChart} isUp={isUp} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── SECTION 4: MY PORTFOLIO ("Coins Price List" style) ────────────────── */}
      <section className="glass-card rounded-3xl p-5 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <BarChart2 size={18} className="text-cyan-400" />
              Daftar Portofolio Saya
            </h2>
            <p className="text-xs text-slate-400">1 Lot = 100 lembar saham · Perhitungan laba/rugi real-time</p>
          </div>
          <button
            onClick={() => {
              setFormTicker('');
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold text-xs shadow-md shadow-blue-500/25 transition-all"
          >
            <Plus size={14} />
            <span>Tambah Saham</span>
          </button>
        </div>

        {loading ? (
          <div className="py-10 flex items-center justify-center text-slate-400 text-xs gap-2">
            <RefreshCw className="animate-spin" size={16} />
            <span>Memuat data portofolio...</span>
          </div>
        ) : portfolio.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs border border-dashed border-white/10 rounded-2xl">
            Belum ada saham di portofolio kamu. Klik tombol &quot;Tambah Saham&quot; atau pilih kartu saham LQ45 di atas.
          </div>
        ) : (
          <div className="space-y-2.5">
            {portfolio.map((item) => {
              const quote = liveQuoteMap[item.ticker];
              const currentPrice = quote ? quote.price : item.buy_price;
              const totalShares = item.lots * 100;
              const totalInvested = item.buy_price * totalShares;
              const totalVal = currentPrice * totalShares;
              const pnl = totalVal - totalInvested;
              const pnlPercent = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;
              const isProfit = pnl >= 0;

              return (
                <div
                  key={item.id}
                  onClick={() => quote && handleOpenStockDetail(quote)}
                  className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 flex flex-wrap items-center justify-between gap-3 transition-all cursor-pointer group"
                >
                  {/* Left: Icon Ticker + Emiten Info */}
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-blue-500/15 border border-blue-400/30 flex items-center justify-center font-black text-blue-400 text-xs tracking-tight flex-shrink-0">
                      {item.ticker.replace('.JK', '')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">
                          {item.ticker.replace('.JK', '')}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">.JK</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Avg: Rp {item.buy_price.toLocaleString('id-ID')} · {item.lots} Lot ({totalShares.toLocaleString('id-ID')} lbr)
                      </p>
                    </div>
                  </div>

                  {/* Middle: Total Value */}
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">
                      Rp {Math.round(totalVal).toLocaleString('id-ID')}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Terkini: Rp {currentPrice.toLocaleString('id-ID')}
                    </p>
                  </div>

                  {/* Right: Real-time PnL & Delete */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`px-3 py-1.5 rounded-xl border text-right ${
                        isProfit
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-red-500/10 border-red-500/30 text-red-400'
                      }`}
                    >
                      <p className="text-xs font-black">
                        {isProfit ? '+' : ''}Rp {Math.round(pnl).toLocaleString('id-ID')}
                      </p>
                      <p className="text-[10px] font-semibold opacity-90">
                        {isProfit ? '+' : ''}
                        {pnlPercent.toFixed(2)}%
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteStock(item.id);
                      }}
                      className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 opacity-60 hover:opacity-100 transition-all"
                      title="Hapus saham dari portofolio"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── SECTION 5: NEWS SECTION (Ekonomi & Bisnis) ────────────────────────── */}
      <section className="glass-card rounded-3xl p-5 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <Newspaper size={18} className="text-amber-400" />
              Berita Ekonomi & Bisnis Terkini
            </h2>
            <p className="text-xs text-slate-400">Rangkuman peristiwa pasar keuangan dan bursa nasional</p>
          </div>
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/10 text-slate-400 font-medium">
            Live Feed
          </span>
        </div>

        {newsLoading ? (
          <div className="py-8 flex items-center justify-center text-slate-400 text-xs gap-2">
            <RefreshCw className="animate-spin" size={16} />
            <span>Memuat berita ekonomi...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {news.map((n, idx) => (
              <a
                key={idx}
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                      {n.source}
                    </span>
                    <ExternalLink size={13} className="text-slate-500 group-hover:text-amber-400 transition-colors" />
                  </div>
                  <h3 className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors leading-relaxed line-clamp-2">
                    {n.title}
                  </h3>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* ── POPUP MODAL: STOCK DETAIL TECHNICAL & FUNDAMENTAL ────────────────── */}
      <Modal
        isOpen={!!selectedStockDetail}
        onClose={() => setSelectedStockDetail(null)}
        title={
          selectedStockDetail
            ? `${selectedStockDetail.name} (${selectedStockDetail.ticker.replace('.JK', '')})`
            : 'Detail Saham'
        }
      >
        {selectedStockDetail && (
          <div className="space-y-5">
            {/* Price Header inside Modal */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <div>
                <p className="text-2xl font-black text-white font-mono">
                  Rp {selectedStockDetail.price.toLocaleString('id-ID')}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{selectedStockDetail.fundamental.description}</p>
              </div>
              <div
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1 ${
                  selectedStockDetail.changePercent >= 0
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-red-500/15 text-red-400 border border-red-500/30'
                }`}
              >
                {selectedStockDetail.changePercent >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {selectedStockDetail.changePercent >= 0 ? '+' : ''}
                {selectedStockDetail.changePercent.toFixed(2)}%
              </div>
            </div>

            {/* 30-Day Technical Chart */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Grafik Pergerakan Harga 30 Hari Terakhir
              </h4>
              <div className="h-44 w-full">
                {stockHistoryLoading ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs gap-2">
                    <RefreshCw className="animate-spin" size={16} />
                    <span>Memuat riwayat saham...</span>
                  </div>
                ) : stockHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stockHistory}>
                      <defs>
                        <linearGradient id="colorStockDetail" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis
                        domain={['auto', 'auto']}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                        tickFormatter={(v) => `Rp ${v.toLocaleString('id-ID')}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0a1628',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '0.75rem',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                        formatter={(val: any) => [`Rp ${Number(val).toLocaleString('id-ID')}`, 'Harga']}
                      />
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke="#3b82f6"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorStockDetail)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                    Data grafik teknikal siap ditampilkan
                  </div>
                )}
              </div>
            </div>

            {/* Fundamental & Technical Snapshot Grid */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Snapshot Fundamental & Valuasi
              </h4>
              <div className="grid grid-cols-3 gap-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-slate-400 block">PER (P/E Ratio)</span>
                  <span className="font-bold text-white text-sm">{selectedStockDetail.fundamental.per}x</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-slate-400 block">PBV Ratio</span>
                  <span className="font-bold text-white text-sm">{selectedStockDetail.fundamental.pbv}x</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-slate-400 block">ROE (Return on Equity)</span>
                  <span className="font-bold text-emerald-400 text-sm">{selectedStockDetail.fundamental.roe}%</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-slate-400 block">EPS (Laba/Saham)</span>
                  <span className="font-bold text-white text-sm">Rp {selectedStockDetail.fundamental.eps}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-slate-400 block">Dividen Yield</span>
                  <span className="font-bold text-cyan-400 text-sm">{selectedStockDetail.fundamental.divYield}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-slate-400 block">Rekomendasi Analis</span>
                  <Badge variant="accent">{selectedStockDetail.fundamental.sentiment}</Badge>
                </div>
              </div>
            </div>

            {/* Quick Add to Portfolio Section */}
            <div className="pt-2 border-t border-white/10">
              <h4 className="text-xs font-bold text-white mb-2.5">Tambah Saham Ini ke Portofolio Kamu</h4>
              <form onSubmit={handleAddStock} className="grid grid-cols-2 gap-2.5">
                <div>
                  <CurrencyInput
                    label="Harga Beli Rata-Rata (Rp)"
                    placeholder="Contoh: 10150"
                    value={formBuyPrice}
                    onChange={(e) => setFormBuyPrice(e.target.value)}
                    onValueChange={(val) => setFormBuyPrice(val)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Jumlah Lot (1 Lot = 100 lbr)</label>
                  <input
                    type="number"
                    placeholder="1"
                    value={formLots}
                    onChange={(e) => setFormLots(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500"
                    required
                    min="0.01"
                    step="any"
                  />
                </div>
                <div className="col-span-2 pt-1">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold text-xs shadow-lg shadow-blue-500/25 transition-all"
                  >
                    {submitting ? 'Menyimpan...' : `+ Simpan ${selectedStockDetail.ticker.replace('.JK', '')} ke Portofolio`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </Modal>

      {/* ── STANDALONE ADD STOCK MODAL ────────────────────────────────────────── */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Tambah Saham Portofolio"
      >
        <form onSubmit={handleAddStock} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Kode Emiten / Ticker (Akhiran .JK otomatis ditambahkan)
            </label>
            <input
              type="text"
              placeholder="Contoh: BBCA atau BBRI"
              value={formTicker}
              onChange={(e) => setFormTicker(e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 uppercase font-mono"
              required
            />
          </div>

          <div>
            <CurrencyInput
              label="Harga Beli Rata-Rata (IDR per lembar)"
              placeholder="Contoh: 6000"
              value={formBuyPrice}
              onChange={(e) => setFormBuyPrice(e.target.value)}
              onValueChange={(val) => setFormBuyPrice(val)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Jumlah Lot (1 Lot = 100 lembar saham)
            </label>
            <input
              type="number"
              placeholder="Contoh: 10"
              value={formLots}
              onChange={(e) => setFormLots(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
              required
              min="0.01"
              step="any"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-semibold shadow-lg shadow-blue-500/25 disabled:opacity-50"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Saham'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
