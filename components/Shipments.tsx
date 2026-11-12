'use client';
import { useState } from 'react';
import { api, fmtDateTime } from '@/lib/client';
import { Btn, Field, inputCls, Msg, Pair } from './ui';

/** Satu kiriman: info + konfirmasi penerimaan (jumlah bisa dikoreksi kalau tidak sesuai). */
export function ShipmentCard({ s, canReceive, canCancel, onDone }: { s: any; canReceive: boolean; canCancel: boolean; onDone: () => void }) {
  const [mini, setMini] = useState<number>(s.mini);
  const [medium, setMedium] = useState<number>(s.medium);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const sent = s.status === 'sent';
  const diff = s.status === 'received' && (s.received_mini !== s.mini || s.received_medium !== s.medium);

  async function run(path: string, body: any) {
    setBusy(true);
    setErr(null);
    try {
      await api(path, body);
      onDone();
    } catch (e: any) {
      setErr(e.message);
    }
    setBusy(false);
  }

  return (
    <div className={`rounded-2xl border bg-white p-4 ${sent ? 'border-amber-300' : 'border-line'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold">{s.from_name || 'Produksi'} → {s.to_name}</div>
          <div className="text-xs text-muted">{fmtDateTime(s.created_at)} · oleh {s.created_name || '—'}</div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${sent ? 'bg-amber-100 text-amber-800' : s.status === 'received' ? 'bg-green-100 text-green-800' : 'bg-stone-100 text-stone-600'}`}>
          {sent ? 'Dikirim' : s.status === 'received' ? 'Diterima ✅' : 'Dibatalkan'}
        </span>
      </div>
      <div className="mt-2 text-sm">
        <b className="tabular-nums">{s.mini}</b> mini · <b className="tabular-nums">{s.medium}</b> medium
        {s.items ? <div className="mt-1 whitespace-pre-line text-muted">Barang lain: {s.items}</div> : null}
        {s.note ? <div className="mt-1 text-muted">Catatan: {s.note}</div> : null}
      </div>
      {s.status === 'received' && (
        <div className={`mt-2 rounded-lg px-2 py-1.5 text-xs ${diff ? 'bg-red-50 text-red-800' : 'bg-stone-50 text-muted'}`}>
          Diterima {s.received_mini} mini, {s.received_medium} medium oleh {s.received_name || '—'} · {fmtDateTime(s.received_at)}
          {diff ? ' — tidak sesuai kiriman' : ''}{s.receive_note ? ` · “${s.receive_note}”` : ''}
        </div>
      )}
      {sent && canReceive && (
        <div className="mt-3 space-y-2 border-t border-line pt-3">
          <Pair label="Jumlah yang benar-benar diterima" mini={mini} medium={medium} onChange={(a, b) => { setMini(a); setMedium(b); }} />
          <Field label="Catatan (opsional)">
            <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Mis. sendok belum datang" />
          </Field>
          <Btn className="w-full" busy={busy} onClick={() => run('shipments/receive', { id: s.id, mini, medium, note })}>Terima kiriman ✅</Btn>
        </div>
      )}
      {sent && canCancel && (
        <Btn variant="danger" small className="mt-2" disabled={busy} onClick={() => confirm('Batalkan kiriman ini?') && run('shipments/cancel', { id: s.id })}>Batalkan kiriman</Btn>
      )}
      <div className="mt-2"><Msg error={err} /></div>
    </div>
  );
}

/** Form buat kiriman. fromOptions diisi hanya untuk admin (karyawan selalu kirim dari cabangnya sendiri). */
export function ShipmentForm({ branches, fromOptions, onDone }: { branches: any[]; fromOptions?: any[]; onDone: () => void }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [mini, setMini] = useState(0);
  const [medium, setMedium] = useState(0);
  const [items, setItems] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      await api('shipments', { fromBranchId: Number(from) || null, toBranchId: Number(to), mini, medium, items, note });
      setOk('Kiriman tercatat. Cabang tujuan tinggal konfirmasi saat barang sampai.');
      setMini(0); setMedium(0); setItems(''); setNote('');
      onDone();
    } catch (e: any) {
      setErr(e.message);
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {fromOptions ? (
        <Field label="Dari" hint="Kalau dari cabang, stok cabang itu otomatis berkurang.">
          <select className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)}>
            <option value="">Produksi (tidak mengurangi stok cabang)</option>
            {fromOptions.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
      ) : null}
      <Field label="Ke cabang">
        <select className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} required>
          <option value="">Pilih cabang…</option>
          {branches.filter((b) => String(b.id) !== from).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </Field>
      <Pair label="Jumlah dikirim" mini={mini} medium={medium} onChange={(a, b) => { setMini(a); setMedium(b); }} />
      <Field label="Barang lain (opsional)">
        <textarea className={inputCls} rows={2} value={items} onChange={(e) => setItems(e.target.value)} maxLength={500} placeholder="Mis. choco crunchy, keju setengah balok, sendok" />
      </Field>
      <Field label="Catatan (opsional)">
        <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
      </Field>
      <Msg error={err} ok={ok} />
      <Btn type="submit" className="w-full" busy={busy}>Catat kiriman</Btn>
    </form>
  );
}
