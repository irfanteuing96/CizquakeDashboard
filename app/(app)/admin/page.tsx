'use client';
import { useState } from 'react';
import { addDays, api, CHANNELS, fmtDate, fmtDateTime, fmtTime, rupiah, todayWIB, usePoll } from '@/lib/client';
import { Btn, Card, H, inputCls, Loading, Msg, RestockChips } from '@/components/ui';
import { ReportDetail } from '@/components/ReportDetail';
import { Stat } from '@/components/RangeBar';

export default function AdminHome() {
  const [date, setDate] = useState(todayWIB());
  const { data, error, reload } = usePoll<any>(`admin/dashboard?date=${date}`, 10000);
  const [openRep, setOpenRep] = useState<number | null>(null);
  const today = todayWIB();

  const reports: any[] = data?.reports || [];
  const sum = (f: (r: any) => number) => reports.reduce((s, r) => s + f(r), 0);
  const upsell = sum((r) => (r.money?.upselling?.qris || 0) + (r.money?.upselling?.cash || 0));

  return (
    <>
      <div className="flex items-center gap-2">
        <Btn variant="ghost" small aria-label="Hari sebelumnya" onClick={() => setDate(addDays(date, -1))}>◀</Btn>
        <input type="date" aria-label="Tanggal" className={`${inputCls} flex-1 text-center font-semibold`} value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} />
        <Btn variant="ghost" small aria-label="Hari berikutnya" disabled={date >= today} onClick={() => setDate(addDays(date, 1))}>▶</Btn>
      </div>
      <p className="-mt-2 text-center text-xs text-muted">{fmtDate(date, true)}{date === today ? ' · hari ini · diperbarui otomatis' : ''}</p>
      <Msg error={error} />
      {!data ? <Loading /> : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Mini terjual" value={sum((r) => r.sold_mini)} />
            <Stat label="Medium terjual" value={sum((r) => r.sold_medium)} />
            <Stat label="Upselling" value={rupiah(upsell)} sub={`${sum((r) => r.sales?.upselling?.mini || 0)} mini · ${sum((r) => r.sales?.upselling?.medium || 0)} medium`} />
            <Stat label="Uang masuk langsung" value={rupiah(sum((r) => r.rev_qris + r.rev_cash))} sub={`QRIS ${rupiah(sum((r) => r.rev_qris))} · Cash ${rupiah(sum((r) => r.rev_cash))}`} />
          </div>

          <Card>
            <H>Terjual per channel</H>
            <table className="w-full text-sm tabular-nums">
              <thead><tr className="text-left text-xs text-muted"><th className="py-1 font-medium">Channel</th><th className="text-right font-medium">Mini</th><th className="text-right font-medium">Medium</th></tr></thead>
              <tbody className="divide-y divide-line">
                {CHANNELS.map(([k, label]) => (
                  <tr key={k}><td className="py-1.5">{label}</td><td className="text-right">{sum((r) => r.sales?.[k]?.mini || 0)}</td><td className="text-right">{sum((r) => r.sales?.[k]?.medium || 0)}</td></tr>
                ))}
              </tbody>
            </table>
          </Card>

          {data.shipments.length > 0 && (
            <Card className="!border-amber-300 !bg-amber-50">
              <H>🚚 Kiriman belum dikonfirmasi ({data.shipments.length})</H>
              <ul className="space-y-1 text-sm">
                {data.shipments.map((s: any) => (
                  <li key={s.id}>{s.from_name || 'Produksi'} → <b>{s.to_name}</b>: {s.mini} mini, {s.medium} medium <span className="text-muted">· {fmtDateTime(s.created_at)}</span></li>
                ))}
              </ul>
            </Card>
          )}

          <h2 className="pt-1 text-sm font-semibold uppercase tracking-wide text-muted">Per cabang</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {data.branches.map((b: any) => {
              const att = data.attendance.filter((a: any) => a.branch_id === b.id);
              const reps = reports.filter((r) => r.branch_id === b.id);
              const tone = (n: number, low: number) => (n <= 0 ? 'text-red-700' : n <= low ? 'text-amber-700' : '');
              return (
                <Card key={b.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold">{b.name}{b.is_pusat ? <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold">Pusat</span> : null}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-brand-soft p-2"><div className="text-xs text-muted">Mini</div><div className={`text-3xl font-bold tabular-nums ${tone(b.mini, 15)}`}>{b.mini}</div></div>
                    <div className="rounded-xl bg-brand-soft p-2"><div className="text-xs text-muted">Medium</div><div className={`text-3xl font-bold tabular-nums ${tone(b.medium, 3)}`}>{b.medium}</div></div>
                  </div>
                  <div className="-mt-1 text-xs text-muted">{b.stock_updated_at ? `Stok diperbarui ${fmtDateTime(b.stock_updated_at)} · ${b.stock_updated_by}` : 'Stok belum diisi'}</div>

                  <div>
                    <div className="mb-1 text-xs font-semibold text-muted">ABSEN</div>
                    {att.length === 0 ? <div className="text-sm text-muted">Belum ada yang check in.</div> : (
                      <ul className="text-sm">
                        {att.map((a: any) => (
                          <li key={a.id} className="flex justify-between py-0.5">
                            <span>{!a.check_out ? '🟢 ' : ''}{a.user_name} <span className="text-muted">· shift {a.shift}</span></span>
                            <span className="tabular-nums">{fmtTime(a.check_in)} – {a.check_out ? fmtTime(a.check_out) : '…'}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <div className="mb-1 text-xs font-semibold text-muted">LAPORAN</div>
                    {reps.length === 0 ? <div className="text-sm text-muted">Belum ada laporan.</div> : reps.map((r) => (
                      <div key={r.id} className="border-t border-line first:border-0">
                        <button className="flex w-full items-center justify-between gap-2 py-1.5 text-left text-sm" onClick={() => setOpenRep(openRep === r.id ? null : r.id)} aria-expanded={openRep === r.id}>
                          <span>✅ Shift {r.shift} · {r.user_name}</span>
                          <span className="tabular-nums text-muted">{r.sold_mini} mini · {r.sold_medium} med {openRep === r.id ? '▲' : '▼'}</span>
                        </button>
                        {openRep === r.id && <div className="pb-2"><ReportDetail r={r} /></div>}
                      </div>
                    ))}
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs font-semibold text-muted">
                      <span>PERLU RESTOCK</span>
                      {b.restock?.length > 0 && (
                        <button className="font-semibold text-brand-dark underline" onClick={async () => { if (confirm(`Tandai restock ${b.name} sudah dikirim semua?`)) { await api('admin/restock/clear', { branchId: b.id }); reload(); } }}>Tandai selesai</button>
                      )}
                    </div>
                    <RestockChips list={b.restock} />
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
