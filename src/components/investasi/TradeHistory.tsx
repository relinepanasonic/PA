'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Trade { id: string; trade_date: string; ticker: string; side: 'buy' | 'sell'; price: number; lots: number; fee: number; realized_pl: number | null }
const rp = (n: number) => (n < 0 ? '-' : '') + 'Rp ' + Math.abs(Math.round(n)).toLocaleString('id-ID');

// Every buy and sell recorded (by you or by Jax), with the profit or loss of each sale.
export default function TradeHistory() {
  const supabase = useMemo(() => createClient(), []);
  const [trades, setTrades] = useState<Trade[] | null>(null);

  useEffect(() => {
    supabase.from('stock_trades').select('id,trade_date,ticker,side,price,lots,fee,realized_pl')
      .order('trade_date', { ascending: false }).order('created_at', { ascending: false }).limit(50)
      .then((r) => setTrades(((r.data ?? []) as any[]).map((t) => ({ ...t, price: Number(t.price), fee: Number(t.fee), realized_pl: t.realized_pl == null ? null : Number(t.realized_pl) }))));
  }, [supabase]);

  if (!trades || trades.length === 0) return null;
  const realized = trades.reduce((s, t) => s + (t.realized_pl ?? 0), 0);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-bold text-white">Riwayat jual beli saham</p>
        <p className={`text-xs font-bold ${realized >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>Untung/rugi terealisasi: {rp(realized)}</p>
      </div>
      <p className="text-[11px] text-slate-400 mb-2.5">Semua pembelian dan penjualan yang dicatat, termasuk lewat Jax. 1 lot = 100 lembar.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/10"><th className="py-1.5">Tanggal</th><th>Saham</th><th>Jenis</th><th className="text-right">Harga</th><th className="text-right">Lot</th><th className="text-right">Nilai</th><th className="text-right">Untung/rugi</th></tr></thead>
          <tbody>
            {trades.map((t) => (
              <tr key={t.id} className="border-b border-white/5 last:border-0">
                <td className="py-2 text-slate-400 whitespace-nowrap">{t.trade_date}</td>
                <td className="font-bold text-white">{t.ticker}</td>
                <td><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${t.side === 'buy' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40' : 'bg-red-500/20 text-red-300 border-red-400/40'}`}>{t.side === 'buy' ? 'Beli' : 'Jual'}</span></td>
                <td className="text-right tabular-nums text-slate-200">{rp(t.price)}</td>
                <td className="text-right tabular-nums text-slate-200">{t.lots}</td>
                <td className="text-right tabular-nums text-slate-300">{rp(t.price * t.lots * 100)}</td>
                <td className={`text-right tabular-nums font-bold ${t.realized_pl == null ? 'text-slate-600' : t.realized_pl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{t.realized_pl == null ? '-' : rp(t.realized_pl)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
