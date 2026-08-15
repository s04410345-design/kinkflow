import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ADMIN_COOKIE = 'kinkflow_admin_session';
const LOGIN_PATH = '/admin/login';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!token || !supabaseUrl || !anonKey) {
    return redirectToLogin(request);
  }

  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData.user) {
    return redirectToLogin(request);
  }

  const { data: role, error: roleError } = await client
    .from('admin_roles')
    .select('role_level')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (roleError || !role || role.role_level > 2) {
    return redirectToLogin(request);
  }

  return NextResponse.next();
}

function redirectToLogin(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = LOGIN_PATH;
  url.search = '';
  url.searchParams.set('next', request.nextUrl.pathname);
  const response = NextResponse.redirect(url);
  response.cookies.set({
    name: ADMIN_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};
