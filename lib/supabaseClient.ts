// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';
import logger from './logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables (only throw at runtime, not during build)
if (!supabaseUrl && typeof window !== 'undefined') {
  logger.error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey && typeof window !== 'undefined') {
  logger.error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

// Only log in development, and only once (not on every import)
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  // Check if we've already logged to avoid duplicate logs
  if (!(window as any).__supabase_logged) {
    logger.log('Supabase initialized');
    (window as any).__supabase_logged = true;
  }
}

// Use placeholder values during build time to avoid errors
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined
    },
    global: {
      headers: {
        'X-Client-Info': 'supabase-js-web'
      }
    }
  }
);
