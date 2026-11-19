import { createClient, SupabaseClient } from '@supabase/supabase-js';

const runtimeUrl =
  typeof window !== 'undefined'
    ? window.localStorage.getItem('tc_supabase_url') || import.meta.env.VITE_SUPABASE_URL
    : import.meta.env.VITE_SUPABASE_URL;

const runtimeAnonKey =
  typeof window !== 'undefined'
    ? window.localStorage.getItem('tc_supabase_anon_key') || import.meta.env.VITE_SUPABASE_ANON_KEY
    : import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  runtimeUrl &&
    runtimeAnonKey &&
    runtimeUrl.startsWith('http') &&
    !runtimeUrl.includes('your-project-id')
);

export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? runtimeUrl! : 'https://placeholder-project.supabase.co',
  isSupabaseConfigured ? runtimeAnonKey! : 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export function saveRuntimeSupabaseConfig(url: string, anonKey: string) {
  window.localStorage.setItem('tc_supabase_url', url.trim());
  window.localStorage.setItem('tc_supabase_anon_key', anonKey.trim());
  window.location.reload();
}

export function clearRuntimeSupabaseConfig() {
  window.localStorage.removeItem('tc_supabase_url');
  window.localStorage.removeItem('tc_supabase_anon_key');
  window.location.reload();
}
