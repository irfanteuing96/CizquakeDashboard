'use client';
import { useMemo, useState } from 'react';
import { api, downloadCsv, fmtDate, fmtDur, fmtTime, fromLocalInput, hoursBetween, toLocalInput, usePoll } from '@/lib/client';
import { Btn, Card, Field, H, inputCls, Loading, Msg } from '@/components/ui';
import { defaultRange, rangeQuery, RangeBar } from '@/components/RangeBar';

export default function AdminAbsensi() {
  const [range, setRange] = useState(defaultRange);
  const branches = usePoll<any>('admin/branches', 120000);
  const { data, error, reload } = usePoll<any>(`admin/attendance?${rangeQuery(range)}`, 20000);
  const [edit, setEdit] = useState<any | null>(null);
  const rows: any[] = data?.rows || [];

  const recap = useMemo(() => {
    const m = new Map<number, { name: string; days: Set<string>; hours: number; open: number; branches: Set<string> }>();
    for (const a of rows) {
      const r = m.get(a.user_id) || { name: a.user_name, days: new Set(), hours: 0, open: 0, branches: new Set() };
      r.days.add(a.work_date);
      r.hours += hoursBetween(a.check_in, a.check_out);
      if (!a.check_out) r.open++;
      r.branches.add(a.branch_name);
      m.set(a.user_id, r);
    }
    return [...m.values()].sort((a, b) => b.hours - a.hours);
  }, [rows]);

  return (
    <>
      <RangeBar value={range} onChange={setRange} branches={(branches.data?.rows || []).filter((b: any) => b.active)} />
      <Msg error={error} />
      {!data ? <Loading /> : (
        <>
          <Card>
            <H right={<Btn variant="ghost" small disabled={!rows.length} onClick={() => downloadCsv(`absensi_${range.from}_${range.to}.csv`, [
              ['Tanggal', 'Nama', 'Cabang', 'Shift', 'Masuk', 'Keluar', 'Durasi (jam)', 'Catatan'],
              ...rows.map((a) => [a.work_date, a.user_name, a.branch_name, a.shift, fmtTime(a.check_in), a.check_out ? fmtTime(a.check_out) : '', hoursBetween(a.check_in, a.check_out).toFixed(2), a.note]),
            ])}>Unduh CSV</Btn>}>Rekap per karyawan</H>
            {recap.length === 0 ? <p className="text-sm text-muted">Tidak ada absen di rentang ini.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm tabular-nums">
                  <thead><tr className="text-left text-xs text-muted"><th className="py-1 font-medium">Nama</th><th className="text-right font-medium">Hari</th><th className="text-right font-medium">Total jam</th></tr></thead>
                  <tbody className="divide-y divide-line">
                    {recap.map((r) => (
                      <tr key={r.name}>
                        <td className="py-1.5">{r.name}<div className="text-xs text-muted">{[...r.branches].join(', ')}{r.open ? ` · ${r.open} belum check out` : ''}</div></td>
                        <td className="text-right">{r.days.size}</td>
                        <td className="text-right">{fmtDur(r.hours)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <H>Detail absen ({rows.length})</H>
            <ul className="divide-y divide-line text-sm">
              {rows.map((a) => (
                <li key={a.id}>
                  <button className="flex w-full items-center justify-between gap-2 py-2 text-left" onClick={() => setEdit(edit?.id === a.id ? null : { id: a.id, checkIn: toLocalInput(a.check_in), checkOut: toLocalInput(a.check_out) })}>
                    <div className="min-w-0">
                      <div className="font-medium">{a.user_name} <span className="font-normal text-muted">· {a.branch_name} · shift {a.shift}</span></div>
                      <div className="truncate text-xs text-muted">{fmtDate(a.work_date)}{a.note ? ` · ${a.note}` : ''}</div>
                    </div>
                    <div className="shrink-0 text-right tabular-nums">
                      <div>{fmtTime(a.check_in)} – {a.check_out ? fmtTime(a.check_out) : <span className="text-amber-700">belum</span>}</div>
                      <div className="text-xs text-muted">{fmtDur(hoursBetween(a.check_in, a.check_out))}</div>
                    </div>
                  </button>
                  {edit?.id === a.id && <EditRow edit={edit} setEdit={setEdit} onDone={() => { setEdit(null); reload(); }} />}
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </>
  );
}

function EditRow({ edit, setEdit, onDone }: { edit: any; setEdit: (e: any) => void; onDone: () => void }) {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (body: any) => {
    setBusy(true); setErr(null);
    try { await api('admin/attendance', body); onDone(); } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };
  return (
    <div className="mb-3 space-y-2 rounded-xl bg-stone-50 p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Field label="Masuk (WIB)"><input type="datetime-local" className={inputCls} value={edit.checkIn} onChange={(e) => setEdit({ ...edit, checkIn: e.target.value })} /></Field>
        <Field label="Keluar (WIB)"><input type="datetime-local" className={inputCls} value={edit.checkOut} onChange={(e) => setEdit({ ...edit, checkOut: e.target.value })} /></Field>
      </div>
      <Msg error={err} />
      <div className="flex gap-2">
        <Btn small busy={busy} disabled={!edit.checkIn} onClick={() => run({ id: edit.id, checkIn: fromLocalInput(edit.checkIn), checkOut: fromLocalInput(edit.checkOut) })}>Simpan koreksi</Btn>
        <Btn small variant="danger" disabled={busy} onClick={() => confirm('Hapus absen ini?') && run({ id: edit.id, delete: true })}>Hapus</Btn>
      </div>
    </div>
  );
}
