'use client';
import { useState } from 'react';
import { usePoll } from '@/lib/client';
import { Card, H, Loading, Msg } from '@/components/ui';
import { ShipmentCard, ShipmentForm } from '@/components/Shipments';
import { defaultRange, rangeQuery, RangeBar } from '@/components/RangeBar';

export default function AdminPengiriman() {
  const [range, setRange] = useState(defaultRange);
  const branches = usePoll<any>('admin/branches', 120000);
  const { data, error, reload } = usePoll<any>(`shipments?${rangeQuery(range)}`, 15000);
  const active = (branches.data?.rows || []).filter((b: any) => b.active);
  const rows: any[] = data?.rows || [];
  const pending = rows.filter((s) => s.status === 'sent');
  return (
    <>
      <Card>
        <H>Catat kiriman baru</H>
        <ShipmentForm branches={active} fromOptions={active} onDone={reload} />
      </Card>
      <Msg error={error} />
      <H>Menunggu konfirmasi ({pending.length})</H>
      {!data ? <Loading /> : pending.length === 0 ? <Card><p className="text-sm text-muted">Semua kiriman sudah dikonfirmasi.</p></Card> : pending.map((s) => <ShipmentCard key={s.id} s={s} canReceive canCancel onDone={reload} />)}
      <H>Riwayat</H>
      <RangeBar value={range} onChange={setRange} branches={active} />
      {rows.filter((s) => s.status !== 'sent').map((s) => <ShipmentCard key={s.id} s={s} canReceive={false} canCancel={false} onDone={reload} />)}
    </>
  );
}
