'use client';
import { useState } from 'react';
import { api, fmtDate, fmtDur, fmtTime, hoursBetween, usePoll } from '@/lib/client';
import { Btn, Card, Field, H, inputCls, Loading, Msg, Tabs } from '@/components/ui';
import { celebrate } from '@/components/fx';

export default function Absen() {
  const home = usePoll<any>('home');
  const mine = usePoll<any>('attendance/mine', 60000);
  const [shift, setShift] = useState<'1' | '2' | '3'>('1');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  if (!home.data) return home.error ? <Msg error={home.error} /> : <Loading />;
  const open = home.data.open;

  async function act(kind: 'in' | 'out') {
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      await api('attendance/' + kind, { shift: Number(shift), note });
      setOk(kind === 'in' ? 'Check in tercatat. Selamat bekerja!' : 'Check out tercatat. Terima kasih!');
      setNote('');
      celebrate(kind === 'in' ? ['👋', '🧀', '✨', '💪'] : ['🎉', '🧀', '😴', '💛']);
      await Promise.all([home.reload(), mine.reload()]);
    } catch (e: any) {
      setErr(e.message);
    }
    setBusy(false);
  }

  return (
    <>
      <Card>
        <H>Absen</H>
        {open ? (
          <div className="space-y-3">
            <div className="anim-pop pulse-ring rounded-2xl border-2 border-ink bg-brand p-3">
              <div className="text-xs font-bold text-ink/75">Check in · {fmtDate(open.work_date, true)} · shift {open.shift} · {open.branch_name}</div>
              <div className="num text-5xl tabular-nums">{fmtTime(open.check_in)}</div>
            </div>
            <Btn variant="dark" className="w-full" busy={busy} onClick={() => act('out')}>Check out sekarang</Btn>
          </div>
        ) : (
          <div className="space-y-3">
            <Field label="Shift">
              <Tabs value={shift} onChange={setShift} items={[['1', 'Shift 1'], ['2', 'Shift 2'], ['3', 'Shift 3']]} />
            </Field>
            <Field label="Catatan (opsional)">
              <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Mis. gantiin Rendy" />
            </Field>
            <Btn className="w-full" busy={busy} onClick={() => act('in')}>Check in sekarang</Btn>
            <p className="text-xs text-muted">Jam dicatat otomatis saat tombol ditekan.</p>
          </div>
        )}
        <div className="mt-3"><Msg error={err} ok={ok} /></div>
      </Card>

      <Card>
        <H>Riwayat absen saya</H>
        {!mine.data ? <Loading /> : mine.data.rows.length === 0 ? <p className="text-sm text-muted">Belum ada riwayat.</p> : (
          <ul className="divide-y divide-line text-sm">
            {mine.data.rows.map((a: any) => (
              <li key={a.id} className="flex items-center justify-between gap-2 py-2">
                <div>
                  <div className="font-medium">{fmtDate(a.work_date)}</div>
                  <div className="text-xs text-muted">{a.branch_name} · shift {a.shift}</div>
                </div>
                <div className="text-right tabular-nums">
                  <div>{fmtTime(a.check_in)} – {a.check_out ? fmtTime(a.check_out) : '…'}</div>
                  <div className="text-xs text-muted">{fmtDur(hoursBetween(a.check_in, a.check_out))}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
