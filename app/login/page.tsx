'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { Btn, Card, Field, inputCls, Loading, Msg } from '@/components/ui';
import { celebrate, TapEmoji } from '@/components/fx';

export default function LoginPage() {
  const router = useRouter();
  const [setup, setSetup] = useState<boolean | null>(null);
  const [f, setF] = useState({ name: '', username: '', password: '' });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('setup').then((r) => setSetup(r.needsSetup)).catch((e) => setErr(e.message));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api(setup ? 'setup' : 'login', f);
      router.replace('/');
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-brand">
    <div className="stagger mx-auto flex min-h-dvh max-w-md flex-col justify-center p-5">
      <div className="mb-6 text-center">
        <TapEmoji idle="anim-float" effect="anim-jelly" onTap={(e) => celebrate(['🧀', '🍰', '💛'], { x: e.clientX, y: e.clientY })}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Cizquake" width={220} height={159} className="logo-shadow mx-auto h-36 w-auto" />
        </TapEmoji>
        <div className="mx-auto mt-3 inline-block rounded-full bg-ink px-4 py-1.5 font-display text-[11px] font-extrabold uppercase tracking-widest text-brand">🧀 Dashboard cabang</div>
        <h1 className="mt-3 text-2xl font-extrabold leading-tight text-ink">Laporan harian,<br />rapi &amp; real time.</h1>
      </div>
      {setup === null && !err ? <Loading /> : (
        <Card>
          <form onSubmit={submit} className="space-y-3">
            {setup ? (
              <>
                <p className="rounded-2xl bg-brand-soft p-3 text-sm">Belum ada akun. Buat <b>akun admin</b> pertama untuk mulai memakai aplikasi.</p>
                <Field label="Nama">
                  <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required maxLength={60} />
                </Field>
              </>
            ) : null}
            <Field label="Username">
              <input className={inputCls} value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} autoCapitalize="none" autoCorrect="off" autoComplete="username" required />
            </Field>
            <Field label="Password" hint={setup ? 'Minimal 6 karakter.' : undefined}>
              <input className={inputCls} type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete={setup ? 'new-password' : 'current-password'} required />
            </Field>
            <Msg error={err} />
            <Btn type="submit" variant="dark" className="w-full" disabled={busy}>{busy ? 'Memproses…' : setup ? 'Buat akun admin' : 'Masuk'}</Btn>
          </form>
        </Card>
      )}
      {setup === false ? <p className="mt-5 text-center text-xs font-bold text-ink/75">Belum punya akun atau lupa password? Hubungi admin.</p> : null}
    </div>
    </div>
  );
}
