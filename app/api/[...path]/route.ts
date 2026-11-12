import { NextRequest, NextResponse } from 'next/server';
import { COOKIE, dispatch } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function handle(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const r = await dispatch(req, path, req.cookies.get(COOKIE)?.value);
  const res = NextResponse.json(r.data, { status: r.status, headers: { 'Cache-Control': 'no-store' } });
  if (r.newToken === null) res.cookies.delete(COOKIE);
  else if (r.newToken)
    res.cookies.set(COOKIE, r.newToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 30 * 24 * 3600,
    });
  return res;
}

export { handle as GET, handle as POST };
