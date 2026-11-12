'use client';
import { useState } from 'react';
import { api, usePoll } from '@/lib/client';
import { Btn, Card, Field, H, inputCls, Loading, Msg, Pair } from '@/components/ui';
import { PasswordForm } from '@/components/PasswordForm';
import { useMe } from '@/components/Shell';

export default function Kelola() {
  const { me } = useMe();
  const branches = usePoll<any>('admin/branches', 60000);
  const users = usePoll<any>('admin/users', 60000);
  const [user, setUser] = useState<any | null>(null);
  const [branch, setBranch] = useState<any | null>(null);
  if (!branches.data || !users.data) return <Loading />;
  const bs: any[] = branches.data.rows;
  const bname = (id: number) => bs.find((b) => b.id === id)?.name || '?';

  return (
    <>
      <Card>
        <H right={<Btn small onClick={() => setUser({ id: 0, name: '', username: '', password: '', role: 'staff', active: true, branchIds: [] })}>+ Akun</Btn>}>Akun karyawan &amp; admin</H>
        {user && user.id === 0 && <UserForm u={user} branches={bs} onClose={() => setUser(null)} onDone={() => { setUser(null); users.reload(); }} />}
        <ul className="divide-y divide-line">
          {users.data.rows.map((u: any) => (
            <li key={u.id} className="py-2">
              <div className="flex items-center justify-between gap-2">
                <div className={`min-w-0 ${u.active ? '' : 'opacity-50'}`}>
                  <div className="font-medium">{u.name} <span className="text-sm font-normal text-muted">@{u.username}</span></div>
                  <div className="truncate text-xs text-muted">{u.role === 'admin' ? 'Admin' : u.branch_ids.map(bname).join(', ') || 'Belum ada cabang'}{u.active ? '' : ' · nonaktif'}</div>
                </div>
                <Btn variant="ghost" small onClick={() => setUser(user?.id === u.id ? null : { ...u, password: '', branchIds: u.branch_ids })}>Ubah</Btn>
              </div>
              {user?.id === u.id && <UserForm u={user} branches={bs} isSelf={u.id === me.user.id} onClose={() => setUser(null)} onDone={() => { setUser(null); users.reload(); }} />}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <H right={<Btn small onClick={() => setBranch({ id: 0, name: '', is_pusat: false, active: true, mini: 0, medium: 0 })}>+ Cabang</Btn>}>Cabang</H>
        {branch && branch.id === 0 && <BranchForm b={branch} onClose={() => setBranch(null)} onDone={() => { setBranch(null); branches.reload(); }} />}
        <ul className="divide-y divide-line">
          {bs.map((b) => (
            <li key={b.id} className="py-2">
              <div className="flex items-center justify-between gap-2">
                <div className={b.active ? '' : 'opacity-50'}>
                  <div className="font-medium">{b.name}{b.is_pusat ? ' · pusat' : ''}{b.active ? '' : ' · nonaktif'}</div>
                  <div className="text-xs text-muted tabular-nums">Stok: {b.mini} mini · {b.medium} medium</div>
                </div>
                <Btn variant="ghost" small onClick={() => setBranch(branch?.id === b.id ? null : { ...b })}>Ubah</Btn>
              </div>
              {branch?.id === b.id && <BranchForm b={branch} onClose={() => setBranch(null)} onDone={() => { setBranch(null); branches.reload(); }} />}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <H>Ganti password saya</H>
        <PasswordForm />
      </Card>
    </>
  );
}

function UserForm({ u, branches, isSelf, onClose, onDone }: { u: any; branches: any[]; isSelf?: boolean; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState(u);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toggle = (id: number) => setF({ ...f, branchIds: f.branchIds.includes(id) ? f.branchIds.filter((x: number) => x !== id) : [...f.branchIds, id] });
  return (
    <form
      className="my-3 space-y-3 rounded-xl bg-stone-50 p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true); setErr(null);
        try { await api('admin/users', f); onDone(); } catch (e: any) { setErr(e.message); }
        setBusy(false);
      }}
    >
      <Field label="Nama"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required maxLength={60} /></Field>
      <Field label="Username" hint="Huruf kecil/angka, tanpa spasi. Dipakai untuk login.">
        <input className={inputCls} value={f.username} onChange={(e) => setF({ ...f, username: e.target.value.toLowerCase().replace(/\s/g, '') })} autoCapitalize="none" autoCorrect="off" required />
      </Field>
      <Field label={f.id ? 'Password baru (kosongkan kalau tidak diganti)' : 'Password'} hint="Minimal 6 karakter. Kirim ke karyawan secara pribadi.">
        <input className={inputCls} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required={!f.id} minLength={6} autoComplete="off" />
      </Field>
      <Field label="Peran">
        <select className={inputCls} value={f.role} disabled={isSelf} onChange={(e) => setF({ ...f, role: e.target.value })}>
          <option value="staff">Karyawan cabang</option>
          <option value="admin">Admin (lihat semua cabang)</option>
        </select>
      </Field>
      {f.role === 'staff' && (
        <fieldset>
          <legend className="mb-1 text-sm font-medium">Cabang tempat login</legend>
          <div className="grid grid-cols-2 gap-1.5">
            {branches.filter((b) => b.active).map((b) => (
              <label key={b.id} className={`flex min-h-11 items-center gap-2 rounded-2xl border-2 px-3 text-sm font-bold ${f.branchIds.includes(b.id) ? 'border-ink bg-brand' : 'border-line bg-white'}`}>
                <input type="checkbox" className="h-4 w-4 accent-[#2b1613]" checked={f.branchIds.includes(b.id)} onChange={() => toggle(b.id)} />
                {b.name}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">Kalau lebih dari satu, karyawan memilih cabang saat login.</p>
        </fieldset>
      )}
      {f.id && !isSelf ? (
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-[#2b1613]" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />
          Akun aktif (hilangkan centang untuk karyawan yang sudah keluar)
        </label>
      ) : null}
      <Msg error={err} />
      <div className="flex gap-2">
        <Btn type="submit" small busy={busy}>Simpan</Btn>
        <Btn type="button" small variant="ghost" onClick={onClose}>Batal</Btn>
      </div>
    </form>
  );
}

function BranchForm({ b, onClose, onDone }: { b: any; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState(b);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="my-3 space-y-3 rounded-xl bg-stone-50 p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true); setErr(null);
        try {
          await api('admin/branches', { id: f.id, name: f.name, isPusat: f.is_pusat, active: f.active });
          if (f.id && (f.mini !== b.mini || f.medium !== b.medium)) await api('stock', { branchId: f.id, mini: f.mini, medium: f.medium, note: 'Koreksi admin' });
          onDone();
        } catch (e: any) { setErr(e.message); }
        setBusy(false);
      }}
    >
      <Field label="Nama cabang"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required maxLength={40} /></Field>
      {f.id ? <Pair label="Koreksi stok" mini={f.mini} medium={f.medium} onChange={(mini, medium) => setF({ ...f, mini, medium })} /> : null}
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" className="h-4 w-4 accent-[#2b1613]" checked={f.is_pusat} onChange={(e) => setF({ ...f, is_pusat: e.target.checked })} />
        Cabang pusat
      </label>
      {f.id ? (
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-[#2b1613]" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />
          Cabang aktif
        </label>
      ) : null}
      <Msg error={err} />
      <div className="flex gap-2">
        <Btn type="submit" small busy={busy}>Simpan</Btn>
        <Btn type="button" small variant="ghost" onClick={onClose}>Batal</Btn>
      </div>
    </form>
  );
}
