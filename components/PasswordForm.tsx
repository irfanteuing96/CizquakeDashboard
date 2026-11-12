'use client';
import { useState } from 'react';
import { api } from '@/lib/client';
import { Btn, Field, inputCls, Msg } from './ui';

export function PasswordForm() {
  const [old, setOld] = useState('');
  const [nw, setNw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true); setErr(null); setOk(null);
        try {
          await api('me/password', { old, new: nw });
          setOk('Password berhasil diganti.');
          setOld(''); setNw('');
        } catch (e: any) { setErr(e.message); }
        setBusy(false);
      }}
    >
      <Field label="Password lama">
        <input className={inputCls} type="password" value={old} onChange={(e) => setOld(e.target.value)} autoComplete="current-password" required />
      </Field>
      <Field label="Password baru" hint="Minimal 6 karakter.">
        <input className={inputCls} type="password" value={nw} onChange={(e) => setNw(e.target.value)} autoComplete="new-password" required minLength={6} />
      </Field>
      <Msg error={err} ok={ok} />
      <Btn type="submit" variant="ghost" className="w-full" busy={busy}>Ganti password</Btn>
    </form>
  );
}
