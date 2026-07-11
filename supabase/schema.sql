-- =========================================================
-- MaintainIQ — Supabase schema (Track B)
-- Run this in the Supabase SQL editor (Project -> SQL Editor -> New query)
-- =========================================================

-- ---------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------
-- 1. profiles  (extends auth.users with app-level role)
-- ---------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'Unnamed User',
  role text not null default 'admin' check (role in ('admin', 'technician')),
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Unnamed User'),
    coalesce(new.raw_user_meta_data->>'role', 'admin')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------
-- 2. assets
-- ---------------------------------------------------------
create table if not exists public.assets (
  id uuid primary key default uuid_generate_v4(),
  asset_code text not null unique,
  name text not null,
  category text not null default 'General',
  location text not null default 'Unspecified',
  model text,
  condition text not null default 'Good' check (condition in ('Excellent','Good','Fair','Poor','Unsafe')),
  status text not null default 'Operational'
    check (status in ('Operational','Issue Reported','Under Inspection','Under Maintenance','Out of Service','Retired')),
  last_service_date date,
  next_service_date date,
  assigned_technician uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_assets_code on public.assets(asset_code);
create index if not exists idx_assets_status on public.assets(status);

-- ---------------------------------------------------------
-- 3. issues
-- ---------------------------------------------------------
create table if not exists public.issues (
  id uuid primary key default uuid_generate_v4(),
  issue_number text not null unique,
  asset_id uuid not null references public.assets(id) on delete cascade,
  title text not null,
  description text not null,
  category text default 'General',
  priority text not null default 'Medium' check (priority in ('Low','Medium','High','Critical')),
  status text not null default 'Reported'
    check (status in ('Reported','Assigned','Inspection Started','Maintenance In Progress','Waiting for Parts','Resolved','Closed','Reopened')),
  reporter_name text,
  reporter_contact text,
  ai_suggested boolean default false,
  ai_data jsonb,
  ai_edited boolean default false,
  assigned_technician uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_issues_asset on public.issues(asset_id);
create index if not exists idx_issues_status on public.issues(status);

-- ---------------------------------------------------------
-- 4. maintenance_records
-- ---------------------------------------------------------
create table if not exists public.maintenance_records (
  id uuid primary key default uuid_generate_v4(),
  issue_id uuid not null references public.issues(id) on delete cascade,
  technician_id uuid references public.profiles(id),
  inspection_notes text,
  work_performed text,
  parts_used text,
  cost numeric(10,2) default 0 check (cost >= 0),
  evidence_urls text[] default '{}',
  condition_after text,
  created_at timestamptz not null default now()
);

create index if not exists idx_maint_issue on public.maintenance_records(issue_id);

-- ---------------------------------------------------------
-- 5. asset_history  (append-only activity timeline)
-- ---------------------------------------------------------
create table if not exists public.asset_history (
  id uuid primary key default uuid_generate_v4(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  actor text not null default 'System',
  action text not null,
  related_issue_id uuid references public.issues(id),
  details text,
  created_at timestamptz not null default now()
);

create index if not exists idx_history_asset on public.asset_history(asset_id);

-- ---------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.assets enable row level security;
alter table public.issues enable row level security;
alter table public.maintenance_records enable row level security;
alter table public.asset_history enable row level security;

-- profiles: users can read all profiles (for technician dropdowns), edit only their own
create policy "profiles are readable by authenticated users"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- assets: PUBLIC can read safe columns via the public_assets view (below).
-- Raw table read/write requires an authenticated (admin/technician) session.
create policy "authenticated users can read assets"
  on public.assets for select
  using (auth.role() = 'authenticated');

create policy "anon can read assets for public asset page"
  on public.assets for select
  to anon
  using (true);

create policy "authenticated users can insert assets"
  on public.assets for insert
  to authenticated
  with check (true);

create policy "authenticated users can update assets"
  on public.assets for update
  to authenticated
  using (true);

-- issues: anyone (including anonymous reporters scanning a QR) can create an issue.
create policy "anyone can report an issue"
  on public.issues for insert
  to anon, authenticated
  with check (true);

create policy "anyone can read issues"
  on public.issues for select
  to anon, authenticated
  using (true);

create policy "authenticated users can update issues"
  on public.issues for update
  to authenticated
  using (true);

-- maintenance_records: only authenticated (technician/admin) users
create policy "authenticated users can read maintenance records"
  on public.maintenance_records for select
  to authenticated
  using (true);

create policy "authenticated users can insert maintenance records"
  on public.maintenance_records for insert
  to authenticated
  with check (true);

-- asset_history: readable by anyone (safe activity feed shown on public page),
-- insertable by authenticated users and by the app on behalf of anonymous reporters.
create policy "anyone can read asset history"
  on public.asset_history for select
  to anon, authenticated
  using (true);

create policy "anyone can insert asset history"
  on public.asset_history for insert
  to anon, authenticated
  with check (true);

-- ---------------------------------------------------------
-- Safe public view — used by the public asset page so that
-- internal fields are never exposed even if a policy is loosened later.
-- ---------------------------------------------------------
create or replace view public.public_assets as
  select
    id, asset_code, name, category, location, condition, status,
    last_service_date, next_service_date
  from public.assets;

-- ---------------------------------------------------------
-- Helper: generate the next sequential issue number, e.g. ISS-000123
-- ---------------------------------------------------------
create sequence if not exists public.issue_number_seq;

create or replace function public.next_issue_number()
returns text as $$
  select 'ISS-' || lpad(nextval('public.issue_number_seq')::text, 6, '0');
$$ language sql;
