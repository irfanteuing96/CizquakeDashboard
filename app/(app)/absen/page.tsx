'use client';
import { useState } from 'react';
import { api, fmtDate, fmtDur, fmtTime, fromLocalInput, hoursBetween, toLocalInput, usePoll } from '@/lib/client';
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
  const [editId, setEditId] = useState<number | null>(null);

  if (!home.data) return home.error ? <Msg error={home.error} /> : <Loading />;
  const open = home.data.open;
  const reload = () => Promise.all([home.reload(), mine.reload()]);

  async function act(kind: 'in' | 'out') {
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      await api('attendance/' + kind, { shift: Number(shift), note });
      setOk(kind === 'in' ? 'Check in tercatat. Selamat bekerja!' : 'Check out tercatat. Terima kasih!');
      setNote('');
      celebrate(kind === 'in' ? ['👋', '🧀', '✨', '💪'] : ['🎉', '🧀', '😴', '💛']);
      await reload();
    } catch (e: any) {
      setErr(e.message);
    }
    setBusy(false);
  }
  const editable = (a: any) => Date.now() - Date.parse(a.check_in) < 3 * 86400_000;

  return (
    <>
      <Card>
        <H>Absen</H>
        {open ? (
          <div className="space-y-3">
            <div className="anim-pop pulse-ring rounded-2xl border-2 border-ink bg-brand p-3">
              <div className="text-xs font-bold text-ink/75">Check in · {fmtDate(open.work_date, true)} · shift {open.shift} · {open.branch_name}</div>
              <div className="flex items-end justify-between gap-2">
                <div className="num text-5xl tabular-nums">{fmtTime(open.check_in)}</div>
                <button className="press mb-1 rounded-full border-2 border-ink bg-white px-3 py-1 text-xs font-extrabold" onClick={() => setEditId(editId === open.id ? null : open.id)}>✏️ Edit jam</button>
              </div>
            </div>
            {editId === open.id && <EditForm a={open} onClose={() => setEditId(null)} onDone={() => { setEditId(null); reload(); }} />}
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
            <p className="text-xs text-muted">Jam dicatat otomatis saat tombol ditekan. Kalau telat menekan, jamnya bisa diedit setelahnya.</p>
          </div>
        )}
        <div className="mt-3"><Msg error={err} ok={ok} /></div>
      </Card>

      <Card>
        <H>Riwayat absen saya</H>
        {!mine.data ? <Loading /> : mine.data.rows.length === 0 ? <p className="text-sm text-muted">Belum ada riwayat.</p> : (
          <ul className="divide-y divide-line text-sm">
            {mine.data.rows.map((a: any) => (
              <li key={a.id} className="py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold">{fmtDate(a.work_date)}</div>
                    <div className="truncate text-xs text-muted">{a.branch_name} · shift {a.shift}{a.edited ? ' · diedit' : ''}</div>
                  </div>
                  <div className="shrink-0 text-right tabular-nums">
                    <div>{fmtTime(a.check_in)} – {a.check_out ? fmtTime(a.check_out) : '…'}</div>
                    <div className="text-xs text-muted">{fmtDur(hoursBetween(a.check_in, a.check_out))}</div>
                  </div>
                  {editable(a) ? (
                    <button aria-label={`Edit absen ${fmtDate(a.work_date)}`} className="press h-9 w-9 shrink-0 rounded-full border-2 border-line" onClick={() => setEditId(editId === a.id ? null : a.id)}>✏️</button>
                  ) : <span className="w-9 shrink-0" />}
                </div>
                {editId === a.id && a.id !== open?.id && <EditForm a={a} onClose={() => setEditId(null)} onDone={() => { setEditId(null); reload(); }} />}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-muted">Absen 3 hari terakhir bisa diedit sendiri. Yang lebih lama, minta admin.</p>
      </Card>
    </>
  );
}

function EditForm({ a, onClose, onDone }: { a: any; onClose: () => void; onDone: () => void }) {
  const [ci, setCi] = useState(toLocalInput(a.check_in));
  const [co, setCo] = useState(toLocalInput(a.check_out));
  const [shift, setShift] = useState(String(a.shift));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <form
      className="anim-up mt-2 space-y-2 rounded-2xl border-2 border-line bg-cream p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true); setErr(null);
        try { await api('attendance/edit', { id: a.id, checkIn: fromLocalInput(ci), checkOut: fromLocalInput(co), shift: Number(shift) }); onDone(); } catch (e: any) { setErr(e.message); }
        setBusy(false);
      }}
    >
      <Field label="Jam masuk"><input type="datetime-local" className={inputCls} value={ci} onChange={(e) => setCi(e.target.value)} required /></Field>
      <Field label="Jam keluar" hint={a.check_out ? undefined : 'Kosongkan kalau masih bekerja.'}><input type="datetime-local" className={inputCls} value={co} onChange={(e) => setCo(e.target.value)} /></Field>
      <Field label="Shift">
        <select className={inputCls} value={shift} onChange={(e) => setShift(e.target.value)}>
          <option value="1">Shift 1</option><option value="2">Shift 2</option><option value="3">Shift 3</option>
        </select>
      </Field>
      <Msg error={err} />
      <div className="flex gap-2">
        <Btn type="submit" small busy={busy}>Simpan</Btn>
        <Btn type="button" small variant="ghost" onClick={onClose}>Batal</Btn>
      </div>
      <p className="text-xs text-muted">Absen yang diedit diberi tanda “diedit” dan terlihat oleh admin.</p>
    </form>
  );
}
