'use client';
import { CHANNELS, MONEY, rupiah } from '@/lib/client';

export function kasSummary(w: any) {
  const items = w?.items || [];
  const akhir = (w?.awal || 0) + items.reduce((s: number, i: any) => s + (i.type === 'in' ? i.amount : -i.amount), 0);
  return { awal: w?.awal || 0, items, akhir };
}

/** Rincian satu laporan harian, mirip format laporan WA. */
export function ReportDetail({ r }: { r: any }) {
  const expected = r.awal_mini + r.masuk_mini - r.sold_mini;
  const expectedMed = r.awal_medium + r.masuk_medium - r.sold_medium;
  const selisih = expected !== r.sisa_mini || expectedMed !== r.sisa_medium;
  return (
    <div className="space-y-3 text-sm">
      <table className="w-full tabular-nums">
        <thead>
          <tr className="text-left text-xs text-muted"><th className="py-1 font-medium">Stok</th><th className="text-right font-medium">Mini</th><th className="text-right font-medium">Medium</th></tr>
        </thead>
        <tbody className="divide-y divide-line">
          <tr><td className="py-1">Stok awal</td><td className="text-right">{r.awal_mini}</td><td className="text-right">{r.awal_medium}</td></tr>
          <tr><td className="py-1">Stok masuk</td><td className="text-right">{r.masuk_mini}</td><td className="text-right">{r.masuk_medium}</td></tr>
          {CHANNELS.filter(([k]) => r.sales?.[k]?.mini || r.sales?.[k]?.medium).map(([k, label]) => (
            <tr key={k}><td className="py-1 pl-3 text-muted">− {label}</td><td className="text-right">{r.sales[k].mini}</td><td className="text-right">{r.sales[k].medium}</td></tr>
          ))}
          <tr className="font-semibold"><td className="py-1">Total terjual</td><td className="text-right">{r.sold_mini}</td><td className="text-right">{r.sold_medium}</td></tr>
          <tr className="font-semibold"><td className="py-1">Sisa stok</td><td className="text-right">{r.sisa_mini}</td><td className="text-right">{r.sisa_medium}</td></tr>
        </tbody>
      </table>
      {selisih && (
        <div className="rounded-lg bg-red-50 px-2 py-1.5 text-xs text-red-800">
          Selisih stok: seharusnya sisa {expected} mini, {expectedMed} medium (awal + masuk − terjual).
        </div>
      )}
      {(r.rev_qris > 0 || r.rev_cash > 0) && (
        <table className="w-full tabular-nums">
          <thead>
            <tr className="text-left text-xs text-muted"><th className="py-1 font-medium">Uang masuk</th><th className="text-right font-medium">QRIS</th><th className="text-right font-medium">Cash</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {MONEY.filter(([k]) => r.money?.[k]?.qris || r.money?.[k]?.cash).map(([k, label]) => (
              <tr key={k}><td className="py-1">{label}</td><td className="text-right">{rupiah(r.money[k].qris)}</td><td className="text-right">{rupiah(r.money[k].cash)}</td></tr>
            ))}
            <tr className="font-semibold"><td className="py-1">Total</td><td className="text-right">{rupiah(r.rev_qris)}</td><td className="text-right">{rupiah(r.rev_cash)}</td></tr>
          </tbody>
        </table>
      )}
      {r.kas?.enabled && (['cash', 'gopay'] as const).map((w) => {
        const k = kasSummary(r.kas[w]);
        if (!k.awal && !k.items.length) return null;
        return (
          <div key={w} className="rounded-lg bg-stone-50 p-2">
            <div className="text-xs font-semibold text-muted">{w === 'cash' ? 'Uang cash' : 'Saldo GoPay'}</div>
            <div className="flex justify-between"><span>Saldo awal</span><span className="tabular-nums">{rupiah(k.awal)}</span></div>
            {k.items.map((i: any, n: number) => (
              <div key={n} className="flex justify-between text-muted"><span>{i.type === 'in' ? '+' : '−'} {i.desc}</span><span className="tabular-nums">{rupiah(i.amount)}</span></div>
            ))}
            <div className="flex justify-between font-semibold"><span>Saldo akhir</span><span className="tabular-nums">{rupiah(k.akhir)}</span></div>
          </div>
        );
      })}
      {r.note ? <div className="whitespace-pre-line rounded-lg bg-brand-soft p-2"><b>Catatan:</b> {r.note}</div> : null}
    </div>
  );
}
