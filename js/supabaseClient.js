/* ============================================================
   PROJECT PILLARS BY LEGENDS — js/supabaseClient.js
   Supabase Client Initialisation (ESM CDN)
   ============================================================
   Replace the placeholders below with your actual values from:
   Supabase Dashboard → Project Settings → API
   ============================================================ */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ── CONFIGURATION ────────────────────────────────────────────
export const SUPABASE_URL      = 'YOUR_SUPABASE_URL';
export const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// ── CLIENT INSTANCE ──────────────────────────────────────────
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession:   true,
    detectSessionInUrl: true,          // Required for OAuth redirect
    storageKey: 'pillars_auth_token',
  },
});
