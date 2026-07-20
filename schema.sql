-- ============================================================
-- PROJECT PILLARS BY LEGENDS — schema.sql
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ── 1. PROFILES TABLE ────────────────────────────────────────
-- Extends the built-in auth.users table.
-- One row per user, auto-created on signup via trigger below.

create table if not exists public.profiles (
  id               uuid         primary key references auth.users(id) on delete cascade,
  username         text         unique,
  display_name     text,
  avatar_url       text,
  phone_number     text,
  phone_verified   boolean      not null default false,
  legend_tier      text         not null default 'BRONZE'  -- BRONZE | SILVER | GOLD | DIAMOND
                   check (legend_tier in ('BRONZE','SILVER','GOLD','DIAMOND')),
  pillars_coins    integer      not null default 0,
  created_at       timestamptz  not null default now(),
  updated_at       timestamptz  not null default now()
);

comment on table public.profiles is
  'Public profile data for each authenticated Pillars user.';

-- ── 2. ROW LEVEL SECURITY ────────────────────────────────────
alter table public.profiles enable row level security;

-- Anyone can read profiles (for leaderboards, marketplace, etc.)
create policy "Profiles are publicly readable"
  on public.profiles for select
  using (true);

-- Only the owner can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Only the owner can insert their own profile
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ── 3. AUTO-CREATE PROFILE ON SIGNUP ─────────────────────────
-- Fires whenever a new row is inserted into auth.users.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Drop existing trigger if re-running
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 4. AUTO-UPDATE updated_at ────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ── 5. PHONE VERIFIED INDEX ───────────────────────────────────
create index if not exists idx_profiles_phone_verified
  on public.profiles (phone_verified);

-- ── 6. STORAGE BUCKET (optional – for avatars) ───────────────
-- Run separately if you need avatar upload support:
--
-- insert into storage.buckets (id, name, public)
-- values ('avatars', 'avatars', true)
-- on conflict do nothing;
--
-- create policy "Avatar images are publicly viewable"
--   on storage.objects for select
--   using ( bucket_id = 'avatars' );
--
-- create policy "Users can upload their own avatar"
--   on storage.objects for insert
--   with check ( bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1] );

-- ── 7. VERIFY SETUP ──────────────────────────────────────────
-- Run this after executing the above to confirm everything is in place:
-- select id, username, phone_verified, legend_tier from public.profiles limit 10;
