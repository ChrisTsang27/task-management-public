-- Calendar Events Migration
-- Adds calendar events and event categories tables for the calendar feature

-- ===== 1) Event Categories =====
create table public.event_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  color text not null, -- Hex color code (e.g., '#FF5733')
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_event_categories_updated_at
before update on public.event_categories
for each row execute function public.set_updated_at();

-- ===== 2) Calendar Events =====
create table public.calendar_events (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  start_date timestamptz not null,
  end_date timestamptz not null,
  all_day boolean not null default false,
  category_id uuid references public.event_categories(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null, -- null means visible to all
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Ensure end_date is after start_date
  constraint check_date_order check (end_date >= start_date)
);

create trigger trg_calendar_events_updated_at
before update on public.calendar_events
for each row execute function public.set_updated_at();

-- ===== 3) Enable RLS =====
alter table public.event_categories enable row level security;
alter table public.calendar_events enable row level security;

-- ===== 4) RLS Policies =====

-- Event Categories: readable by all authenticated users; only admins can create/update/delete
create policy "event_categories_read" on public.event_categories
for select using ( auth.role() = 'authenticated' );

create policy "event_categories_insert" on public.event_categories
for insert with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

create policy "event_categories_update" on public.event_categories
for update using (
  created_by = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

create policy "event_categories_delete" on public.event_categories
for delete using (
  created_by = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Calendar Events: readable by team members or all if team_id is null; only admins can create/update/delete
create policy "calendar_events_read" on public.calendar_events
for select using (
  team_id is null
  or exists (select 1 from public.team_members tm where tm.team_id = calendar_events.team_id and tm.user_id = auth.uid())
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

create policy "calendar_events_insert" on public.calendar_events
for insert with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

create policy "calendar_events_update" on public.calendar_events
for update using (
  created_by = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

create policy "calendar_events_delete" on public.calendar_events
for delete using (
  created_by = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- ===== 5) Insert Default Categories =====
insert into public.event_categories (name, color, description, created_by) values
  ('Important Dates', '#FF5733', 'Critical dates and deadlines', null),
  ('Meetings', '#3498DB', 'Team meetings and conferences', null),
  ('Holidays', '#2ECC71', 'Company holidays and time off', null),
  ('Projects', '#9B59B6', 'Project milestones and deliverables', null),
  ('Training', '#F39C12', 'Training sessions and workshops', null);