'use client';
import { ReactNode, useState } from 'react';
import { LEVELS, RESTOCK_ITEMS } from '@/lib/client';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-white p-4 shadow-sm ${className}`}>{children}</div>;
}

export function H({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{children}</h2>
      {right}
    </div>
  );
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' | 'dark'; small?: boolean; busy?: boolean };
export function Btn({ variant = 'primary', small, busy, className = '', children, disabled, ...p }: BtnProps) {
  const v = {
    primary: 'bg-brand text-ink hover:bg-brand-dark active:bg-brand-dark',
    dark: 'bg-ink text-white',
    ghost: 'bg-white border border-line text-ink',
    danger: 'bg-white border border-red-200 text-red-700',
  }[variant];
  return (
    <button
      {...p}
      disabled={disabled || busy}
      className={`inline-flex items-center justify-center gap-1 rounded-xl font-semibold transition disabled:opacity-50 ${small ? 'min-h-9 px-3 text-sm' : 'min-h-12 px-4 text-base'} ${v} ${className}`}
    >
      {busy ? 'Menyimpan…' : children}
    </button>
  );
}

export const inputCls = 'w-full min-h-11 rounded-xl border border-line bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft';

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
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
      {label ? <div className="mb-1 text-sm font-medium">{label}</div> : null}
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

export function StockBig({ mini, medium }: { mini: number; medium: number }) {
  const tone = (n: number, low: number) => (n <= 0 ? 'text-red-700' : n <= low ? 'text-amber-700' : 'text-ink');
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-xl bg-brand-soft p-3">
        <div className="text-xs font-medium text-muted">Mini box</div>
        <div className={`text-4xl font-bold tabular-nums ${tone(mini, 15)}`}>{mini}</div>
      </div>
      <div className="rounded-xl bg-brand-soft p-3">
        <div className="text-xs font-medium text-muted">Medium box</div>
        <div className={`text-4xl font-bold tabular-nums ${tone(medium, 3)}`}>{medium}</div>
      </div>
    </div>
  );
}

export function Msg({ error, ok }: { error?: string | null; ok?: string | null }) {
  if (error) return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>;
  if (ok) return <div role="status" className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">{ok}</div>;
  return null;
}

export function Loading() {
  return <div className="py-10 text-center text-sm text-muted">Memuat…</div>;
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: [T, string][] }) {
  return (
    <div className="flex gap-1 rounded-xl bg-brand-soft p-1">
      {items.map(([k, label]) => (
        <button key={k} onClick={() => onChange(k)} className={`min-h-10 flex-1 rounded-lg px-2 text-sm font-semibold ${value === k ? 'bg-white shadow-sm' : 'text-muted'}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

export type Restock = { item: string; level: string };
const levelTone: Record<string, string> = { habis: 'bg-red-50 text-red-800 border-red-200', sedikit: 'bg-amber-50 text-amber-800 border-amber-200', sedang: 'bg-stone-50 text-stone-700 border-stone-200' };

export function RestockChips({ list }: { list: Restock[] }) {
  if (!list?.length) return <div className="text-sm text-muted">Tidak ada.</div>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map((r, i) => (
        <span key={i} className={`rounded-full border px-2 py-0.5 text-xs ${levelTone[r.level] || levelTone.sedang}`}>
          {r.item} · {LEVELS.find((l) => l[0] === r.level)?.[1] || r.level}
        </span>
      ))}
    </div>
  );
}

export function RestockEditor({ value, onChange }: { value: Restock[]; onChange: (v: Restock[]) => void }) {
  const [custom, setCustom] = useState('');
  const has = (it: string) => value.some((v) => v.item.toLowerCase() === it.toLowerCase());
  const add = (it: string) => it.trim() && !has(it) && onChange([...value, { item: it.trim(), level: 'habis' }]);
  return (
    <div className="space-y-2">
      {value.map((r, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="min-w-0 flex-1 truncate text-sm">{r.item}</div>
          <select aria-label={`Kondisi ${r.item}`} className={`${inputCls} !w-auto !min-h-9 !py-1 text-sm`} value={r.level} onChange={(e) => onChange(value.map((v, j) => (j === i ? { ...v, level: e.target.value } : v)))}>
            {LEVELS.map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
          <button type="button" aria-label={`Hapus ${r.item}`} className="h-9 w-9 rounded-lg border border-line text-muted" onClick={() => onChange(value.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <div className="flex flex-wrap gap-1.5">
        {RESTOCK_ITEMS.filter((it) => !has(it)).map((it) => (
          <button type="button" key={it} onClick={() => add(it)} className="rounded-full border border-line bg-white px-2.5 py-1 text-xs text-muted">+ {it}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <input className={inputCls} placeholder="Barang lain…" value={custom} onChange={(e) => setCustom(e.target.value)} maxLength={60} />
        <Btn type="button" variant="ghost" small className="!min-h-11" onClick={() => { add(custom); setCustom(''); }}>Tambah</Btn>
      </div>
    </div>
  );
}
