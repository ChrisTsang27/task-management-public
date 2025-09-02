-- SAFE RESET + CREATE for this app's schema.
-- Run in Supabase SQL Editor (this will DROP and RECREATE the app tables/types/functions).
-- WARNING: This deletes existing data in these tables.

-- ===== 1) DROP existing objects (dependency order) =====
drop table if exists public.announcement_reactions cascade;
drop table if exists public.announcement_comments cascade;
drop table if exists public.announcements cascade;
drop table if exists public.email_logs cascade;
drop table if exists public.tasks cascade;
drop table if exists public.team_members cascade;
drop table if exists public.teams cascade;
drop table if exists public.profiles cascade;

drop type if exists public.task_status;
drop function if exists public.set_updated_at();

-- ===== 2) Extensions =====
create extension if not exists "uuid-ossp";

-- ===== 3) Helpers =====
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ===== 4) Auth-linked profiles =====
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  title text, -- Job title (e.g., Manager, Senior Officer, Team Leader)
  role text check (role in ('admin','member')) default 'member', -- Application role for permissions
  department text,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- ===== 5) Teams and membership =====
create table public.teams (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text check (role in ('admin','member')) default 'member', -- Team-specific role
  primary key (team_id, user_id),
  created_at timestamptz not null default now()
);

-- ===== 6) Tasks =====
create type task_status as enum (
  'awaiting_approval','approved','in_progress','pending_review','rework','done'
);

create table public.tasks (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid references public.teams(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  assignee_id uuid references public.profiles(id) on delete set null,
  title text not null,
  description_json jsonb,
  status task_status not null default 'awaiting_approval',
  due_date date,
  is_request boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

-- ===== 7) Announcements (+ comments/reactions) =====
create table public.announcements (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid references public.teams(id) on delete set null,
  title text not null,
  content text not null,
  priority text check (priority in ('low','medium','high')) default 'medium',
  expires_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_ann_updated_at
before update on public.announcements
for each row execute function public.set_updated_at();

create table public.announcement_comments (
  id uuid primary key default uuid_generate_v4(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.announcement_reactions (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (announcement_id, user_id, emoji)
);

-- ===== 8) Email logs =====
create table public.email_logs (
  id uuid primary key default uuid_generate_v4(),
  sent_by uuid references public.profiles(id) on delete set null,
  recipients jsonb not null, -- [{name,email}]
  subject text not null,
  html text not null,
  status text not null default 'queued',
  meta jsonb,
  created_at timestamptz not null default now()
);

-- ===== 9) Enable RLS =====
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.tasks enable row level security;
alter table public.announcements enable row level security;
alter table public.announcement_comments enable row level security;
alter table public.announcement_reactions enable row level security;
alter table public.email_logs enable row level security;

-- ===== 10) RLS Policies =====

-- profiles: allow all authenticated users to read profiles (needed for team collaboration)
create policy "profiles_read_all" on public.profiles
for select using ( auth.role() = 'authenticated' );

create policy "profiles_self_update" on public.profiles
for update using ( auth.uid() = id );

create policy "profiles_self_insert" on public.profiles
for insert with check ( auth.uid() = id );

-- teams: members read
create policy "teams_member_read" on public.teams
for select using (
  exists (select 1 from public.team_members tm where tm.team_id = id and tm.user_id = auth.uid())
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- team_members: user reads their memberships; admins read all via admin profile
create policy "team_members_read" on public.team_members
for select using (
  user_id = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- tasks: members read; creators/admins insert/update
create policy "tasks_read" on public.tasks
for select using (
  team_id is null
  or exists (select 1 from public.team_members tm where tm.team_id = tasks.team_id and tm.user_id = auth.uid())
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

create policy "tasks_insert" on public.tasks
for insert with check ( created_by = auth.uid() );

create policy "tasks_update" on public.tasks
for update using (
  created_by = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- announcements: readable by team or public if team_id null
create policy "ann_read" on public.announcements
for select using (
  team_id is null
  or exists (select 1 from public.team_members tm where tm.team_id = announcements.team_id and tm.user_id = auth.uid())
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

create policy "ann_insert" on public.announcements
for insert with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

create policy "ann_update" on public.announcements
for update using (
  created_by = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

create policy "ann_delete" on public.announcements
for delete using (
  created_by = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- comments
create policy "ann_comments_read" on public.announcement_comments
for select using ( true );

create policy "ann_comments_insert" on public.announcement_comments
for insert with check ( user_id = auth.uid() );

create policy "ann_comments_delete" on public.announcement_comments
for delete using (
  user_id = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- reactions
create policy "ann_reactions_all" on public.announcement_reactions
for all using ( user_id = auth.uid() ) with check ( user_id = auth.uid() );

-- email logs: creator reads own; admins read all; creator inserts
create policy "email_logs_read" on public.email_logs
for select using (
  sent_by = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

create policy "email_logs_insert" on public.email_logs
for insert with check ( sent_by = auth.uid() );