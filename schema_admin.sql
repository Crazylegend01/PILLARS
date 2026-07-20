-- ============================================================
-- PROJECT PILLARS BY LEGENDS — schema_admin.sql
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- Run AFTER the original schema.sql
-- ============================================================

-- ── 1. ADD ROLE + BAN COLUMNS TO PROFILES ───────────────────
alter table public.profiles
  add column if not exists role       text not null default 'user'
    check (role in ('superadmin','admin','subadmin','user')),
  add column if not exists is_banned  boolean not null default false;

comment on column public.profiles.role      is 'superadmin | admin | subadmin | user';
comment on column public.profiles.is_banned is 'Banned users cannot access protected routes';

-- ── 2. ANNOUNCEMENTS TABLE ───────────────────────────────────
create table if not exists public.announcements (
  id          uuid         primary key default gen_random_uuid(),
  author_id   uuid         references public.profiles(id) on delete set null,
  title       text         not null,
  body        text         not null,
  category    text         not null default 'general'
              check (category in ('general','update','event','warning')),
  created_at  timestamptz  not null default now()
);

comment on table public.announcements is
  'Admin-posted announcements visible across the platform.';

-- ── 3. RLS FOR ANNOUNCEMENTS ─────────────────────────────────
alter table public.announcements enable row level security;

-- Everyone can read announcements
drop policy if exists "Announcements are publicly readable" on public.announcements;
create policy "Announcements are publicly readable"
  on public.announcements for select
  using (true);

-- Only admins/superadmins/subadmins can insert
drop policy if exists "Admins can post announcements" on public.announcements;
create policy "Admins can post announcements"
  on public.announcements for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('superadmin','admin','subadmin')
    )
  );

-- Only admins can delete announcements
drop policy if exists "Admins can delete announcements" on public.announcements;
create policy "Admins can delete announcements"
  on public.announcements for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('superadmin','admin')
    )
  );

-- ── 4. ADMIN RLS FOR PROFILES ────────────────────────────────
-- Admins can update any user's role / ban status
drop policy if exists "Admins can update any profile" on public.profiles;
create policy "Admins can update any profile"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('superadmin','admin')
    )
  );

-- ── 5. INDEXES ───────────────────────────────────────────────
create index if not exists idx_profiles_role      on public.profiles (role);
create index if not exists idx_profiles_is_banned on public.profiles (is_banned);
create index if not exists idx_announcements_cat  on public.announcements (category);

-- ── 6. SET YOURSELF AS SUPERADMIN ────────────────────────────
-- After running this file, run this separately to make your
-- account the superadmin (replace with your actual user UUID):
--
--   update public.profiles
--   set role = 'superadmin'
--   where id = '<your-user-uuid-here>';
--
-- Find your UUID in: Supabase Dashboard → Authentication → Users

-- ── 7. VERIFY ────────────────────────────────────────────────
-- select id, display_name, role, is_banned from public.profiles limit 10;
-- select * from public.announcements limit 5;
