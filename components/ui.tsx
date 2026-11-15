'use client';
import { ReactNode, useState } from 'react';
import { CATALOG, LEVELS } from '@/lib/client';
import { CountUp } from './fx';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`sticker rounded-3xl bg-white p-4 ${className}`}>{children}</div>;
}

export function H({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="rounded-full bg-ink px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-brand">{children}</h2>
      {right}
    </div>
  );
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' | 'dark'; small?: boolean; busy?: boolean };
export function Btn({ variant = 'primary', small, busy, className = '', children, disabled, ...p }: BtnProps) {
  const v = {
    primary: 'sticker-sm btn-pop bg-brand text-ink',
    dark: 'btn-pop border-2 border-ink bg-ink text-brand shadow-[0_3px_0_#fabd00]',
    ghost: 'sticker-sm btn-pop bg-white text-ink',
    danger: 'press border-2 border-red-700 bg-white text-red-700',
  }[variant];
  return (
    <button
      {...p}
      disabled={disabled || busy}
      className={`inline-flex items-center justify-center gap-1 rounded-full font-display font-extrabold disabled:opacity-50 ${small ? 'min-h-9 px-3.5 text-xs' : 'min-h-12 px-5 text-[15px]'} ${v} ${className}`}
    >
      {busy ? 'Menyimpan…' : children}
    </button>
  );
}

export const inputCls = 'w-full min-h-11 rounded-2xl border-2 border-line bg-white px-3 py-2 font-semibold outline-none transition-colors focus:border-ink focus:ring-4 focus:ring-brand-soft';

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-ink">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

/** Input angka bulat; 0 ditampilkan kosong supaya gampang diketik di HP. */
export function Num({ value, onChange, placeholder = '0', money, className = '', ariaLabel }: { value: number; onChange: (n: number) => void; placeholder?: string; money?: boolean; className?: string; ariaLabel?: string }) {
  const shown = value ? (money ? value.toLocaleString('id-ID') : String(value)) : '';
  return (
    <input
      aria-label={ariaLabel}
      inputMode="numeric"
      className={`${inputCls} text-right tabular-nums ${className}`}
      placeholder={placeholder}
      value={shown}
      onChange={(e) => onChange(Math.min(Number(e.target.value.replace(/\D/g, '')) || 0, 100_000_000))}
    />
  );
}

/** Sepasang input Mini / Medium. */
export function Pair({ label, mini, medium, onChange }: { label?: string; mini: number; medium: number; onChange: (mini: number, medium: number) => void }) {
  return (
    <div>
      {label ? <div className="mb-1 text-sm font-bold">{label}</div> : null}
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-0.5 block text-xs text-muted">Mini box</span>
          <Num value={mini} onChange={(n) => onChange(n, medium)} ariaLabel={`${label || ''} mini`} />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-xs text-muted">Medium box</span>
          <Num value={medium} onChange={(n) => onChange(mini, n)} ariaLabel={`${label || ''} medium`} />
        </label>
      </div>
    </div>
  );
}

/** Kotak stok besar. Kalau onSave diisi, angkanya bisa diketuk untuk diubah langsung. */
export function StockBig({ mini, medium, onSave }: { mini: number; medium: number; onSave?: (mini: number, medium: number) => Promise<void> }) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <StockTile label="Mini box" value={mini} onSave={onSave ? (n) => onSave(n, medium) : undefined} />
        <StockTile label="Medium box" value={medium} onSave={onSave ? (n) => onSave(mini, n) : undefined} />
      </div>
      {onSave ? <p className="mt-2 text-xs text-muted">Ketuk angkanya untuk mengubah stok.</p> : null}
    </div>
  );
}

function StockTile({ label, value, onSave }: { label: string; value: number; onSave?: (n: number) => Promise<void> }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const box = 'rounded-2xl border-2 border-ink bg-brand p-3 text-left';
  const cap = <div className="text-[11px] font-extrabold uppercase tracking-widest text-ink/75">{label}</div>;
  const num = `num text-5xl tabular-nums ${value <= 0 ? 'text-red-800' : 'text-ink'}`;
  if (!onSave) return <div className={box}>{cap}<div className={num}><CountUp value={value} /></div></div>;
  const commit = async () => {
    if (draft === null || busy) return;
    const n = Math.min(Number(draft.replace(/\D/g, '')) || 0, 100000);
    if (n === value) return setDraft(null);
    setBusy(true);
    setErr(false);
    try {
      await onSave(n);
      setDraft(null);
    } catch {
      setErr(true);
    }
    setBusy(false);
  };
  if (draft === null)
    return (
      <button type="button" className={`${box} btn-pop block w-full shadow-[0_3px_0_#2b1613]`} onClick={() => setDraft(String(value))} aria-label={`Ubah stok ${label}, sekarang ${value}`}>
        {cap}
        <div className={`${num} flex items-end justify-between`}><CountUp value={value} /><span className="pb-1.5 text-base" aria-hidden>✏️</span></div>
      </button>
    );
  return (
    <div className={`${box} anim-pop ${err ? '!border-red-700' : ''}`}>
      {cap}
      <input
        autoFocus
        inputMode="numeric"
        aria-label={`Stok ${label}`}
        className="num w-full bg-transparent text-5xl tabular-nums text-ink outline-none"
        value={draft}
        disabled={busy}
        onFocus={(e) => e.target.select()}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, '').slice(0, 6))}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setDraft(null); }}
      />
      <div className="text-[11px] font-bold text-ink/75">{busy ? 'Menyimpan…' : err ? 'Gagal menyimpan, coba lagi' : 'Ketik lalu tekan selesai'}</div>
    </div>
  );
}

export function Msg({ error, ok }: { error?: string | null; ok?: string | null }) {
  if (error) return <div role="alert" className="anim-wiggle rounded-2xl border-2 border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>;
  if (ok) return <div role="status" className="anim-pop rounded-2xl border-2 border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">{ok}</div>;
  return null;
}

export function Loading() {
  return (
    <div className="py-10 text-center text-sm text-muted">
      <div className="anim-bouncy text-3xl" aria-hidden>🧀</div>
      <div className="mt-1">Memuat…</div>
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: [T, string][] }) {
  return (
    <div className="flex gap-1 rounded-full border-2 border-ink bg-white p-1">
      {items.map(([k, label]) => (
        <button key={k} onClick={() => onChange(k)} className={`press min-h-10 flex-1 rounded-full px-2 font-display text-xs font-extrabold ${value === k ? 'anim-jelly bg-brand text-ink' : 'text-muted'}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

export type Restock = { item: string; level: string };
const levelTone: Record<string, string> = {
  aman: 'bg-green-50 text-green-800 border-green-300',
  habis: 'bg-red-50 text-red-800 border-red-300',
  sedikit: 'bg-amber-50 text-amber-800 border-amber-300',
  sedang: 'bg-white text-ink border-line',
};
const levelOn: Record<string, string> = { aman: 'bg-green-600 text-white', sedang: 'bg-ink text-brand', sedikit: 'bg-amber-500 text-ink', habis: 'bg-red-700 text-white' };

export function RestockChips({ list }: { list: Restock[] }) {
  if (!list?.length) return <div className="text-sm text-muted">Semua aman.</div>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map((r, i) => (
        <span key={i} style={{ animationDelay: `${i * 40}ms` }} className={`anim-pop rounded-full border px-2.5 py-0.5 text-xs font-bold ${levelTone[r.level] || levelTone.sedang}`}>
          {r.item} · {LEVELS.find((l) => l[0] === r.level)?.[1] || r.level}
        </span>
      ))}
    </div>
  );
}

/** Kelompokkan nama barang menurut kategori katalog; yang tidak dikenal masuk "Lainnya". */
export function groupItems(names: string[]): [string, string[]][] {
  const known = new Set(CATALOG.flatMap(([, items]) => items.map((i) => i.toLowerCase())));
  const extra = names.filter((n) => !known.has(n.toLowerCase()));
  return extra.length ? [...CATALOG, ['Lainnya', extra]] : CATALOG;
}

/** Stock opname: tiap barang punya status yang tinggal diketuk untuk diubah. */
export function OpnameEditor({ value, onChange }: { value: Restock[]; onChange: (v: Restock[]) => void }) {
  const [custom, setCustom] = useState('');
  const levelOf = (it: string) => value.find((v) => v.item.toLowerCase() === it.toLowerCase())?.level || 'aman';
  const set = (it: string, level: string) => {
    const rest = value.filter((v) => v.item.toLowerCase() !== it.toLowerCase());
    onChange(level === 'aman' ? rest : [...rest, { item: it, level }]);
  };
  return (
    <div className="space-y-4">
      {groupItems(value.map((v) => v.item)).map(([cat, items]) => (
        <div key={cat}>
          <div className="mb-1 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-muted">
            {cat}
            <span className="h-0.5 flex-1 rounded bg-line" />
          </div>
          <ul className="divide-y divide-line">
            {items.map((it) => {
              const lv = levelOf(it);
              return (
                <li key={it} className="flex items-center justify-between gap-2 py-1.5">
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">{it}</span>
                  <span role="radiogroup" aria-label={`Status ${it}`} className="flex shrink-0 overflow-hidden rounded-full border-2 border-line">
                    {LEVELS.map(([k, label]) => (
                      <button
                        key={k}
                        type="button"
                        role="radio"
                        aria-checked={lv === k}
                        onClick={() => set(it, k)}
                        className={`press min-h-9 px-1.5 text-[11px] font-extrabold ${lv === k ? `anim-jelly ${levelOn[k]}` : 'bg-white text-muted'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <div className="flex gap-2">
        <input className={inputCls} placeholder="Barang lain yang perlu restock…" value={custom} onChange={(e) => setCustom(e.target.value)} maxLength={60} />
        <Btn type="button" variant="ghost" small className="!min-h-11" onClick={() => { if (custom.trim()) set(custom.trim(), 'habis'); setCustom(''); }}>Tambah</Btn>
      </div>
    </div>
  );
}
