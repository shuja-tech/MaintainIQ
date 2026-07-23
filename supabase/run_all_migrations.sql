-- =========================================================
-- MaintainIQ — RUN ALL MIGRATIONS (Copy & paste into Supabase SQL Editor)
-- Safe to run multiple times — all statements use IF NOT EXISTS / DROP IF EXISTS
-- =========================================================

-- 1️⃣ UPDATE PROFILES TRIGGER — prevents self-registration as admin
--    All new users default to 'technician' role, never trust client metadata
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Unnamed User'),
    'technician'  -- ⛔ NEVER trust client-provided role!
  );
  return new;
end;
$$ language plpgsql security definer;

-- 2️⃣ ADD RLS POLICY — so admins can promote users
drop policy if exists "admins can update any profile" on public.profiles;
create policy "admins can update any profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() in (select id from public.profiles where role = 'admin'));

-- 3️⃣ CREATE admin_requests TABLE — approval workflow
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

alter table public.admin_requests enable row level security;

drop policy if exists "admins can read all admin_requests" on public.admin_requests;
create policy "admins can read all admin_requests"
  on public.admin_requests for select
  to authenticated
  using (auth.uid() in (select id from public.profiles where role = 'admin'));

drop policy if exists "users can read their own admin_requests" on public.admin_requests;
create policy "users can read their own admin_requests"
  on public.admin_requests for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "authenticated users can insert admin_requests" on public.admin_requests;
create policy "authenticated users can insert admin_requests"
  on public.admin_requests for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "only admins can update admin_requests" on public.admin_requests;
create policy "only admins can update admin_requests"
  on public.admin_requests for update
  to authenticated
  using (auth.uid() in (select id from public.profiles where role = 'admin'));

-- 4️⃣ CREATE audit_log TABLE — accountability
create table if not exists public.audit_log (
  id uuid primary key default uuid_generate_v4(),
  action text not null,
  details text,
  actor_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_log_action on public.audit_log(action);
create index if not exists idx_audit_log_created on public.audit_log(created_at);

alter table public.audit_log enable row level security;

drop policy if exists "admins can read audit log" on public.audit_log;
create policy "admins can read audit log"
  on public.audit_log for select
  to authenticated
  using (auth.uid() in (select id from public.profiles where role = 'admin'));

drop policy if exists "authenticated users can insert audit log" on public.audit_log;
create policy "authenticated users can insert audit log"
  on public.audit_log for insert
  to authenticated
  with check (true);
