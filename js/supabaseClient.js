/* ============================================================
   PROJECT PILLARS BY LEGENDS — js/supabaseClient.js
   Supabase Client Initialisation (ESM CDN)
   ============================================================
   Replace the placeholders below with your actual values from:
   Supabase Dashboard → Project Settings → API
   ============================================================ */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ── CONFIGURATION ────────────────────────────────────────────
export const SUPABASE_URL      = 'https://yebifwddhxuefysqlwrr.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllYmlmd2RkaHh1ZWZ5c3Fsd3JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0OTA5OTQsImV4cCI6MjEwMDA2Njk5NH0.sHJsrJQDjD_pVi9DsYBwh9EAvnXRsTrr3rsALVwXq68';

// ── CLIENT INSTANCE ──────────────────────────────────────────
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession:   true,
    detectSessionInUrl: true,          // Required for OAuth redirect
    storageKey: 'pillars_auth_token',
  },
});
