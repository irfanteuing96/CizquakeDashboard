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
    <div className="stagger mx-auto flex min-h-dvh max-w-md flex-col justify-center p-5">
      <div className="mb-6 text-center">
        <TapEmoji className="text-6xl" idle="anim-float" effect="anim-spin" onTap={(e) => celebrate(['🧀', '🍰', '💛'], { x: e.clientX, y: e.clientY })}>🧀</TapEmoji>
        <h1 className="mt-2 text-2xl font-bold">Cizquake</h1>
        <p className="text-sm text-muted">Laporan &amp; rekap operasional cabang</p>
      </div>
      {setup === null && !err ? <Loading /> : (
        <Card>
          <form onSubmit={submit} className="space-y-3">
            {setup ? (
              <>
                <p className="rounded-xl bg-brand-soft p-3 text-sm">Belum ada akun. Buat <b>akun admin</b> pertama untuk mulai memakai aplikasi.</p>
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
            <Btn type="submit" className="w-full" disabled={busy}>{busy ? 'Memproses…' : setup ? 'Buat akun admin' : 'Masuk'}</Btn>
          </form>
        </Card>
      )}
      {setup === false ? <p className="mt-4 text-center text-xs text-muted">Belum punya akun atau lupa password? Hubungi admin.</p> : null}
    </div>
  );
}
