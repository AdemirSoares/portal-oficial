import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

// This client runs in the browser. Accept only publishable project keys.
export const supabase = url && key?.startsWith('sb_publishable_')
  ? createClient(url, key, { auth: { flowType: 'implicit' } })
  : null;
