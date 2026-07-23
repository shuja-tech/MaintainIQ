-- =========================================================
-- Migration: Add audit_log table for accountability
-- Run this in the Supabase SQL editor
-- =========================================================

create table if not exists public.audit_log (
  id uuid primary key default uuid_generate_v4(),
  action text not null,
  details text,
  actor_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_log_action on public.audit_log(action);
create index if not exists idx_audit_log_created on public.audit_log(created_at);

-- RLS
alter table public.audit_log enable row level security;

-- Audit log RLS: admins can read all; the system/function inserts internally
create policy "admins can read audit log"
  on public.audit_log for select
  to authenticated
  using (
    auth.uid() in (select id from public.profiles where role = 'admin')
  );

create policy "authenticated users can insert audit log"
  on public.audit_log for insert
  to authenticated
  with check (true);
