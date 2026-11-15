'use client';
import { useEffect, useRef, useState } from 'react';
import { api, fmtDateTime, usePoll } from '@/lib/client';
import { Card, H, Loading, Msg, OpnameEditor, Restock, StockBig, Tabs } from '@/components/ui';
import { ShipmentCard, ShipmentForm } from '@/components/Shipments';
import { useMe } from '@/components/Shell';
import { celebrate } from '@/components/fx';

type Tab = 'opname' | 'terima';

export default function Stok() {
  const { me } = useMe();
  const [tab, setTab] = useState<Tab>('opname');
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('tab') === 'terima') setTab('terima');
  }, []);
  const home = usePoll<any>('home');
  const ships = usePoll<any>('shipments');
  const reloadAll = () => { home.reload(); ships.reload(); };

  if (!home.data) return home.error ? <Msg error={home.error} /> : <Loading />;
  const { branch, pending, others } = home.data;
  const saveStock = async (mini: number, medium: number) => {
    await api('stock', { mini, medium });
    celebrate(['📦', '🧀', '✨']);
    await home.reload();
  };
  const stockCard = (
    <Card>
      <H>Stok {branch.name}</H>
      <StockBig mini={branch.mini} medium={branch.medium} onSave={saveStock} />
      <p className="mt-1 text-xs text-muted">{branch.stock_updated_at ? `Diperbarui ${fmtDateTime(branch.stock_updated_at)} oleh ${branch.stock_updated_by}` : 'Stok belum pernah diisi.'}</p>
    </Card>
  );
  const history = !ships.data ? <Loading /> : ships.data.rows.filter((s: any) => s.status !== 'sent' || s.to_branch_id !== branch.id);

  // Cabang pusat: hanya mengirim.
  if (branch.is_pusat)
    return (
      <>
        {stockCard}
        <Card>
          <H>Kirim ke cabang</H>
          <ShipmentForm branches={others} onDone={reloadAll} />
        </Card>
        <H>Riwayat kiriman</H>
        {Array.isArray(history) ? history.length === 0 ? <Card><p className="text-sm text-muted">Belum ada kiriman.</p></Card> : history.map((s: any) => (
          <ShipmentCard key={s.id} s={s} canReceive={false} canCancel={s.created_by === me.user.id} onDone={reloadAll} />
        )) : history}
      </>
    );

  // Cabang lain: stock opname dan penerimaan.
  return (
    <>
      <Tabs value={tab} onChange={setTab} items={[['opname', 'Stock opname'], ['terima', `Penerimaan${pending.length ? ` (${pending.length})` : ''}`]]} />
      {tab === 'opname' && (
        <>
          {stockCard}
          <Opname branch={branch} />
        </>
      )}
      {tab === 'terima' && (
        <>
          {pending.length === 0 && <Card><p className="text-sm text-muted">Tidak ada kiriman dari pusat yang menunggu dicek.</p></Card>}
          {pending.map((s: any) => <ShipmentCard key={s.id} s={s} canReceive canCancel={false} onDone={reloadAll} />)}
          <H>Riwayat penerimaan</H>
          {Array.isArray(history) ? history.map((s: any) => <ShipmentCard key={s.id} s={s} canReceive={false} canCancel={false} onDone={reloadAll} />) : history}
        </>
      )}
    </>
  );
}

/** Status tiap barang tersimpan otomatis begitu diketuk, dan tetap sampai diubah lagi. */
function Opname({ branch }: { branch: any }) {
  const [list, setList] = useState<Restock[]>(branch.restock || []);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const dirty = useRef(false);
  const seq = useRef(0);
  // Ikuti perubahan dari server (mis. barang datang lalu statusnya jadi aman) selama tidak sedang mengedit.
  const serverKey = JSON.stringify(branch.restock || []);
  useEffect(() => {
    if (!dirty.current) setList(JSON.parse(serverKey));
  }, [serverKey]);

  async function change(next: Restock[]) {
    setList(next);
    dirty.current = true;
    setState('saving');
    const mine = ++seq.current;
    try {
      await api('opname', { restock: next });
      if (mine === seq.current) { setState('saved'); dirty.current = false; }
    } catch {
      if (mine === seq.current) setState('error');
    }
  }
  const label = { idle: branch.restock_updated_at ? `Terakhir diubah ${fmtDateTime(branch.restock_updated_at)}` : '', saving: 'Menyimpan…', saved: 'Tersimpan ✓', error: 'Gagal menyimpan — ketuk lagi' }[state];
  return (
    <Card>
      <H right={<span role="status" className={`text-xs font-bold ${state === 'error' ? 'text-red-700' : 'text-muted'}`}>{label}</span>}>Stock opname</H>
      <p className="mb-3 text-xs text-muted">Ketuk status tiap barang. Statusnya tetap sampai kamu ubah lagi, dan langsung terlihat oleh pusat.</p>
      <OpnameEditor value={list} onChange={change} />
    </Card>
  );
}
