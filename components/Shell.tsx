'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { Btn, Card, Loading, Msg } from './ui';

export type Me = {
  user: { id: number; name: string; username: string; role: 'admin' | 'staff' };
  branches: { id: number; name: string; is_pusat: boolean }[];
  branchId: number | null;
};
const MeCtx = createContext<{ me: Me; reloadMe: () => Promise<void> } | null>(null);
export const useMe = () => useContext(MeCtx)!;

const STAFF_NAV = [
  ['/', 'Beranda', '🏠'],
  ['/absen', 'Absen', '⏰'],
  ['/stok', 'Stok', '📦'],
  ['/laporan', 'Laporan', '📝'],
  ['/akun', 'Akun', '👤'],
];
const ADMIN_NAV = [
  ['/admin', 'Ringkasan', '📊'],
  ['/admin/absensi', 'Absensi', '⏰'],
  ['/admin/penjualan', 'Penjualan', '💰'],
  ['/admin/pengiriman', 'Kiriman', '🚚'],
  ['/admin/kelola', 'Kelola', '⚙️'],
];

export default function Shell({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const path = usePathname();

  const reloadMe = useCallback(async () => {
    try {
      setMe(await api<Me>('me'));
      setError(null);
    } catch (e: any) {
      if (e.status === 401) router.replace('/login');
      else setError(e.message);
    }
  }, [router]);
  useEffect(() => {
    reloadMe();
  }, [reloadMe]);

  const isAdmin = me?.user.role === 'admin';
  const wrongArea = me && isAdmin !== path.startsWith('/admin');
  useEffect(() => {
    if (wrongArea) router.replace(isAdmin ? '/admin' : '/');
  }, [wrongArea, isAdmin, router]);

  if (error) return <div className="mx-auto max-w-md p-4"><Msg error={error} /><Btn className="mt-3 w-full" onClick={reloadMe}>Coba lagi</Btn></div>;
  if (!me || wrongArea) return <Loading />;

  const branch = me.branches.find((b) => b.id === me.branchId);
  const nav = isAdmin ? ADMIN_NAV : STAFF_NAV;
  const needPick = !isAdmin && !branch;

  return (
    <MeCtx.Provider value={{ me, reloadMe }}>
      <div className={`mx-auto min-h-dvh pb-24 ${isAdmin ? 'max-w-3xl' : 'max-w-md'}`}>
        <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-line bg-cream/95 px-4 py-3 backdrop-blur">
          <div className="min-w-0">
            <div className="text-lg font-bold leading-tight">🧀 Cizquake</div>
            <div className="truncate text-xs text-muted">{isAdmin ? 'Admin' : branch ? `Cabang ${branch.name}` : 'Pilih cabang'} · {me.user.name}</div>
          </div>
          {isAdmin ? (
            <Btn variant="ghost" small onClick={async () => { await api('logout', {}); router.replace('/login'); }}>Keluar</Btn>
          ) : null}
        </header>
        <main className="space-y-4 p-4">{needPick ? <BranchPicker me={me} reloadMe={reloadMe} /> : children}</main>
        {!needPick && (
          <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-white pb-[env(safe-area-inset-bottom)]">
            <div className={`mx-auto grid grid-cols-5 ${isAdmin ? 'max-w-3xl' : 'max-w-md'}`}>
              {nav.map(([href, label, icon]) => {
                const active = href === '/' || href === '/admin' ? path === href : path.startsWith(href);
                return (
                  <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`flex min-h-14 flex-col items-center justify-center text-[11px] font-medium ${active ? 'text-ink' : 'text-muted'}`}>
                    <span className={`flex h-7 w-12 items-center justify-center rounded-full text-lg ${active ? 'bg-brand-soft' : ''}`} aria-hidden>{icon}</span>
                    {label}
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </MeCtx.Provider>
  );
}

export function BranchPicker({ me, reloadMe }: { me: Me; reloadMe: () => Promise<void> }) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  if (!me.branches.length)
    return (
      <Card>
        <p className="font-semibold">Akun kamu belum ditugaskan ke cabang.</p>
        <p className="mt-1 text-sm text-muted">Minta admin untuk menambahkan cabang ke akunmu.</p>
        <Btn variant="ghost" className="mt-3 w-full" onClick={async () => { await api('logout', {}); router.replace('/login'); }}>Keluar</Btn>
      </Card>
    );
  return (
    <Card>
      <p className="mb-3 font-semibold">Hari ini jaga di cabang mana?</p>
      <div className="space-y-2">
        {me.branches.map((b) => (
          <Btn key={b.id} variant={b.id === me.branchId ? 'primary' : 'ghost'} className="w-full" onClick={async () => {
            try { await api('me/branch', { branchId: b.id }); await reloadMe(); } catch (e: any) { setErr(e.message); }
          }}>{b.name}</Btn>
        ))}
      </div>
      <div className="mt-2"><Msg error={err} /></div>
    </Card>
  );
}
