'use client';
import { useEffect, useState } from 'react';
import { api, fmtDateTime, usePoll } from '@/lib/client';
import { Btn, Card, Field, H, inputCls, Loading, Msg, Pair, Restock, RestockEditor, StockBig, Tabs } from '@/components/ui';
import { ShipmentCard, ShipmentForm } from '@/components/Shipments';
import { useMe } from '@/components/Shell';
import { celebrate } from '@/components/fx';

type Tab = 'update' | 'terima' | 'kirim';
const KIND: Record<string, string> = { update: 'Update stok', terima: 'Terima kiriman', kirim: 'Kirim barang', laporan: 'Laporan harian', batal: 'Kiriman batal' };

export default function Stok() {
  const { me } = useMe();
  const [tab, setTab] = useState<Tab>('update');
  const [saved, setSaved] = useState<string | null>(null);
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    if (t === 'terima' || t === 'kirim') setTab(t);
  }, []);
  const home = usePoll<any>('home');
  const ships = usePoll<any>('shipments');
  const logs = usePoll<any>('stock/logs', 30000);
  const reloadAll = () => { home.reload(); ships.reload(); logs.reload(); };

  if (!home.data) return home.error ? <Msg error={home.error} /> : <Loading />;
  const { branch, pending, others } = home.data;

  return (
    <>
      <Tabs value={tab} onChange={setTab} items={[['update', 'Update stok'], ['terima', `Penerimaan${pending.length ? ` (${pending.length})` : ''}`], ['kirim', 'Kirim']]} />

      {tab === 'update' && (
        <>
          <Card>
            <H>Stok terkini</H>
            <StockBig mini={branch.mini} medium={branch.medium} />
          </Card>
          <UpdateForm key={branch.stock_updated_at + '|' + branch.restock_updated_at} branch={branch} saved={saved} onDone={() => { setSaved('Stok diperbarui.'); reloadAll(); }} />
          <Card>
            <H>Riwayat stok</H>
            {!logs.data ? <Loading /> : logs.data.rows.length === 0 ? <p className="text-sm text-muted">Belum ada riwayat.</p> : (
              <ul className="divide-y divide-line text-sm">
                {logs.data.rows.map((l: any) => (
                  <li key={l.id} className="flex items-center justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <div className="font-medium">{KIND[l.kind] || l.kind}</div>
                      <div className="truncate text-xs text-muted">{fmtDateTime(l.created_at)} · {l.user_name || '—'}{l.note ? ` · ${l.note}` : ''}</div>
                    </div>
                    <div className="shrink-0 text-right text-xs tabular-nums">mini <b>{l.mini}</b><br />medium <b>{l.medium}</b></div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

      {tab === 'terima' && (
        <>
          {pending.length === 0 && <Card><p className="text-sm text-muted">Tidak ada kiriman yang menunggu konfirmasi.</p></Card>}
          {pending.map((s: any) => <ShipmentCard key={s.id} s={s} canReceive canCancel={false} onDone={reloadAll} />)}
          <H>Riwayat kiriman</H>
          {!ships.data ? <Loading /> : ships.data.rows.filter((s: any) => s.status !== 'sent' || s.to_branch_id !== branch.id).map((s: any) => (
            <ShipmentCard key={s.id} s={s} canReceive={false} canCancel={s.created_by === me.user.id} onDone={reloadAll} />
          ))}
        </>
      )}

      {tab === 'kirim' && (
        <Card>
          <H>Kirim dari {branch.name}</H>
          <p className="mb-3 text-sm text-muted">Stok {branch.name} otomatis berkurang, dan stok cabang tujuan bertambah setelah mereka konfirmasi terima.</p>
          <ShipmentForm branches={others} onDone={reloadAll} />
        </Card>
      )}
    </>
  );
}

// Form dibuat ulang tiap stok berubah, jadi pesan sukses disimpan di induknya.
function UpdateForm({ branch, saved, onDone }: { branch: any; saved: string | null; onDone: () => void }) {
  const [mini, setMini] = useState<number>(branch.mini);
  const [medium, setMedium] = useState<number>(branch.medium);
  const [restock, setRestock] = useState<Restock[]>(branch.restock || []);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      await api('stock', { mini, medium, restock, note });
      celebrate(['📦', '🧀', '✨']);
      onDone();
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  }
  return (
    <Card>
      <H>Update stok</H>
      <form onSubmit={save} className="space-y-3">
        <Pair label="Jumlah yang ready sekarang" mini={mini} medium={medium} onChange={(a, b) => { setMini(a); setMedium(b); }} />
        <div>
          <div className="mb-1 text-sm font-medium">Perlu restock</div>
          <RestockEditor value={restock} onChange={setRestock} />
        </div>
        <Field label="Catatan (opsional)">
          <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
        </Field>
        <Msg error={err} ok={err ? null : saved} />
        <Btn type="submit" className="w-full" busy={busy}>Simpan stok</Btn>
      </form>
    </Card>
  );
}
