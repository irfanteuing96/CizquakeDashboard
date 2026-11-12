'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { Btn, Card, Loading, Msg } from './ui';
import { celebrate, TapEmoji } from './fx';

export type Me = {
  user: { id: number; name: string; username: string; role: 'admin' | 'staff' };
  branches: { id: number; name: string; is_pusat: boolean }[];
  branchId: number | null;
};
const MeCtx = createContext<{ me: Me; reloadMe: () => Promise<void> } | null>(null);
export const useMe = () => useContext(MeCtx)!;

const ICONS: Record<string, string> = {
  home: 'M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4.5V12l3.2 2',
  box: 'M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5zM3.5 7.5 12 12l8.5-4.5M12 12v9',
  note: 'M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm7 0v5h5M9 13h6M9 17h4',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 9c0-3.6 3.6-6 8-6s8 2.4 8 6',
  chart: 'M4 20V10m6 10V4m6 16v-7m4 7H2',
  coin: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm2.5 6.2c-.4-.8-1.3-1.2-2.5-1.2-1.5 0-2.6.7-2.6 1.9 0 2.8 5.3 1.3 5.3 4.1 0 1.2-1.1 2-2.7 2-1.3 0-2.3-.5-2.8-1.4M12 6.5V8m0 8v1.5',
  truck: 'M2 6h11v10H2zm11 4h4.5L21 13.5V16h-8zM6.5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm10.5 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  gear: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19 12a7 7 0 0 0-.1-1.3l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2.3-1.3L14 3h-4l-.3 2.5a7 7 0 0 0-2.3 1.3l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2.6l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2.3 1.3L10 21h4l.3-2.5a7 7 0 0 0 2.3-1.3l2.3 1 2-3.4-2-1.5c.1-.4.1-.9.1-1.3z',
};
function Icon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={ICONS[name]} />
    </svg>
  );
}

const STAFF_NAV = [
  ['/', 'Beranda', 'home'],
  ['/absen', 'Absen', 'clock'],
  ['/stok', 'Stok', 'box'],
  ['/laporan', 'Laporan', 'note'],
  ['/akun', 'Akun', 'user'],
];
const ADMIN_NAV = [
  ['/admin', 'Ringkasan', 'chart'],
  ['/admin/absensi', 'Absensi', 'clock'],
  ['/admin/penjualan', 'Penjualan', 'coin'],
  ['/admin/pengiriman', 'Kiriman', 'truck'],
  ['/admin/kelola', 'Kelola', 'gear'],
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
      <div className={`mx-auto min-h-dvh pb-28 ${isAdmin ? 'max-w-3xl' : 'max-w-md'}`}>
        <header className="sticky top-0 z-10">
          <div className="flex items-center justify-between gap-3 bg-brand px-4 py-2.5">
            <TapEmoji effect="anim-jelly" onTap={(e) => celebrate(['🧀'], { x: e.clientX, y: e.clientY })}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Cizquake" width={66} height={48} className="logo-shadow h-12 w-auto" />
            </TapEmoji>
            <div className="min-w-0 flex-1 text-right">
              <div className="truncate font-display text-base font-extrabold leading-tight text-ink">{isAdmin ? 'Admin Pusat' : branch ? branch.name : 'Pilih cabang'} ⚡</div>
              <div className="truncate text-xs font-bold text-ink/70">{me.user.name}</div>
            </div>
            {isAdmin ? (
              <button className="press rounded-full border-2 border-ink bg-ink px-3 py-1.5 font-display text-xs font-extrabold text-brand" onClick={async () => { await api('logout', {}); router.replace('/login'); }}>Keluar</button>
            ) : null}
          </div>
          <div className="overflow-hidden border-y-2 border-ink bg-ink py-1.5" aria-hidden>
            <div className="marquee font-display text-[11px] font-extrabold uppercase tracking-[0.18em] text-brand">
              {[0, 1].map((i) => (
                <span key={i} className="whitespace-nowrap px-4">
                  Creamy &amp; lembut · {isAdmin ? 'Pantau semua cabang real time' : branch ? `Cabang ${branch.name}` : 'Cizquake'} · Semangat jualan hari ini · Jangan lupa absen &amp; laporan · Cizquake goyang ·{' '}
                </span>
              ))}
            </div>
          </div>
        </header>
        <main key={path} className="stagger space-y-4 p-4">{needPick ? <BranchPicker me={me} reloadMe={reloadMe} /> : children}</main>
        {!needPick && (
          <nav className="fixed inset-x-0 bottom-0 z-10 border-t-2 border-ink bg-white pb-[env(safe-area-inset-bottom)]">
            <div className={`mx-auto flex items-center justify-between gap-1 px-2 py-2 ${isAdmin ? 'max-w-3xl' : 'max-w-md'}`}>
              {nav.map(([href, label, icon]) => {
                const active = href === '/' || href === '/admin' ? path === href : path.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={`press flex min-h-12 items-center justify-center font-display font-extrabold ${
                      active ? 'anim-jelly sticker-sm gap-1.5 rounded-full bg-brand px-3.5 text-xs text-ink' : 'min-w-12 flex-1 flex-col gap-0.5 text-[9px] uppercase tracking-wider text-muted'
                    }`}
                  >
                    <Icon name={icon} />
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
