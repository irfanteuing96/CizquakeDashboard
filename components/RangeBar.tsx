'use client';
import { addDays, todayWIB } from '@/lib/client';
import { inputCls } from './ui';

export type Range = { from: string; to: string; branch: string };
export const defaultRange = (): Range => ({ from: addDays(todayWIB(), -6), to: todayWIB(), branch: '' });
export const rangeQuery = (r: Range) => `from=${r.from}&to=${r.to}${r.branch ? `&branch=${r.branch}` : ''}`;

export function RangeBar({ value, onChange, branches }: { value: Range; onChange: (r: Range) => void; branches: any[] }) {
  const t = todayWIB();
  const presets: [string, string, string][] = [
    ['Hari ini', t, t],
    ['Kemarin', addDays(t, -1), addDays(t, -1)],
    ['7 hari', addDays(t, -6), t],
    ['Bulan ini', t.slice(0, 8) + '01', t],
  ];
  return (
    <div className="space-y-2 rounded-2xl border border-line bg-white p-3">
      <div className="flex flex-wrap gap-1.5">
        {presets.map(([label, f, to]) => {
          const on = value.from === f && value.to === to;
          return (
            <button key={label} onClick={() => onChange({ ...value, from: f, to })} className={`min-h-9 rounded-full border px-3 text-sm font-medium ${on ? 'border-brand bg-brand-soft' : 'border-line text-muted'}`}>{label}</button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <label className="block text-xs text-muted">Dari<input type="date" className={inputCls} value={value.from} max={value.to} onChange={(e) => e.target.value && onChange({ ...value, from: e.target.value })} /></label>
        <label className="block text-xs text-muted">Sampai<input type="date" className={inputCls} value={value.to} min={value.from} max={t} onChange={(e) => e.target.value && onChange({ ...value, to: e.target.value })} /></label>
        <label className="col-span-2 block text-xs text-muted sm:col-span-1">Cabang
          <select className={inputCls} value={value.branch} onChange={(e) => onChange({ ...value, branch: e.target.value })}>
            <option value="">Semua cabang</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-3">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      {sub ? <div className="text-xs text-muted">{sub}</div> : null}
    </div>
  );
}
