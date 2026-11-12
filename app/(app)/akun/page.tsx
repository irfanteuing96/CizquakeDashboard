'use client';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import { Btn, Card, H } from '@/components/ui';
import { BranchPicker, useMe } from '@/components/Shell';
import { PasswordForm } from '@/components/PasswordForm';

export default function Akun() {
  const { me, reloadMe } = useMe();
  const router = useRouter();
  return (
    <>
      <Card>
        <H>Akun</H>
        <div className="text-lg font-semibold">{me.user.name}</div>
        <div className="text-sm text-muted">@{me.user.username}</div>
      </Card>
      {me.branches.length > 1 && <BranchPicker me={me} reloadMe={reloadMe} />}
      <Card>
        <H>Ganti password</H>
        <PasswordForm />
      </Card>
      <Btn variant="ghost" className="w-full" onClick={async () => { await api('logout', {}); router.replace('/login'); }}>Keluar</Btn>
    </>
  );
}
