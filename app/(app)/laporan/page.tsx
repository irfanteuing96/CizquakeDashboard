'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, CASH_KINDS, CHANNELS, fmtDate, fmtDateTime, fmtTime, MONEY, rupiah, usePoll } from '@/lib/client';
import { Btn, Card, Field, H, inputCls, Loading, Msg, Num, Pair, Tabs } from '@/components/ui';
import { ReportDetail } from '@/components/ReportDetail';
import { celebrate, CountUp } from '@/components/fx';

type Qty = { mini: number; medium: number };
const emptySales = () => Object.fromEntries(CHANNELS.map(([k]) => [k, { mini: 0, medium: 0 }])) as Record<string, Qty>;
const emptyMoney = () => Object.fromEntries(MONEY.map(([k]) => [k, { qris: 0, cash: 0 }])) as Record<string, { qris: number; cash: number }>;

export default function Laporan() {
  const [tab, setTab] = useState<'isi' | 'cash' | 'riwayat'>('isi');
  const list = usePoll<any>('reports', 30000);
  const [openId, setOpenId] = useState<number | null>(null);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('tab') === 'cash') setTab('cash');
  }, []);
  return (
    <>
      <Tabs value={tab} onChange={setTab} items={[['isi', 'Laporan'], ['cash', 'Saldo cash'], ['riwayat', 'Riwayat']]} />
      {tab === 'isi' && <ReportForm onSaved={list.reload} />}
      {tab === 'cash' && <Cash />}
      {tab === 'riwayat' && (!list.data ? <Loading /> : list.data.rows.length === 0 ? (
        <Card><p className="text-sm text-muted">Belum ada laporan.</p></Card>
      ) : (
        list.data.rows.map((r: any) => (
          <Card key={r.id}>
            <button className="flex w-full items-center justify-between gap-2 text-left" onClick={() => setOpenId(openId === r.id ? null : r.id)} aria-expanded={openId === r.id}>
              <div>
                <div className="font-display font-extrabold">{fmtDate(r.work_date, true)} · shift {r.shift}</div>
                <div className="text-xs text-muted">{r.user_name} · terjual {r.sold_mini} mini, {r.sold_medium} medium</div>
              </div>
              <span className="text-muted" aria-hidden>{openId === r.id ? '▲' : '▼'}</span>
            </button>
            {openId === r.id && <div className="anim-up mt-3 border-t border-line pt-3"><ReportDetail r={r} /></div>}
          </Card>
        ))
      ))}
    </>
  );
}

const HIGHLIGHT: Record<string, { box: string; tag: string; hint: string }> = {
  shopee: { box: 'border-2 border-[#ee4d2d] bg-[#fff1ec]', tag: 'bg-[#ee4d2d] text-white', hint: 'Pesanan dari aplikasi Shopee' },
  upselling: { box: 'border-2 border-ink bg-brand-soft', tag: 'bg-ink text-brand', hint: 'Tambahan yang kamu tawarkan ke pembeli' },
};

function ReportForm({ onSaved }: { onSaved: () => void }) {
  const cur = usePoll<any>('reports/current', 20000);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [sales, setSales] = useState(emptySales);
  const [money, setMoney] = useState(emptyMoney);
  const [sisa, setSisa] = useState<Qty>({ mini: 0, medium: 0 });
  const [sisaTouched, setSisaTouched] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const ctx = cur.data?.ctx;
  const key = ctx ? `${ctx.att.id}|${ctx.att.work_date}|${ctx.att.shift}` : null;
  // Isi form dari laporan yang sudah ada, sekali per absen (polling tidak menimpa ketikan).
  useEffect(() => {
    if (!ctx || key === loadedFor) return;
    const e = ctx.existing;
    setSales(e ? { ...emptySales(), ...e.sales } : emptySales());
    setMoney(e ? { ...emptyMoney(), ...e.money } : emptyMoney());
    setSisa(e ? { mini: e.sisa_mini, medium: e.sisa_medium } : { mini: 0, medium: 0 });
    setSisaTouched(!!e);
    setNote(e?.note || '');
    setLoadedFor(key);
  }, [ctx, key, loadedFor]);

  if (!cur.data) return cur.error ? <Msg error={cur.error} /> : <Loading />;
  if (!ctx)
    return (
      <Card>
        <p className="font-display text-lg font-extrabold">Check in dulu ya 👋</p>
        <p className="mt-1 text-sm text-muted">Tanggal dan shift laporan diambil otomatis dari absen kamu.</p>
        <Link href="/absen" className="sticker-sm btn-pop mt-3 flex min-h-12 items-center justify-center rounded-full bg-brand font-display text-[15px] font-extrabold">Ke halaman Absen</Link>
      </Card>
    );
  if (loadedFor !== key) return <Loading />;

  const { att, awal, masuk, existing } = ctx;
  const sold = CHANNELS.reduce((s, [k]) => ({ mini: s.mini + sales[k].mini, medium: s.medium + sales[k].medium }), { mini: 0, medium: 0 });
  const raw = { mini: awal.mini + masuk.mini - sold.mini, medium: awal.medium + masuk.medium - sold.medium };
  const expected = { mini: Math.max(raw.mini, 0), medium: Math.max(raw.medium, 0) };
  const sisaNow = sisaTouched ? sisa : expected;
  const selisih = sisaNow.mini !== raw.mini || sisaNow.medium !== raw.medium;
  const totQris = MONEY.reduce((s, [k]) => s + money[k].qris, 0);
  const totCash = MONEY.reduce((s, [k]) => s + money[k].cash, 0);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null); setOk(null);
    try {
      await api('reports', { sales, money, sisaMini: sisaNow.mini, sisaMedium: sisaNow.medium, note });
      setOk('Laporan tersimpan. Terima kasih!');
      celebrate(['📝', '🧀', '🎉', '✨', '💰']);
      setSisa(sisaNow);
      setSisaTouched(true);
      onSaved();
      cur.reload();
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  }
  const Info = ({ label, value }: { label: string; value: string }) => (
    <div><div className="text-[10px] font-extrabold uppercase tracking-widest text-ink/70">{label}</div><div className="font-display text-base font-extrabold tabular-nums">{value}</div></div>
  );
  const Fixed = ({ label, q }: { label: string; q: Qty }) => (
    <div className="rounded-2xl bg-cream p-3">
      <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted">{label}</div>
      <div className="mt-0.5 text-sm"><b className="num text-2xl tabular-nums">{q.mini}</b> mini · <b className="num text-2xl tabular-nums">{q.medium}</b> medium</div>
    </div>
  );

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="sticker rounded-3xl bg-brand p-4">
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          <Info label="Tanggal" value={fmtDate(att.work_date)} />
          <Info label="Shift" value={`Shift ${att.shift}`} />
          <Info label="Masuk" value={fmtTime(att.check_in)} />
          <Info label="Keluar" value={att.check_out ? fmtTime(att.check_out) : 'masih jaga'} />
        </div>
        <p className="mt-2 text-xs font-bold text-ink/75">Diambil dari absen. Kalau salah, edit di tab <Link href="/absen" className="underline decoration-2 underline-offset-2">Absen</Link>.{existing ? ' Laporan shift ini sudah ada — kamu sedang mengeditnya.' : ''}</p>
      </div>

      <Card className="space-y-2">
        <H>Stok</H>
        <Fixed label="Stok awal (dari laporan sebelumnya)" q={awal} />
        <Fixed label="Stok masuk (kiriman yang kamu terima)" q={masuk} />
        <p className="text-xs text-muted">Dua angka ini terisi otomatis. Stok masuk bertambah setelah kiriman dikonfirmasi di tab Stok.</p>
      </Card>

      <Card className="space-y-3">
        <H>Stok terjual</H>
        {CHANNELS.map(([k, label]) => {
          const hl = HIGHLIGHT[k];
          const pair = <Pair label={hl ? undefined : label} mini={sales[k].mini} medium={sales[k].medium} onChange={(a, b) => setSales({ ...sales, [k]: { mini: a, medium: b } })} />;
          if (!hl) return <div key={k}>{pair}</div>;
          return (
            <div key={k} className={`rounded-2xl p-3 ${hl.box}`}>
              <div className="mb-2 flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 font-display text-[11px] font-extrabold uppercase tracking-widest ${hl.tag}`}>{label}</span>
                <span className="text-xs text-muted">{hl.hint}</span>
              </div>
              {pair}
            </div>
          );
        })}
        <div className="flex justify-between rounded-2xl bg-ink p-3 font-display text-sm font-extrabold text-brand">
          <span>Total terjual</span>
          <span className="tabular-nums"><CountUp value={sold.mini} /> mini · <CountUp value={sold.medium} /> medium</span>
        </div>
      </Card>

      <Card className="space-y-3">
        <H>Uang masuk</H>
        <p className="text-xs text-muted">Uang yang diterima langsung di cabang (bukan lewat Shopee/Grab/GoFood). Yang cash otomatis menambah saldo cash cabang.</p>
        {MONEY.map(([k, label]) => (
          <div key={k}>
            <div className="mb-1 text-sm font-bold">{label}</div>
            <div className="grid grid-cols-2 gap-2">
              <label className="block"><span className="mb-0.5 block text-xs text-muted">QRIS (Rp)</span><Num money value={money[k].qris} onChange={(n) => setMoney({ ...money, [k]: { ...money[k], qris: n } })} ariaLabel={`${label} QRIS`} /></label>
              <label className="block"><span className="mb-0.5 block text-xs text-muted">Cash (Rp)</span><Num money value={money[k].cash} onChange={(n) => setMoney({ ...money, [k]: { ...money[k], cash: n } })} ariaLabel={`${label} cash`} /></label>
            </div>
          </div>
        ))}
        <div className="flex justify-between gap-2 rounded-2xl bg-ink p-3 font-display text-xs font-extrabold text-brand">
          <span>Total</span>
          <span className="tabular-nums">QRIS {rupiah(totQris)} · Cash {rupiah(totCash)}</span>
        </div>
      </Card>

      <Card className="space-y-3">
        <H>Sisa stok</H>
        <Pair mini={sisaNow.mini} medium={sisaNow.medium} onChange={(a, b) => { setSisa({ mini: a, medium: b }); setSisaTouched(true); }} />
        <p className="text-xs text-muted">Terhitung otomatis (awal + masuk − terjual): {raw.mini} mini, {raw.medium} medium. Ubah hanya kalau hitungan fisik berbeda. Angka ini jadi stok terkini cabang.</p>
        {selisih && (
          <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-2 text-xs text-amber-900">
            Sisa stok berbeda dari hitungan otomatis. Jelaskan selisihnya di catatan.{' '}
            {raw.mini >= 0 && raw.medium >= 0 ? <button type="button" className="font-extrabold underline" onClick={() => setSisaTouched(false)}>Pakai hitungan otomatis</button> : 'Terjual lebih banyak dari stok yang tercatat — cek lagi angkanya.'}
          </div>
        )}
      </Card>

      <Card>
        <Field label="Catatan (opsional)">
          <textarea className={inputCls} rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Mis. 10 medium untuk Pasteur belum terkirim" />
        </Field>
      </Card>

      <Msg error={err} ok={ok} />
      <Btn type="submit" className="w-full" busy={busy}>{existing ? 'Simpan perubahan' : 'Kirim laporan'}</Btn>
    </form>
  );
}

/** Saldo cash cabang: bertambah dari penjualan cash di laporan, berkurang saat disetor atau dipakai. */
function Cash() {
  const { data, error, reload } = usePoll<any>('cash', 20000);
  const [kind, setKind] = useState<'setor' | 'pakai' | 'tambah'>('setor');
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  if (!data) return error ? <Msg error={error} /> : <Loading />;

  const rows = [
    ...data.entries.map((e: any) => ({ key: 'e' + e.id, at: e.created_at, plus: e.kind === 'tambah', amount: e.amount, title: CASH_KINDS[e.kind], sub: `${e.note ? e.note + ' · ' : ''}${e.user_name || '—'} · ${fmtDateTime(e.created_at)}` })),
    ...data.incomes.map((r: any) => ({ key: 'r' + r.id, at: r.created_at, plus: true, amount: r.amount, title: 'Penjualan cash', sub: `Laporan ${fmtDate(r.work_date)} shift ${r.shift} · ${r.user_name || '—'}` })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));
  const hint = { setor: 'Uang cash yang diserahkan / ditransfer ke pusat.', pakai: 'Uang cash cabang yang dipakai belanja, mis. beli es.', tambah: 'Uang yang ditambahkan ke laci, mis. modal kembalian dari pusat.' }[kind];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null); setOk(null);
    try {
      await api('cash', { kind, amount, note });
      setOk('Tercatat.');
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
        <p className="mt-1 text-xs font-bold text-ink/75">Bertambah dari penjualan cash di laporan, berkurang saat disetor atau dipakai.</p>
      </div>

      <Card>
        <H>Catat uang keluar / masuk</H>
        <form onSubmit={submit} className="space-y-3">
          <Tabs value={kind} onChange={setKind} items={[['setor', 'Setor'], ['pakai', 'Dipakai'], ['tambah', 'Tambah']]} />
          <p className="text-xs text-muted">{hint}</p>
          <Field label="Jumlah (Rp)"><Num money value={amount} onChange={setAmount} ariaLabel="Jumlah uang" /></Field>
          {kind === 'setor' && data.saldo > 0 ? <button type="button" className="press -mt-1 rounded-full border-2 border-line px-3 py-1 text-xs font-bold" onClick={() => setAmount(data.saldo)}>Setor semua ({rupiah(data.saldo)})</button> : null}
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
                  <div className="font-bold">{r.title}</div>
                  <div className="truncate text-xs text-muted">{r.sub}</div>
                </div>
                <div className={`shrink-0 font-display font-extrabold tabular-nums ${r.plus ? 'text-green-700' : 'text-red-700'}`}>{r.plus ? '+' : '−'}{rupiah(r.amount)}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
