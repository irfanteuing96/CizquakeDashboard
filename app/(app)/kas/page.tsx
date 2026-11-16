'use client';
import { useState } from 'react';
import { api, CASH_KINDS, fmtDate, fmtDateTime, rupiah, todayWIB, usePoll } from '@/lib/client';
import { Btn, Card, Field, H, inputCls, Loading, Msg, Num, Tabs } from '@/components/ui';
import { celebrate, CountUp } from '@/components/fx';

/** Saldo cash cabang: bertambah dari penjualan cash di laporan, berkurang saat disetor atau dipakai. */
export default function Kas() {
  const { data, error, reload } = usePoll<any>('cash', 20000);
  const [kind, setKind] = useState<'setor' | 'pakai' | 'tambah'>('setor');
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  if (!data) return error ? <Msg error={error} /> : <Loading />;

  const rows: any[] = [
    ...data.entries.map((e: any) => ({ key: 'e' + e.id, id: e.id, pending: e.status === 'pending', at: e.created_at, plus: e.kind === 'tambah', amount: e.amount, title: CASH_KINDS[e.kind], sub: `${e.note ? e.note + ' · ' : ''}${e.user_name || '—'} · ${fmtDateTime(e.created_at)}` })),
    ...data.incomes.map((r: any) => ({ key: 'r' + r.id, at: r.created_at, plus: true, amount: r.amount, title: 'Penjualan cash', sub: `Laporan ${fmtDate(r.work_date)} shift ${r.shift} · ${r.user_name || '—'}` })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));
  const today = todayWIB();
  const dayOf = (iso: string) => new Date(Date.parse(iso) + 7 * 3600_000).toISOString().slice(0, 10);
  const todays = rows.filter((r) => !r.pending && dayOf(r.at) === today);
  const inToday = todays.filter((r) => r.plus).reduce((s, r) => s + r.amount, 0);
  const outToday = todays.filter((r) => !r.plus).reduce((s, r) => s + r.amount, 0);
  const hint = { setor: 'Uang cash yang diserahkan / ditransfer ke pusat. Saldo berkurang setelah admin mengonfirmasi uangnya diterima.', pakai: 'Uang cash cabang yang dipakai belanja, mis. beli es.', tambah: 'Uang yang ditambahkan ke laci, mis. modal kembalian dari pusat.' }[kind];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null); setOk(null);
    try {
      await api('cash', { kind, amount, note });
      setOk(kind === 'setor' ? 'Setoran tercatat. Menunggu konfirmasi admin.' : 'Tercatat.');
      celebrate(kind === 'tambah' ? ['💰', '✨'] : ['💸', '✅']);
      setAmount(0); setNote('');
      await reload();
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  }

  return (
    <>
      <div className="sticker rounded-3xl bg-brand p-4">
        <div className="text-[11px] font-extrabold uppercase tracking-widest text-ink/75">Saldo cash di cabang</div>
        <div className="num text-4xl tabular-nums"><CountUp value={data.saldo} format={rupiah} /></div>
        {data.pending > 0 ? (
          <div className="anim-pop mt-2 rounded-2xl border-2 border-ink bg-white px-3 py-2 text-sm font-bold">
            ⏳ {rupiah(data.pending)} sedang disetor, menunggu konfirmasi admin
          </div>
        ) : null}
        <p className="mt-1 text-xs font-bold text-ink/75">Bertambah dari penjualan cash di laporan, berkurang saat dipakai atau setelah setoran dikonfirmasi admin.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="sticker rounded-3xl bg-white p-3">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Masuk hari ini</div>
          <div className="num text-xl tabular-nums text-green-700">+<CountUp value={inToday} format={rupiah} /></div>
        </div>
        <div className="sticker rounded-3xl bg-white p-3">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Keluar hari ini</div>
          <div className="num text-xl tabular-nums text-red-700">−<CountUp value={outToday} format={rupiah} /></div>
        </div>
      </div>

      <Card>
        <H>Catat uang keluar / masuk</H>
        <form onSubmit={submit} className="space-y-3">
          <Tabs value={kind} onChange={setKind} items={[['setor', 'Setor'], ['pakai', 'Dipakai'], ['tambah', 'Tambah']]} />
          <p className="text-xs text-muted">{hint}</p>
          <Field label="Jumlah (Rp)"><Num money value={amount} onChange={setAmount} ariaLabel="Jumlah uang" /></Field>
          {kind === 'setor' && data.saldo - data.pending > 0 ? <button type="button" className="press -mt-1 rounded-full border-2 border-line px-3 py-1 text-xs font-bold" onClick={() => setAmount(data.saldo - data.pending)}>Setor semua ({rupiah(data.saldo - data.pending)})</button> : null}
          <Field label={kind === 'setor' ? 'Keterangan (opsional)' : 'Keterangan'}>
            <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} required={kind !== 'setor'} placeholder={kind === 'setor' ? 'Mis. transfer ke teh Melin' : kind === 'pakai' ? 'Mis. beli es batu' : 'Mis. modal kembalian'} />
          </Field>
          <Msg error={err} ok={ok} />
          <Btn type="submit" className="w-full" busy={busy}>Simpan</Btn>
        </form>
      </Card>

      <Card>
        <H>Riwayat cash</H>
        {rows.length === 0 ? <p className="text-sm text-muted">Belum ada transaksi cash.</p> : (
          <ul className="divide-y divide-line text-sm">
            {rows.map((r) => (
              <li key={r.key} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <div className="font-bold">{r.title}{r.pending ? <span className="ml-1.5 rounded-full bg-ink px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-brand">menunggu</span> : null}</div>
                  <div className="truncate text-xs text-muted">{r.sub}</div>
                  {r.pending ? <button type="button" className="mt-1 text-xs font-bold text-red-700 underline" onClick={async () => { if (confirm('Batalkan setoran ini?')) { try { await api('cash/cancel', { id: r.id }); } catch (e: any) { alert(e.message); } reload(); } }}>Batalkan setoran</button> : null}
                </div>
                <div className={`shrink-0 font-display font-extrabold tabular-nums ${r.pending ? 'text-muted' : r.plus ? 'text-green-700' : 'text-red-700'}`}>{r.plus ? '+' : '−'}{rupiah(r.amount)}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
