'use client';
import Link from 'next/link';
import { fmtDate, fmtDateTime, fmtTime, rupiah, usePoll } from '@/lib/client';
import { CountUp } from '@/components/fx';
import { Card, H, Loading, Msg, RestockChips, StockBig } from '@/components/ui';

export default function Home() {
  const { data, error } = usePoll<any>('home');
  if (!data) return error ? <Msg error={error} /> : <Loading />;
  const { branch, open, onDuty, pending, reports, others } = data;
  return (
    <>
      <Msg error={error} />
      <Card>
        <H right={<Link href="/stok" className="text-sm font-semibold text-ink underline decoration-brand decoration-2 underline-offset-2">Update</Link>}>Stok terkini</H>
        <StockBig mini={branch.mini} medium={branch.medium} />
        <p className="mt-2 text-xs text-muted">
          {branch.stock_updated_at ? `Diperbarui ${fmtDateTime(branch.stock_updated_at)} oleh ${branch.stock_updated_by}` : 'Stok belum pernah diisi.'}
        </p>
      </Card>

      {pending.length > 0 && (
        <Link href="/stok?tab=terima" className="sticker btn-pop pulse-ring block rounded-3xl bg-ink p-4 text-white">
          <div className="font-display font-extrabold text-brand"><span className="anim-bouncy" aria-hidden>🚚</span> {pending.length} kiriman menunggu dikonfirmasi</div>
          <div className="text-sm text-white/80">{pending.map((s: any) => `${s.mini} mini, ${s.medium} medium`).join(' · ')} — ketuk untuk terima</div>
        </Link>
      )}

      <Card>
        <H>Absen — {fmtDate(data.today, true)}</H>
        {open ? (
          <p className="text-sm">Kamu check in <b>{fmtTime(open.check_in)}</b> (shift {open.shift}). Jangan lupa check out.</p>
        ) : (
          <p className="text-sm text-muted">Kamu belum check in.</p>
        )}
        <Link href="/absen" className={`sticker-sm btn-pop mt-3 flex min-h-12 items-center justify-center rounded-full bg-brand font-display text-[15px] font-extrabold ${open ? '' : 'pulse-ring'}`}>{open ? 'Check out' : 'Check in sekarang'}</Link>
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
        <Link href="/laporan" className="sticker-sm btn-pop mt-3 flex min-h-12 items-center justify-center rounded-full bg-white font-display text-[15px] font-extrabold">Isi laporan harian</Link>
      </Card>

      <Link href="/laporan?tab=cash" className="sticker btn-pop block rounded-3xl bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-muted">Saldo cash di cabang</div>
            <div className="num text-3xl tabular-nums"><CountUp value={data.saldo} format={rupiah} /></div>
            {data.setorPending > 0 ? <div className="text-xs font-bold text-muted">⏳ {rupiah(data.setorPending)} menunggu konfirmasi</div> : null}
          </div>
          <span className="rounded-full bg-ink px-3 py-1.5 font-display text-xs font-extrabold text-brand">Setor / pakai</span>
        </div>
      </Link>

      {branch.is_pusat ? (
        <Card>
          <H right={<Link href="/stok" className="text-sm font-semibold text-ink underline decoration-brand decoration-2 underline-offset-2">Kirim</Link>}>Kondisi cabang</H>
          <ul className="divide-y divide-line">
            {others.map((b: any) => (
              <li key={b.id} className="py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display font-extrabold">{b.name}</span>
                  <span className="text-sm tabular-nums"><b>{b.mini}</b> mini · <b>{b.medium}</b> medium</span>
                </div>
                <div className="mt-1"><RestockChips list={b.restock} /></div>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card>
          <H right={<Link href="/stok" className="text-sm font-semibold text-ink underline decoration-brand decoration-2 underline-offset-2">Ubah</Link>}>Perlu restock</H>
          <RestockChips list={branch.restock} />
        </Card>
      )}
    </>
  );
}
