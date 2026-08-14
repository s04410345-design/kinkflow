import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Keep module evaluation build-safe. Runtime data access still requires real env vars.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
const runtimeUrl = supabaseUrl || 'http://127.0.0.1:54321';
const runtimeKey = supabaseKey || 'build-placeholder-anon-key';

export const supabase = createClient(runtimeUrl, runtimeKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: (...args) => {
      return fetch(args[0], {
        ...args[1],
        cache: 'no-store',
      });
    },
  },
});
