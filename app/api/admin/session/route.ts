import { NextResponse } from 'next/server';
import { getBearerToken, requireAdmin } from '@/lib/serverAuth';

export const runtime = 'nodejs';

const COOKIE_NAME = 'kinkflow_admin_session';
const COOKIE_MAX_AGE = 60 * 60 * 8;

function setAdminCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function POST(request: Request) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const result = await requireAdmin(request);
  if ('response' in result) return result.response;

  const response = NextResponse.json({ ok: true, userId: result.user.id });
  setAdminCookie(response, token);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
