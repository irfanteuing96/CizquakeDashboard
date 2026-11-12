'use client';
import { useMemo, useState } from 'react';
import { api, CHANNELS, downloadCsv, fmtDate, MONEY, rupiah, usePoll } from '@/lib/client';
import { Btn, Card, H, Loading, Msg } from '@/components/ui';
import { ReportDetail } from '@/components/ReportDetail';
import { defaultRange, rangeQuery, RangeBar, Stat } from '@/components/RangeBar';

type Agg = { mini: number; medium: number; qris: number; cash: number; n: number };
const zero = (): Agg => ({ mini: 0, medium: 0, qris: 0, cash: 0, n: 0 });
function group(rows: any[], key: (r: any) => string) {
  const m = new Map<string, Agg>();
  for (const r of rows) {
    const a = m.get(key(r)) || zero();
    a.mini += r.sold_mini; a.medium += r.sold_medium; a.qris += r.rev_qris; a.cash += r.rev_cash; a.n++;
    m.set(key(r), a);
  }
  return [...m.entries()];
}

export default function AdminPenjualan() {
  const [range, setRange] = useState(defaultRange);
  const branches = usePoll<any>('admin/branches', 120000);
  const { data, error, reload } = usePoll<any>(`admin/reports?${rangeQuery(range)}`, 20000);
  const [openId, setOpenId] = useState<number | null>(null);
  const rows: any[] = data?.rows || [];
  const sum = (f: (r: any) => number) => rows.reduce((s, r) => s + f(r), 0);
  const byBranch = useMemo(() => group(rows, (r) => r.branch_name).sort((a, b) => b[1].mini - a[1].mini), [rows]);
  const byDay = useMemo(() => group(rows, (r) => r.work_date).sort((a, b) => (a[0] < b[0] ? 1 : -1)), [rows]);
  const upsell = sum((r) => (r.money?.upselling?.qris || 0) + (r.money?.upselling?.cash || 0));

  const csv = () => downloadCsv(`penjualan_${range.from}_${range.to}.csv`, [
    ['Tanggal', 'Cabang', 'Shift', 'Pelapor', 'Stok awal mini', 'Stok awal medium', 'Masuk mini', 'Masuk medium',
      ...CHANNELS.flatMap(([, l]) => [`${l} mini`, `${l} medium`]), 'Total mini', 'Total medium', 'Sisa mini', 'Sisa medium',
      ...MONEY.flatMap(([, l]) => [`${l} QRIS`, `${l} cash`]), 'Total QRIS', 'Total cash', 'Catatan'],
    ...rows.map((r) => [r.work_date, r.branch_name, r.shift, r.user_name || '', r.awal_mini, r.awal_medium, r.masuk_mini, r.masuk_medium,
      ...CHANNELS.flatMap(([k]) => [r.sales?.[k]?.mini || 0, r.sales?.[k]?.medium || 0]), r.sold_mini, r.sold_medium, r.sisa_mini, r.sisa_medium,
      ...MONEY.flatMap(([k]) => [r.money?.[k]?.qris || 0, r.money?.[k]?.cash || 0]), r.rev_qris, r.rev_cash, r.note]),
  ]);

  const AggTable = ({ title, items, fmt }: { title: string; items: [string, Agg][]; fmt: (k: string) => string }) => (
    <Card>
      <H>{title}</H>
      <div className="overflow-x-auto">
        <table className="w-full text-sm tabular-nums">
          <thead><tr className="text-left text-xs text-muted"><th className="py-1 font-medium" /><th className="text-right font-medium">Mini</th><th className="text-right font-medium">Medium</th><th className="text-right font-medium">QRIS</th><th className="text-right font-medium">Cash</th></tr></thead>
          <tbody className="divide-y divide-line">
            {items.map(([k, a]) => (
              <tr key={k}><td className="whitespace-nowrap py-1.5 pr-2">{fmt(k)}</td><td className="text-right">{a.mini}</td><td className="text-right">{a.medium}</td><td className="whitespace-nowrap pl-2 text-right">{rupiah(a.qris)}</td><td className="whitespace-nowrap pl-2 text-right">{rupiah(a.cash)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );

  return (
    <>
      <RangeBar value={range} onChange={setRange} branches={(branches.data?.rows || []).filter((b: any) => b.active)} />
      <Msg error={error} />
      {!data ? <Loading /> : rows.length === 0 ? <Card><p className="text-sm text-muted">Belum ada laporan di rentang ini.</p></Card> : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Mini terjual" value={sum((r) => r.sold_mini)} />
            <Stat label="Medium terjual" value={sum((r) => r.sold_medium)} />
            <Stat label="Upselling" value={rupiah(upsell)} sub={`${sum((r) => r.sales?.upselling?.mini || 0)} mini · ${sum((r) => r.sales?.upselling?.medium || 0)} medium`} />
            <Stat label="Uang masuk langsung" value={rupiah(sum((r) => r.rev_qris + r.rev_cash))} sub={`QRIS ${rupiah(sum((r) => r.rev_qris))} · Cash ${rupiah(sum((r) => r.rev_cash))}`} />
          </div>

          <Card>
            <H right={<Btn variant="ghost" small onClick={csv}>Unduh CSV</Btn>}>Per channel</H>
            <table className="w-full text-sm tabular-nums">
              <thead><tr className="text-left text-xs text-muted"><th className="py-1 font-medium">Channel</th><th className="text-right font-medium">Mini</th><th className="text-right font-medium">Medium</th><th className="text-right font-medium">Uang langsung</th></tr></thead>
              <tbody className="divide-y divide-line">
                {CHANNELS.map(([k, label]) => {
                  const hasMoney = MONEY.some(([m]) => m === k);
                  return (
                    <tr key={k}><td className="py-1.5">{label}</td><td className="text-right">{sum((r) => r.sales?.[k]?.mini || 0)}</td><td className="text-right">{sum((r) => r.sales?.[k]?.medium || 0)}</td>
                      <td className="text-right">{hasMoney ? rupiah(sum((r) => (r.money?.[k]?.qris || 0) + (r.money?.[k]?.cash || 0))) : <span className="text-muted">via aplikasi</span>}</td></tr>
                  );
                })}
                <tr><td className="py-1.5">Gift</td><td /><td /><td className="text-right">{rupiah(sum((r) => (r.money?.gift?.qris || 0) + (r.money?.gift?.cash || 0)))}</td></tr>
              </tbody>
            </table>
          </Card>

          <AggTable title="Per cabang" items={byBranch} fmt={(k) => k} />
          <AggTable title="Per hari" items={byDay} fmt={(k) => fmtDate(k)} />

          <Card>
            <H>Semua laporan ({rows.length})</H>
            <ul className="divide-y divide-line">
              {rows.map((r) => (
                <li key={r.id}>
                  <button className="flex w-full items-center justify-between gap-2 py-2 text-left text-sm" onClick={() => setOpenId(openId === r.id ? null : r.id)} aria-expanded={openId === r.id}>
                    <div>
                      <div className="font-medium">{r.branch_name} · shift {r.shift}</div>
                      <div className="text-xs text-muted">{fmtDate(r.work_date)} · {r.user_name}</div>
                    </div>
                    <span className="tabular-nums text-muted">{r.sold_mini} mini · {r.sold_medium} med {openId === r.id ? '▲' : '▼'}</span>
                  </button>
                  {openId === r.id && (
                    <div className="pb-3">
                      <ReportDetail r={r} />
                      <Btn variant="danger" small className="mt-2" onClick={async () => { if (confirm('Hapus laporan ini? Stok cabang tidak berubah.')) { await api('admin/reports/delete', { id: r.id }); reload(); } }}>Hapus laporan</Btn>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </>
  );
}
