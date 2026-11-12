'use client';
import { useEffect, useState } from 'react';
import { addDays, api, CHANNELS, fmtDate, MONEY, rupiah, todayWIB, usePoll } from '@/lib/client';
import { Btn, Card, Field, H, inputCls, Loading, Msg, Num, Pair, Restock, RestockEditor, Tabs } from '@/components/ui';
import { kasSummary, ReportDetail } from '@/components/ReportDetail';

type Qty = { mini: number; medium: number };
type Wallet = { awal: number; items: { desc: string; amount: number; type: 'in' | 'out' }[] };
const emptySales = () => Object.fromEntries(CHANNELS.map(([k]) => [k, { mini: 0, medium: 0 }])) as Record<string, Qty>;
const emptyMoney = () => Object.fromEntries(MONEY.map(([k]) => [k, { qris: 0, cash: 0 }])) as Record<string, { qris: number; cash: number }>;

export default function Laporan() {
  const [tab, setTab] = useState<'isi' | 'riwayat'>('isi');
  const list = usePoll<any>('reports', 30000);
  const [openId, setOpenId] = useState<number | null>(null);
  return (
    <>
      <Tabs value={tab} onChange={setTab} items={[['isi', 'Isi laporan'], ['riwayat', 'Riwayat']]} />
      {tab === 'isi' ? <ReportForm onSaved={list.reload} /> : !list.data ? <Loading /> : list.data.rows.length === 0 ? (
        <Card><p className="text-sm text-muted">Belum ada laporan.</p></Card>
      ) : (
        list.data.rows.map((r: any) => (
          <Card key={r.id}>
            <button className="flex w-full items-center justify-between gap-2 text-left" onClick={() => setOpenId(openId === r.id ? null : r.id)} aria-expanded={openId === r.id}>
              <div>
                <div className="font-semibold">{fmtDate(r.work_date, true)} · shift {r.shift}</div>
                <div className="text-xs text-muted">{r.user_name} · terjual {r.sold_mini} mini, {r.sold_medium} medium</div>
              </div>
              <span className="text-muted" aria-hidden>{openId === r.id ? '▲' : '▼'}</span>
            </button>
            {openId === r.id && <div className="mt-3 border-t border-line pt-3"><ReportDetail r={r} /></div>}
          </Card>
        ))
      )}
    </>
  );
}

function ReportForm({ onSaved }: { onSaved: () => void }) {
  const [date, setDate] = useState(todayWIB());
  const [shift, setShift] = useState<'1' | '2' | '3'>('1');
  const [loaded, setLoaded] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [awal, setAwal] = useState<Qty>({ mini: 0, medium: 0 });
  const [masuk, setMasuk] = useState<Qty>({ mini: 0, medium: 0 });
  const [sales, setSales] = useState(emptySales);
  const [money, setMoney] = useState(emptyMoney);
  const [sisa, setSisa] = useState<Qty>({ mini: 0, medium: 0 });
  const [sisaTouched, setSisaTouched] = useState(false);
  const [restock, setRestock] = useState<Restock[]>([]);
  const [kasOn, setKasOn] = useState(false);
  const [cash, setCash] = useState<Wallet>({ awal: 0, items: [] });
  const [gopay, setGopay] = useState<Wallet>({ awal: 0, items: [] });
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const key = `${date}|${shift}`;
  useEffect(() => {
    let live = true;
    setLoaded(null);
    setErr(null);
    api(`reports/prefill?date=${date}&shift=${shift}`)
      .then((d) => {
        if (!live) return;
        const e = d.existing;
        setEditing(!!e);
        if (e) {
          setAwal({ mini: e.awal_mini, medium: e.awal_medium });
          setMasuk({ mini: e.masuk_mini, medium: e.masuk_medium });
          setSales({ ...emptySales(), ...e.sales });
          setMoney({ ...emptyMoney(), ...e.money });
          setSisa({ mini: e.sisa_mini, medium: e.sisa_medium });
          setSisaTouched(true);
          setKasOn(!!e.kas?.enabled);
          setCash({ awal: e.kas?.cash?.awal || 0, items: e.kas?.cash?.items || [] });
          setGopay({ awal: e.kas?.gopay?.awal || 0, items: e.kas?.gopay?.items || [] });
          setNote(e.note || '');
        } else {
          // Stok awal = sisa laporan sebelumnya; kalau belum ada, stok terkini dikurangi yang baru masuk.
          setAwal(d.prev ? { mini: d.prev.sisa_mini, medium: d.prev.sisa_medium } : { mini: Math.max(d.branch.mini - d.masuk.mini, 0), medium: Math.max(d.branch.medium - d.masuk.medium, 0) });
          setMasuk(d.masuk);
          setSales(emptySales());
          setMoney(emptyMoney());
          setSisaTouched(false);
          setKasOn(false);
          setCash({ awal: 0, items: [] });
          setGopay({ awal: 0, items: [] });
          setNote('');
        }
        setRestock(d.branch.restock || []);
        setLoaded(`${d.date}|${d.shift}`);
      })
      .catch((e) => live && setErr(e.message));
    return () => { live = false; };
  }, [date, shift]);

  const sold = CHANNELS.reduce((s, [k]) => ({ mini: s.mini + sales[k].mini, medium: s.medium + sales[k].medium }), { mini: 0, medium: 0 });
  const expected = { mini: Math.max(awal.mini + masuk.mini - sold.mini, 0), medium: Math.max(awal.medium + masuk.medium - sold.medium, 0) };
  const sisaNow = sisaTouched ? sisa : expected;
  const selisih = sisaNow.mini !== awal.mini + masuk.mini - sold.mini || sisaNow.medium !== awal.medium + masuk.medium - sold.medium;
  const totQris = MONEY.reduce((s, [k]) => s + money[k].qris, 0);
  const totCash = MONEY.reduce((s, [k]) => s + money[k].cash, 0);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null); setOk(null);
    try {
      await api('reports', {
        date, shift: Number(shift), awalMini: awal.mini, awalMedium: awal.medium, masukMini: masuk.mini, masukMedium: masuk.medium,
        sales, money, sisaMini: sisaNow.mini, sisaMedium: sisaNow.medium, restock, kas: { enabled: kasOn, cash, gopay }, note,
      });
      setOk('Laporan tersimpan. Terima kasih!');
      setEditing(true);
      setSisa(sisaNow);
      setSisaTouched(true);
      onSaved();
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Card>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Tanggal">
            <input type="date" className={inputCls} value={date} max={todayWIB()} min={addDays(todayWIB(), -60)} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </Field>
          <Field label="Shift">
            <select className={inputCls} value={shift} onChange={(e) => setShift(e.target.value as any)}>
              <option value="1">Shift 1</option><option value="2">Shift 2</option><option value="3">Shift 3</option>
            </select>
          </Field>
        </div>
        {loaded === key && editing && <p className="mt-2 rounded-lg bg-brand-soft px-2 py-1.5 text-xs">Laporan untuk tanggal &amp; shift ini sudah ada — kamu sedang mengeditnya.</p>}
      </Card>

      {loaded !== key ? (err ? <Msg error={err} /> : <Loading />) : (
        <>
          <Card className="space-y-3">
            <H>Stok</H>
            <Pair label="Stok awal" mini={awal.mini} medium={awal.medium} onChange={(a, b) => setAwal({ mini: a, medium: b })} />
            <Pair label="Stok masuk hari ini" mini={masuk.mini} medium={masuk.medium} onChange={(a, b) => setMasuk({ mini: a, medium: b })} />
          </Card>

          <Card className="space-y-3">
            <H>Stok terjual</H>
            {CHANNELS.map(([k, label]) => (
              <Pair key={k} label={label} mini={sales[k].mini} medium={sales[k].medium} onChange={(a, b) => setSales({ ...sales, [k]: { mini: a, medium: b } })} />
            ))}
            <div className="flex justify-between rounded-xl bg-brand-soft p-3 text-sm font-semibold">
              <span>Total terjual</span>
              <span className="tabular-nums">{sold.mini} mini · {sold.medium} medium</span>
            </div>
          </Card>

          <Card className="space-y-3">
            <H>Uang masuk langsung</H>
            <p className="text-xs text-muted">Isi uang yang diterima langsung di cabang (bukan lewat Shopee/Grab/GoFood).</p>
            {MONEY.map(([k, label]) => (
              <div key={k}>
                <div className="mb-1 text-sm font-medium">{label}</div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block"><span className="mb-0.5 block text-xs text-muted">QRIS (Rp)</span><Num money value={money[k].qris} onChange={(n) => setMoney({ ...money, [k]: { ...money[k], qris: n } })} ariaLabel={`${label} QRIS`} /></label>
                  <label className="block"><span className="mb-0.5 block text-xs text-muted">Cash (Rp)</span><Num money value={money[k].cash} onChange={(n) => setMoney({ ...money, [k]: { ...money[k], cash: n } })} ariaLabel={`${label} cash`} /></label>
                </div>
              </div>
            ))}
            <div className="flex justify-between rounded-xl bg-brand-soft p-3 text-sm font-semibold">
              <span>Total</span>
              <span className="tabular-nums">QRIS {rupiah(totQris)} · Cash {rupiah(totCash)}</span>
            </div>
          </Card>

          <Card className="space-y-3">
            <H>Sisa stok</H>
            <Pair mini={sisaNow.mini} medium={sisaNow.medium} onChange={(a, b) => { setSisa({ mini: a, medium: b }); setSisaTouched(true); }} />
            <p className="text-xs text-muted">Hitungan sistem (awal + masuk − terjual): {expected.mini} mini, {expected.medium} medium. Ubah kalau hitungan fisik berbeda. Angka ini akan jadi stok terkini cabang.</p>
            {selisih && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
                Sisa stok berbeda dari hitungan sistem. Jelaskan selisihnya di catatan.{' '}
                <button type="button" className="font-semibold underline" onClick={() => setSisaTouched(false)}>Pakai hitungan sistem</button>
              </div>
            )}
          </Card>

          <Card>
            <H>Perlu restock</H>
            <RestockEditor value={restock} onChange={setRestock} />
          </Card>

          <Card className="space-y-3">
            <label className="flex min-h-11 items-center gap-3">
              <input type="checkbox" className="h-5 w-5 accent-[#c98a00]" checked={kasOn} onChange={(e) => setKasOn(e.target.checked)} />
              <span className="font-medium">Laporkan uang cash &amp; saldo GoPay</span>
            </label>
            {kasOn && (
              <>
                <WalletEditor title="Uang cash" value={cash} onChange={setCash} />
                <WalletEditor title="Saldo GoPay" value={gopay} onChange={setGopay} />
              </>
            )}
          </Card>

          <Card>
            <Field label="Catatan (opsional)">
              <textarea className={inputCls} rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Mis. 10 medium untuk Pasteur belum terkirim" />
            </Field>
          </Card>

          <Msg error={err} ok={ok} />
          <Btn type="submit" className="w-full" busy={busy}>{editing ? 'Simpan perubahan' : 'Kirim laporan'}</Btn>
        </>
      )}
    </form>
  );
}

function WalletEditor({ title, value, onChange }: { title: string; value: Wallet; onChange: (w: Wallet) => void }) {
  const set = (i: number, patch: any) => onChange({ ...value, items: value.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
  return (
    <div className="space-y-2 rounded-xl border border-line p-3">
      <div className="text-sm font-semibold">{title}</div>
      <label className="block"><span className="mb-0.5 block text-xs text-muted">Saldo awal (Rp)</span><Num money value={value.awal} onChange={(n) => onChange({ ...value, awal: n })} ariaLabel={`${title} saldo awal`} /></label>
      {value.items.map((it, i) => (
        <div key={i} className="space-y-1 rounded-lg bg-stone-50 p-2">
          <div className="flex gap-2">
            <select aria-label="Jenis" className={`${inputCls} !w-28`} value={it.type} onChange={(e) => set(i, { type: e.target.value })}>
              <option value="out">Keluar</option><option value="in">Masuk</option>
            </select>
            <Num money value={it.amount} onChange={(n) => set(i, { amount: n })} ariaLabel="Jumlah" placeholder="Rp" />
            <button type="button" aria-label="Hapus baris" className="h-11 w-11 shrink-0 rounded-lg border border-line bg-white text-muted" onClick={() => onChange({ ...value, items: value.items.filter((_, j) => j !== i) })}>✕</button>
          </div>
          <input className={inputCls} placeholder="Keterangan, mis. ongkir GoSend Cicadas" value={it.desc} onChange={(e) => set(i, { desc: e.target.value })} maxLength={100} />
        </div>
      ))}
      <Btn type="button" variant="ghost" small onClick={() => onChange({ ...value, items: [...value.items, { desc: '', amount: 0, type: 'out' }] })}>+ Tambah pemasukan / pengeluaran</Btn>
      <div className="flex justify-between text-sm font-semibold"><span>Saldo akhir</span><span className="tabular-nums">{rupiah(kasSummary(value).akhir)}</span></div>
    </div>
  );
}
