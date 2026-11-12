'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T = any>(path: string, body?: any): Promise<T> {
  let res: Response;
  try {
    res = await fetch('/api/' + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(0, 'Tidak ada koneksi internet.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || 'Terjadi kesalahan.');
  return data;
}

/** Ambil data lalu perbarui otomatis tiap beberapa detik (supaya dashboard terasa real time). */
export function usePoll<T = any>(path: string | null, ms = 15000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pathRef = useRef(path);
  pathRef.current = path;
  const reload = useCallback(async () => {
    const p = pathRef.current;
    if (!p) return;
    try {
      const d = await api<T>(p);
      if (pathRef.current === p) {
        setData(d);
        setError(null);
      }
    } catch (e: any) {
      if (e.status === 401) window.location.href = '/login';
      else if (pathRef.current === p) setError(e.message);
    }
  }, []);
  useEffect(() => {
    setData(null);
    reload();
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') reload();
    }, ms);
    const onVis = () => document.visibilityState === 'visible' && reload();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [path, ms, reload]);
  return { data, error, reload };
}

const TZ = 'Asia/Jakarta';
export const todayWIB = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
export const addDays = (d: string, n: number) => new Date(Date.parse(d + 'T00:00:00Z') + n * 86400_000).toISOString().slice(0, 10);
export const fmtTime = (iso?: string | null) =>
  iso ? new Intl.DateTimeFormat('id-ID', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso)) : '—';
export const fmtDate = (d: string, long = false) =>
  new Intl.DateTimeFormat('id-ID', { timeZone: 'UTC', weekday: long ? 'long' : 'short', day: 'numeric', month: long ? 'long' : 'short', year: long ? 'numeric' : undefined }).format(
    new Date(d + 'T00:00:00Z')
  );
export const fmtDateTime = (iso?: string | null) =>
  iso ? new Intl.DateTimeFormat('id-ID', { timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso)) : '—';
export const rupiah = (n: number) => 'Rp' + (n || 0).toLocaleString('id-ID');
export const hoursBetween = (a?: string | null, b?: string | null) => (a && b ? Math.max(0, (Date.parse(b) - Date.parse(a)) / 3600_000) : 0);
export const fmtDur = (h: number) => {
  const m = Math.round(h * 60);
  return m ? `${Math.floor(m / 60)}j ${String(m % 60).padStart(2, '0')}m` : '—';
};
/** ISO → nilai untuk <input type="datetime-local"> dalam WIB, dan sebaliknya. */
export const toLocalInput = (iso?: string | null) => (iso ? new Date(Date.parse(iso) + 7 * 3600_000).toISOString().slice(0, 16) : '');
export const fromLocalInput = (v: string) => (v ? new Date(v + ':00+07:00').toISOString() : null);

export const CHANNELS: [string, string][] = [
  ['shopee', 'Shopee'],
  ['grab', 'Grab'],
  ['gofood', 'GoFood'],
  ['offline', 'Offline'],
  ['upselling', 'Upselling'],
  ['repeat', 'Repeat order'],
];
export const MONEY: [string, string][] = [
  ['upselling', 'Upselling'],
  ['offline', 'Penjualan offline'],
  ['repeat', 'Repeat order'],
  ['gift', 'Gift (lilin, kartu)'],
];
export const LEVELS: [string, string][] = [
  ['habis', 'Habis'],
  ['sedikit', 'Sedikit lagi'],
  ['sedang', 'Sedang'],
];
export const RESTOCK_ITEMS = [
  'Choco crunchy', 'Tiramisu crunchy', 'Keju', 'Sendok', 'Lilin', 'Tisu', 'Ripet', 'Kartu thank you', 'Kartu ucapan',
  'Plastik biru sedang', 'Plastik biru besar', 'Selai matcha', 'Selai coklat', 'Selai blueberry', 'Selai strawberry',
  'Selai caramel', 'Selai red velvet', 'Selai lotus', 'Crumble oreo', 'Crumble lotus', 'Crumble matcha', 'Crumble red velvet', 'Brownies',
];

export function downloadCsv(name: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    let s = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // cegah formula injection di Excel
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const blob = new Blob(['﻿' + rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
