import { createClient } from '@supabase/supabase-js';
import { isPrimaryAdmin } from './adminAccess';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

let anonymousSignInPromise = null;

export async function ensureAnonymousSession() {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (data.session?.user.is_anonymous || isPrimaryAdmin(data.session?.user)) return data.session;
  if (data.session) {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) throw signOutError;
  }

  if (!anonymousSignInPromise) {
    anonymousSignInPromise = supabase.auth.signInAnonymously()
      .then(({ data: anonymousData, error: anonymousError }) => {
        if (anonymousError) throw anonymousError;
        if (!anonymousData.session) throw new Error('Unable to create a visitor session.');
        return anonymousData.session;
      })
      .finally(() => { anonymousSignInPromise = null; });
  }

  return anonymousSignInPromise;
}

export const SUPABASE_SETUP_MESSAGE =
  'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.';
