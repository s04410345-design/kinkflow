import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Keep module evaluation build-safe. Runtime data access still requires real env vars.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
const runtimeUrl = supabaseUrl || 'http://127.0.0.1:54321';
const runtimeKey = supabaseKey || 'build-placeholder-anon-key';
const SUPABASE_REQUEST_TIMEOUT_MS = 12_000;

const fetchWithTimeout: typeof fetch = async (input, init = {}) => {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), SUPABASE_REQUEST_TIMEOUT_MS);

  const existingSignal = init.signal;
  const abortFromCaller = () => controller.abort();
  existingSignal?.addEventListener('abort', abortFromCaller, { once: true });

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
      cache: 'no-store',
    });
  } finally {
    globalThis.clearTimeout(timeoutId);
    existingSignal?.removeEventListener('abort', abortFromCaller);
  }
};

export const supabase = createClient(runtimeUrl, runtimeKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: fetchWithTimeout,
  },
});
