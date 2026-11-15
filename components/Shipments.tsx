'use client';
import { useState } from 'react';
import { api, CATALOG, fmtDateTime } from '@/lib/client';
import { Btn, Field, inputCls, Msg, Num, Pair, Restock } from './ui';
import { celebrate } from './fx';

type Check = boolean | null;

/** Satu baris checklist penerimaan: Sesuai / Tidak. */
function CheckRow({ label, detail, value, onChange, children }: { label: string; detail?: string; value: Check; onChange: (v: boolean) => void; children?: React.ReactNode }) {
  return (
    <li className="py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold">{label}</div>
          {detail ? <div className="truncate text-xs text-muted">{detail}</div> : null}
        </div>
        <div role="radiogroup" aria-label={`Cek ${label}`} className="flex shrink-0 gap-1.5">
          <button type="button" role="radio" aria-checked={value === true} onClick={() => onChange(true)} className={`press min-h-10 rounded-full border-2 px-3 text-xs font-extrabold ${value === true ? 'anim-jelly border-green-700 bg-green-600 text-white' : 'border-line bg-white text-muted'}`}>✓ Sesuai</button>
          <button type="button" role="radio" aria-checked={value === false} onClick={() => onChange(false)} className={`press min-h-10 rounded-full border-2 px-3 text-xs font-extrabold ${value === false ? 'anim-jelly border-red-700 bg-red-700 text-white' : 'border-line bg-white text-muted'}`}>✕ Tidak</button>
        </div>
      </div>
      {children}
    </li>
  );
}

/** Satu kiriman: info + checklist penerimaan yang wajib diisi cabang penerima. */
export function ShipmentCard({ s, canReceive, canCancel, onDone }: { s: any; canReceive: boolean; canCancel: boolean; onDone: () => void }) {
  const items: any[] = s.item_list || [];
  const [okMini, setOkMini] = useState<Check>(s.mini ? null : true);
  const [okMedium, setOkMedium] = useState<Check>(s.medium ? null : true);
  const [mini, setMini] = useState<number>(s.mini);
  const [medium, setMedium] = useState<number>(s.medium);
  const [checks, setChecks] = useState<Check[]>(items.map(() => null));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const sent = s.status === 'sent';
  const diff = s.status === 'received' && (s.received_mini !== s.mini || s.received_medium !== s.medium || items.some((i) => i.ok === false));
  const left = [okMini, okMedium, ...checks].filter((c) => c === null).length;
  const anyBad = okMini === false || okMedium === false || checks.includes(false);

  async function run(path: string, body: any) {
    setBusy(true);
    setErr(null);
    try {
      await api(path, body);
      if (path.endsWith('receive')) celebrate(['🚚', '📦', '✅', '🧀']);
      onDone();
    } catch (e: any) {
      setErr(e.message);
    }
    setBusy(false);
  }

  return (
    <div className={`anim-up sticker rounded-3xl p-4 ${sent ? 'bg-brand-soft' : 'bg-white'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-display font-extrabold">{s.from_name || 'Produksi'} → {s.to_name}</div>
          <div className="text-xs text-muted">{fmtDateTime(s.created_at)} · oleh {s.created_name || '—'}</div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${sent ? 'bg-ink text-brand' : s.status === 'received' ? 'bg-green-100 text-green-800' : 'bg-stone-100 text-stone-600'}`}>
          {sent ? 'Dikirim' : s.status === 'received' ? 'Diterima ✅' : 'Dibatalkan'}
        </span>
      </div>

      {sent && canReceive ? (
        <div className="mt-3 rounded-2xl bg-white p-3">
          <div className="text-xs font-extrabold uppercase tracking-widest text-muted">Cek barang satu per satu</div>
          <ul className="divide-y divide-line">
            {s.mini > 0 && (
              <CheckRow label={`Mini box: ${s.mini}`} value={okMini} onChange={(v) => { setOkMini(v); if (v) setMini(s.mini); }}>
                {okMini === false && <label className="anim-up mt-2 block text-xs text-muted">Jumlah yang benar-benar diterima<Num value={mini} onChange={setMini} ariaLabel="Mini box diterima" /></label>}
              </CheckRow>
            )}
            {s.medium > 0 && (
              <CheckRow label={`Medium box: ${s.medium}`} value={okMedium} onChange={(v) => { setOkMedium(v); if (v) setMedium(s.medium); }}>
                {okMedium === false && <label className="anim-up mt-2 block text-xs text-muted">Jumlah yang benar-benar diterima<Num value={medium} onChange={setMedium} ariaLabel="Medium box diterima" /></label>}
              </CheckRow>
            )}
            {items.map((it, i) => (
              <CheckRow key={i} label={it.name} detail={it.note} value={checks[i]} onChange={(v) => setChecks(checks.map((c, j) => (j === i ? v : c)))} />
            ))}
          </ul>
          {s.note ? <div className="mt-1 text-sm text-muted">Catatan pengirim: {s.note}</div> : null}
          <div className="mt-2 space-y-2">
            <Field label={anyBad ? 'Catatan (jelaskan yang tidak sesuai)' : 'Catatan (opsional)'}>
              <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Mis. sendok belum datang" />
            </Field>
            <Btn className="w-full" busy={busy} disabled={left > 0} onClick={() => run('shipments/receive', { id: s.id, mini, medium, checks, note })}>
              {left > 0 ? `Cek ${left} barang lagi` : 'Konfirmasi penerimaan ✅'}
            </Btn>
          </div>
        </div>
      ) : (
        <div className="mt-2 text-sm">
          <ul className="space-y-0.5">
            {s.mini > 0 && <li><Mark ok={s.status === 'received' ? s.received_mini === s.mini : null} /> Mini box: <b className="tabular-nums">{s.mini}</b>{s.status === 'received' && s.received_mini !== s.mini ? <span className="text-red-800"> (diterima {s.received_mini})</span> : null}</li>}
            {s.medium > 0 && <li><Mark ok={s.status === 'received' ? s.received_medium === s.medium : null} /> Medium box: <b className="tabular-nums">{s.medium}</b>{s.status === 'received' && s.received_medium !== s.medium ? <span className="text-red-800"> (diterima {s.received_medium})</span> : null}</li>}
            {items.map((it, i) => (
              <li key={i}><Mark ok={s.status === 'received' ? it.ok : null} /> {it.name}{it.note ? <span className="text-muted"> · {it.note}</span> : null}</li>
            ))}
            {s.items ? <li className="whitespace-pre-line text-muted">{s.items}</li> : null}
          </ul>
          {s.note ? <div className="mt-1 text-muted">Catatan: {s.note}</div> : null}
        </div>
      )}

      {s.status === 'received' && (
        <div className={`mt-2 rounded-xl px-2 py-1.5 text-xs ${diff ? 'bg-red-50 text-red-800' : 'bg-stone-50 text-muted'}`}>
          Dicek oleh {s.received_name || '—'} · {fmtDateTime(s.received_at)}
          {diff ? ' — ada yang tidak sesuai' : ' — semua sesuai'}{s.receive_note ? ` · “${s.receive_note}”` : ''}
        </div>
      )}
      {sent && canCancel && (
        <Btn variant="danger" small className="mt-2" disabled={busy} onClick={() => confirm('Batalkan kiriman ini?') && run('shipments/cancel', { id: s.id })}>Batalkan kiriman</Btn>
      )}
      <div className="mt-2"><Msg error={err} /></div>
    </div>
  );
}

function Mark({ ok }: { ok: boolean | null }) {
  return <span aria-label={ok === null ? 'belum dicek' : ok ? 'sesuai' : 'tidak sesuai'}>{ok === null ? '▫️' : ok ? '✅' : '❌'}</span>;
}

/** Form kirim barang dari pusat. fromOptions diisi hanya untuk admin. */
export function ShipmentForm({ branches, fromOptions, onDone }: { branches: any[]; fromOptions?: any[]; onDone: () => void }) {
  const [from, setFrom] = useState(() => String(fromOptions?.find((b) => b.is_pusat)?.id || ''));
  const [to, setTo] = useState('');
  const [mini, setMini] = useState(0);
  const [medium, setMedium] = useState(0);
  const [picked, setPicked] = useState<{ name: string; note: string }[]>([]);
  const [custom, setCustom] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const dest = branches.find((b) => String(b.id) === to);
  const need: Restock[] = dest?.restock || [];
  const has = (n: string) => picked.some((p) => p.name.toLowerCase() === n.toLowerCase());
  const toggle = (n: string) => setPicked(has(n) ? picked.filter((p) => p.name.toLowerCase() !== n.toLowerCase()) : [...picked, { name: n, note: '' }]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      await api('shipments', { fromBranchId: Number(from) || null, toBranchId: Number(to), mini, medium, itemList: picked, note });
      setOk(`Kiriman ke ${dest?.name} tercatat. Mereka tinggal cek barangnya saat sampai.`);
      celebrate(['🚚', '💨', '📦']);
      setMini(0); setMedium(0); setPicked([]); setNote('');
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
      <Field label="Kirim ke cabang">
        <select className={inputCls} value={to} onChange={(e) => { setTo(e.target.value); setPicked([]); }} required>
          <option value="">Pilih cabang…</option>
          {branches.filter((b) => String(b.id) !== from && !b.is_pusat).map((b) => <option key={b.id} value={b.id}>{b.name}{b.restock?.length ? ` (${b.restock.length} perlu restock)` : ''}</option>)}
        </select>
      </Field>
      {dest ? <p className="-mt-1 text-xs text-muted">Stok {dest.name} sekarang: {dest.mini} mini · {dest.medium} medium</p> : null}
      <Pair label="Jumlah box dikirim" mini={mini} medium={medium} onChange={(a, b) => { setMini(a); setMedium(b); }} />

      <div>
        <div className="mb-1 text-sm font-bold">Barang lain yang dikirim</div>
        {need.length > 0 && (
          <div className="mb-3 rounded-2xl bg-brand-soft p-3">
            <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px] font-extrabold uppercase tracking-widest">
              <span>{dest.name} perlu restock</span>
              <button type="button" className="underline decoration-2 underline-offset-2" onClick={() => setPicked([...picked, ...need.filter((r) => !has(r.item)).map((r) => ({ name: r.item, note: '' }))])}>Pilih semua</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {need.map((r) => <Chip key={r.item} on={has(r.item)} onClick={() => toggle(r.item)}>{r.item} · {r.level}</Chip>)}
            </div>
          </div>
        )}
        <div className="space-y-2">
          {CATALOG.map(([cat, items]) => (
            <div key={cat}>
              <div className="mb-1 text-[11px] font-extrabold uppercase tracking-widest text-muted">{cat}</div>
              <div className="flex flex-wrap gap-1.5">{items.map((it) => <Chip key={it} on={has(it)} onClick={() => toggle(it)}>{it}</Chip>)}</div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input className={inputCls} placeholder="Barang lain…" value={custom} onChange={(e) => setCustom(e.target.value)} maxLength={60} />
          <Btn type="button" variant="ghost" small className="!min-h-11" onClick={() => { if (custom.trim() && !has(custom.trim())) setPicked([...picked, { name: custom.trim(), note: '' }]); setCustom(''); }}>Tambah</Btn>
        </div>
      </div>

      {picked.length > 0 && (
        <div className="rounded-2xl border-2 border-line p-3">
          <div className="mb-1 text-[11px] font-extrabold uppercase tracking-widest text-muted">Dikirim ({picked.length}) — jumlah boleh diisi</div>
          <ul className="space-y-1.5">
            {picked.map((p, i) => (
              <li key={p.name} className="anim-up flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-bold">{p.name}</span>
                <input aria-label={`Jumlah ${p.name}`} className={`${inputCls} !min-h-9 !w-32 !py-1 text-sm`} placeholder="mis. 2 bungkus" value={p.note} maxLength={80} onChange={(e) => setPicked(picked.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))} />
                <button type="button" aria-label={`Hapus ${p.name}`} className="press h-9 w-9 shrink-0 rounded-full border-2 border-line text-muted" onClick={() => toggle(p.name)}>✕</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Field label="Catatan (opsional)">
        <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Mis. stokan sudah dipisah di kresek besar" />
      </Field>
      <Msg error={err} ok={ok} />
      <Btn type="submit" className="w-full" busy={busy}>Kirim 🚚</Btn>
    </form>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={`press rounded-full border-2 px-2.5 py-1 text-xs font-bold ${on ? 'anim-jelly border-ink bg-brand text-ink' : 'border-line bg-white text-muted'}`}>
      {on ? '✓ ' : '+ '}{children}
    </button>
  );
}
