'use client';
import Link from 'next/link';
import { fmtDate, fmtDateTime, fmtTime, usePoll } from '@/lib/client';
import { Card, H, Loading, Msg, RestockChips, StockBig } from '@/components/ui';

export default function Home() {
  const { data, error } = usePoll<any>('home');
  if (!data) return error ? <Msg error={error} /> : <Loading />;
  const { branch, open, onDuty, pending, reports } = data;
  return (
    <>
      <Msg error={error} />
      <Card>
        <H right={<Link href="/stok" className="text-sm font-semibold text-brand-dark underline">Update</Link>}>Stok terkini</H>
        <StockBig mini={branch.mini} medium={branch.medium} />
        <p className="mt-2 text-xs text-muted">
          {branch.stock_updated_at ? `Diperbarui ${fmtDateTime(branch.stock_updated_at)} oleh ${branch.stock_updated_by}` : 'Stok belum pernah diisi.'}
        </p>
      </Card>

      {pending.length > 0 && (
        <Link href="/stok?tab=terima" className="block rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <div className="font-semibold">🚚 {pending.length} kiriman menunggu dikonfirmasi</div>
          <div className="text-sm text-muted">{pending.map((s: any) => `${s.mini} mini, ${s.medium} medium`).join(' · ')} — ketuk untuk terima</div>
        </Link>
      )}

      <Card>
        <H>Absen — {fmtDate(data.today, true)}</H>
        {open ? (
          <p className="text-sm">Kamu check in <b>{fmtTime(open.check_in)}</b> (shift {open.shift}). Jangan lupa check out.</p>
        ) : (
          <p className="text-sm text-muted">Kamu belum check in.</p>
        )}
        <Link href="/absen" className="mt-3 flex min-h-12 items-center justify-center rounded-xl bg-brand font-semibold">{open ? 'Check out' : 'Check in sekarang'}</Link>
        {onDuty.length > 0 && (
          <ul className="mt-3 divide-y divide-line text-sm">
            {onDuty.map((a: any) => (
              <li key={a.id} className="flex justify-between py-1.5">
                <span>{a.user_name} <span className="text-muted">· shift {a.shift}</span></span>
                <span className="tabular-nums">{fmtTime(a.check_in)} – {a.check_out ? fmtTime(a.check_out) : 'sekarang'}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <H>Laporan hari ini</H>
        {reports.length ? (
          <ul className="space-y-1 text-sm">
            {reports.map((r: any) => (
              <li key={r.id}>✅ Shift {r.shift} oleh {r.user_name}: terjual {r.sold_mini} mini, {r.sold_medium} medium</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Belum ada laporan penjualan hari ini.</p>
        )}
        <Link href="/laporan" className="mt-3 flex min-h-12 items-center justify-center rounded-xl border border-line bg-white font-semibold">Isi laporan harian</Link>
      </Card>

      <Card>
        <H>Perlu restock</H>
        <RestockChips list={branch.restock} />
      </Card>
    </>
  );
}
