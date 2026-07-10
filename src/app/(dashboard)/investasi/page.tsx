'use client';

import { useEffect, useState, useCallback } from 'react';
import { TrendingUp, TrendingDown, Plus, Trash2, LineChart, RefreshCw, DollarSign, PieChart, ExternalLink, Newspaper, ArrowUpRight, ArrowDownRight, Sparkles, AlertCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import { PortfolioStock } from '@/lib/types/database';

interface StockLiveQuote {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
}

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

const POPULAR_LQ45 = ['BBCA', 'BBRI', 'BMRI', 'TLKM', 'ASII', 'ELTY', 'ICBP', 'BBNI'];

export default function InvestasiPage() {
  const [portfolio, setPortfolio] = useState<PortfolioStock[]>([]);
  const [liveQuotes, setLiveQuotes] = useState<Record<string, StockLiveQuote>>({});
  const [loading, setLoading] = useState(true);

  // Selected Stock for Chart
  const [selectedTicker, setSelectedTicker] = useState<string>('BBCA.JK');
  const [historyPoints, setHistoryPoints] = useState<HistoryPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(true);

  // Business News
  const [news, setNews] = useState<BusinessNews[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);

  // Modal Add Stock
  const [showAddModal, setShowAddModal] = useState(false);
  const [formTicker, setFormTicker] = useState('');
  const [formBuyPrice, setFormBuyPrice] = useState('');
  const [formLots, setFormLots] = useState('1');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch Portfolio & Live Prices
  const fetchPortfolioData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/investasi/portfolio');
      if (res.ok) {
        const data = await res.json();
        const items: PortfolioStock[] = data.portfolio || [];
        setPortfolio(items);

        // Fetch live quotes for all unique portfolio tickers + selectedTicker
        const tickersSet = new Set<string>(items.map((item) => item.ticker));
        tickersSet.add(selectedTicker);
        tickersSet.add('BBCA.JK');
        tickersSet.add('ELTY.JK');

        // Fetch /api/stocks for live quotes
        const stocksRes = await fetch('/api/stocks');
        if (stocksRes.ok) {
          const stocksData = await stocksRes.json();
          const quotesMap: Record<string, StockLiveQuote> = {};
          (stocksData.stocks || []).forEach((q: StockLiveQuote) => {
            quotesMap[q.ticker.toUpperCase()] = q;
          });
          setLiveQuotes(quotesMap);
        }
      }
    } catch (err) {
      console.error('Failed to load portfolio:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedTicker]);

  // Fetch 30-day chart history
  const fetchChartHistory = useCallback(async (ticker: string) => {
    setChartLoading(true);
    let targetTicker = ticker.toUpperCase();
    if (!targetTicker.endsWith('.JK')) targetTicker = `${targetTicker}.JK`;

    try {
      const res = await fetch(`/api/stocks/history?ticker=${encodeURIComponent(targetTicker)}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryPoints(data.history || []);
      }
    } catch (err) {
      console.error('Failed to load chart history:', err);
    } finally {
      setChartLoading(false);
    }
  }, []);

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
      console.error('Failed to load business news:', err);
    } finally {
      setNewsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolioData();
    fetchBusinessNews();
  }, [fetchPortfolioData, fetchBusinessNews]);

  useEffect(() => {
    fetchChartHistory(selectedTicker);
  }, [selectedTicker, fetchChartHistory]);

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
        setFormTicker('');
        setFormBuyPrice('');
        setFormLots('1');
        await fetchPortfolioData();
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
        await fetchPortfolioData();
      }
    } catch (err) {
      console.error('Failed to delete stock:', err);
    }
  };

  // Calculate Overall Portfolio KPIs
  // 1 Lot = 100 shares
  let totalInvestedModal = 0;
  let totalCurrentValue = 0;

  portfolio.forEach((item) => {
    const quote = liveQuotes[item.ticker];
    const currentPrice = quote?.price || item.buy_price;
    const totalShares = item.lots * 100;

    totalInvestedModal += item.buy_price * totalShares;
    totalCurrentValue += currentPrice * totalShares;
  });

  const totalPnL = totalCurrentValue - totalInvestedModal;
  const totalPnLPercent = totalInvestedModal > 0 ? (totalPnL / totalInvestedModal) * 100 : 0;

  // Chart statistics
  const prices = historyPoints.map((p) => p.price);
  const chartHigh = prices.length > 0 ? Math.max(...prices) : 0;
  const chartLow = prices.length > 0 ? Math.min(...prices) : 0;

  return (
    <div className="space-y-6 pb-8">
      {/* Page Title & Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Investasi & IDX Tracker</h1>
            <Badge variant="accent">Real-Time</Badge>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Pantau portofolio saham Bursa Efek Indonesia (1 Lot = 100 Lembar)</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold text-xs shadow-lg shadow-blue-500/25 transition-all active:scale-95"
        >
          <Plus size={16} />
          <span>Tambah Saham</span>
        </button>
      </div>

      {/* KPI Cards Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Total Value */}
        <div className="glass-card p-4 rounded-3xl border border-white/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Nilai Portofolio</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <PieChart size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2">
            Rp {Math.round(totalCurrentValue).toLocaleString('id-ID')}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Modal: Rp {Math.round(totalInvestedModal).toLocaleString('id-ID')}
          </p>
        </div>

        {/* Total Unrealized PnL */}
        <div className="glass-card p-4 rounded-3xl border border-white/10 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Keuntungan / Kerugian</span>
            <div
              className={`p-2 rounded-xl ${
                totalPnL >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
              }`}
            >
              {totalPnL >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p
              className={`text-2xl font-black ${
                totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {totalPnL >= 0 ? '+' : ''}Rp {Math.round(totalPnL).toLocaleString('id-ID')}
            </p>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <Badge variant={totalPnL >= 0 ? 'success' : 'danger'}>
              {totalPnL >= 0 ? '+' : ''}
              {totalPnLPercent.toFixed(2)}%
            </Badge>
            <span className="text-[10px] text-slate-500">Unrealized PnL</span>
          </div>
        </div>

        {/* Portfolio Assets Overview */}
        <div className="glass-card p-4 rounded-3xl border border-white/10 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Kepemilikan</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <LineChart size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2">{portfolio.length} Emiten</p>
          <p className="text-[11px] text-slate-400 mt-1">
            Total {portfolio.reduce((acc, item) => acc + Number(item.lots), 0).toLocaleString('id-ID')} Lot ({portfolio.reduce((acc, item) => acc + Number(item.lots) * 100, 0).toLocaleString('id-ID')} lembar)
          </p>
        </div>
      </div>

      {/* 30-Day Historical Chart Section (LQ45 focus) */}
      <div className="glass-card p-5 rounded-3xl border border-white/10 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <LineChart size={18} className="text-blue-400" />
                Grafik Tren 30 Hari ({selectedTicker.replace('.JK', '')})
              </h2>
            </div>
            <p className="text-xs text-slate-400">Riwayat pergerakan harga harian saham dari Yahoo Finance</p>
          </div>

          {/* Quick Chip Select LQ45 */}
          <div className="flex flex-wrap items-center gap-1.5">
            {POPULAR_LQ45.map((t) => {
              const fullTicker = `${t}.JK`;
              const isSelected = selectedTicker === fullTicker;
              return (
                <button
                  key={t}
                  onClick={() => setSelectedTicker(fullTicker)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chart Stats */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
            <span className="text-slate-400 mr-1.5">Harga Terkini:</span>
            <span className="font-bold text-white">
              Rp {(liveQuotes[selectedTicker]?.price || historyPoints[historyPoints.length - 1]?.price || 0).toLocaleString('id-ID')}
            </span>
          </div>
          <div className="bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
            <span className="text-slate-400 mr-1.5">Tertinggi 30H:</span>
            <span className="font-bold text-emerald-400">Rp {chartHigh.toLocaleString('id-ID')}</span>
          </div>
          <div className="bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
            <span className="text-slate-400 mr-1.5">Terendah 30H:</span>
            <span className="font-bold text-red-400">Rp {chartLow.toLocaleString('id-ID')}</span>
          </div>
        </div>

        {/* Sparkline Recharts */}
        <div className="h-56 w-full pt-2">
          {chartLoading ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs gap-2">
              <RefreshCw className="animate-spin" size={16} />
              <span>Memuat data historis 30 hari...</span>
            </div>
          ) : historyPoints.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyPoints} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(val) => `Rp ${val.toLocaleString('id-ID')}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0a1628',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '1rem',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(value: any) => [`Rp ${Number(value).toLocaleString('id-ID')}`, 'Harga']}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorPrice)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
              Tidak ada data riwayat untuk saham ini
            </div>
          )}
        </div>
      </div>

      {/* Portfolio Table Section */}
      <div className="glass-card p-5 rounded-3xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Daftar Saham Portofolio</h2>
            <p className="text-xs text-slate-400">Perhitungan keuntungan/kerugian real-time (1 Lot = 100 lembar)</p>
          </div>
          <button
            onClick={() => fetchPortfolioData()}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
            title="Refresh harga saham"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex items-center justify-center text-slate-400 text-xs gap-2">
            <RefreshCw className="animate-spin" size={16} />
            <span>Memuat portofolio saham...</span>
          </div>
        ) : portfolio.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs border border-dashed border-white/10 rounded-2xl">
            Belum ada saham di portofolio kamu. Klik tombol &quot;Tambah Saham&quot; di atas untuk mulai memantau.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3">Emiten</th>
                  <th className="py-3 px-3">Harga Beli</th>
                  <th className="py-3 px-3">Harga Terkini</th>
                  <th className="py-3 px-3">Total Lot</th>
                  <th className="py-3 px-3">Total Nilai</th>
                  <th className="py-3 px-3">Unrealized PnL</th>
                  <th className="py-3 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {portfolio.map((item) => {
                  const quote = liveQuotes[item.ticker];
                  const currentPrice = quote?.price || item.buy_price;
                  const totalShares = item.lots * 100;
                  const totalInvested = item.buy_price * totalShares;
                  const totalVal = currentPrice * totalShares;
                  const pnl = totalVal - totalInvested;
                  const pnlPercent = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-white/[0.03] transition-colors cursor-pointer"
                      onClick={() => setSelectedTicker(item.ticker)}
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">
                            {item.ticker.replace('.JK', '')}
                          </span>
                          <span className="text-[10px] text-blue-400 font-mono">.JK</span>
                        </div>
                        <span className="text-[11px] text-slate-400 block truncate max-w-[140px]">
                          {quote?.name || item.ticker}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-medium text-slate-300">
                        Rp {item.buy_price.toLocaleString('id-ID')}
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-white">
                          Rp {currentPrice.toLocaleString('id-ID')}
                        </div>
                        {quote && (
                          <div
                            className={`text-[10px] font-medium flex items-center gap-0.5 ${
                              quote.change >= 0 ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {quote.change >= 0 ? '+' : ''}
                            {quote.changePercent.toFixed(2)}%
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 font-medium text-slate-300">
                        {item.lots} Lot
                        <span className="block text-[10px] text-slate-500">
                          ({totalShares.toLocaleString('id-ID')} lbr)
                        </span>
                      </td>

                      <td className="py-3 px-3 font-bold text-white">
                        Rp {Math.round(totalVal).toLocaleString('id-ID')}
                      </td>

                      <td className="py-3 px-3">
                        <div
                          className={`font-bold flex items-center gap-1 ${
                            pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {pnl >= 0 ? '+' : ''}Rp {Math.round(pnl).toLocaleString('id-ID')}
                        </div>
                        <div
                          className={`text-[11px] font-medium ${
                            pnl >= 0 ? 'text-emerald-400/80' : 'text-red-400/80'
                          }`}
                        >
                          ({pnl >= 0 ? '+' : ''}
                          {pnlPercent.toFixed(2)}%)
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleDeleteStock(item.id)}
                          className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                          title="Hapus saham dari portofolio"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Economy & Business Hot News Section */}
      <div className="glass-card p-5 rounded-3xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Newspaper size={18} className="text-blue-400" />
              Berita Terhangat Ekonomi & Bisnis
            </h2>
            <p className="text-xs text-slate-400">Rangkuman berita terkini seputar pasar modal dan ekonomi Indonesia</p>
          </div>
          <button
            onClick={() => fetchBusinessNews()}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {newsLoading ? (
          <div className="py-8 flex items-center justify-center text-slate-400 text-xs gap-2">
            <RefreshCw className="animate-spin" size={16} />
            <span>Memuat berita ekonomi terkini...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {news.map((n, idx) => (
              <a
                key={idx}
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">
                      {n.source}
                    </span>
                    <ExternalLink size={13} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
                  </div>
                  <h3 className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors leading-relaxed line-clamp-2">
                    {n.title}
                  </h3>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Add Stock Modal */}
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
            <div className="relative">
              <input
                type="text"
                placeholder="Contoh: BBCA atau BBRI"
                value={formTicker}
                onChange={(e) => setFormTicker(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 uppercase font-mono"
                required
              />
              <span className="absolute right-3.5 top-2.5 text-xs text-blue-400 font-mono font-bold">
                {formTicker ? (formTicker.endsWith('.JK') ? '' : '.JK') : ''}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Harga Beli Rata-Rata (IDR per lembar)
            </label>
            <input
              type="number"
              placeholder="Contoh: 6000"
              value={formBuyPrice}
              onChange={(e) => setFormBuyPrice(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
              required
              min="1"
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
            {formBuyPrice && formLots && (
              <p className="text-[11px] text-slate-400 mt-1">
                Total Modal Terinvestasi:{' '}
                <span className="font-bold text-white">
                  Rp {(parseFloat(formBuyPrice) * parseFloat(formLots) * 100).toLocaleString('id-ID')}
                </span>
              </p>
            )}
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
