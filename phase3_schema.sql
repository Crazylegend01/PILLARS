-- ============================================================
-- PROJECT PILLARS BY LEGENDS — phase3_schema.sql
-- Phase 3: Profile Setup Engine & Buyer/Seller Modes
-- Run in: Supabase Dashboard → SQL Editor → New query
-- Run AFTER schema.sql and schema_admin.sql
-- ============================================================

-- ── 1. ADD PHASE 3 COLUMNS TO PROFILES ──────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS language             TEXT        NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS profile_tag          TEXT        UNIQUE,
  ADD COLUMN IF NOT EXISTS business_name        TEXT,
  ADD COLUMN IF NOT EXISTS business_name_locked BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS social_links         JSONB       NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS mode                 TEXT        NOT NULL DEFAULT 'BUYER'
    CHECK (mode IN ('BUYER', 'SELLER')),
  ADD COLUMN IF NOT EXISTS is_verified_admin    BOOLEAN     NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.profile_tag          IS 'Unique @handle, immutable once set';
COMMENT ON COLUMN public.profiles.business_name        IS 'Optional business name';
COMMENT ON COLUMN public.profiles.business_name_locked IS 'True once business name has been saved — cannot be changed';
COMMENT ON COLUMN public.profiles.social_links         IS 'JSON array: [{platform, url}]';
COMMENT ON COLUMN public.profiles.mode                 IS 'BUYER | SELLER — current active role';
COMMENT ON COLUMN public.profiles.is_verified_admin    IS 'Verified admin badge';

-- ── 2. INDEX — profile_tag lookup ───────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_profile_tag
  ON public.profiles (profile_tag)
  WHERE profile_tag IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_mode
  ON public.profiles (mode);

-- ── 3. AVATARS STORAGE BUCKET ───────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- ── 4. STORAGE RLS POLICIES ─────────────────────────────────
DROP POLICY IF EXISTS "Avatar images are publicly viewable" ON storage.objects;
CREATE POLICY "Avatar images are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── 5. UPDATED PROFILE RLS ───────────────────────────────────
-- Users can read their own full profile
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (except role/ban fields — those are admin-only)
DROP POLICY IF EXISTS "Users can update own profile fields" ON public.profiles;
CREATE POLICY "Users can update own profile fields"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── 6. VERIFY ────────────────────────────────────────────────
-- SELECT id, display_name, profile_tag, business_name,
--        business_name_locked, language, mode, social_links
-- FROM public.profiles LIMIT 10;
