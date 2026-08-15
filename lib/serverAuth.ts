import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

export async function requireUser(request: Request): Promise<{
  user: User;
  client: SupabaseClient;
} | { response: Response }> {
  if (!supabaseUrl || !anonKey) {
    return { response: Response.json({ error: 'Server misconfiguration' }, { status: 500 }) };
  }

  const token = getBearerToken(request);
  if (!token) {
    return { response: Response.json({ error: 'Authentication required' }, { status: 401 }) };
  }

  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    return { response: Response.json({ error: 'Invalid authentication token' }, { status: 401 }) };
  }

  return { user: data.user, client };
}

export function getServiceClient(): SupabaseClient | null {
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function requireAdmin(request: Request, minimumRole = 2): Promise<{
  user: User;
  client: SupabaseClient;
} | { response: Response }> {
  const result = await requireUser(request);
  if ('response' in result) return result;

  const { data: role, error } = await result.client
    .from('admin_roles')
    .select('role_level')
    .eq('user_id', result.user.id)
    .maybeSingle();

  if (error || !role || !Number.isInteger(role.role_level) || role.role_level > minimumRole) {
    return { response: Response.json({ error: 'Administrator permission required' }, { status: 403 }) };
  }

  return result;
}
