-- =========================================================
-- MaintainIQ — Migration: Admin Approval Request System
-- Run this in the Supabase SQL editor (Project -> SQL Editor -> New query)
-- This is safe to run on the existing database (no destructive changes)
-- =========================================================

-- ---------------------------------------------------------
-- 1. Create admin_requests table (if it doesn't exist yet)
-- ---------------------------------------------------------
create table if not exists public.admin_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null,
  email text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_requests_status on public.admin_requests(status);
create index if not exists idx_admin_requests_user on public.admin_requests(user_id);

-- ---------------------------------------------------------
-- 2. Enable RLS & add policies for admin_requests
-- ---------------------------------------------------------
alter table public.admin_requests enable row level security;

create policy "admins can read all admin_requests"
  on public.admin_requests for select
  to authenticated
  using (
    auth.uid() in (select id from public.profiles where role = 'admin')
  );

create policy "users can read their own admin_requests"
  on public.admin_requests for select
  to authenticated
  using (auth.uid() = user_id);

create policy "authenticated users can insert admin_requests"
  on public.admin_requests for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "only admins can update admin_requests"
  on public.admin_requests for update
  to authenticated
  using (auth.uid() in (select id from public.profiles where role = 'admin'));

-- ---------------------------------------------------------
-- 3. Update the trigger so new users ALWAYS become 'technician'
--    (No one can self-register as admin)
-- ---------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Unnamed User'),
    'technician'  -- NEVER trust the raw metadata role!
  );
  return new;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------
-- 4. Add RLS policy so admins can update any profile
--    (needed for approving admin requests)
-- ---------------------------------------------------------
create policy "admins can update any profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() in (select id from public.profiles where role = 'admin'));

