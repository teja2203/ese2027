-- ESE2027 push setup — run once in Supabase SQL Editor
-- 0) Offline-first progress envelope used by the native client and web app.
create table if not exists user_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table user_progress enable row level security;
create policy "own progress select" on user_progress for select using (auth.uid() = user_id);
create policy "own progress insert" on user_progress for insert with check (auth.uid() = user_id);
create policy "own progress update" on user_progress for update using (auth.uid() = user_id);

-- 1) table for device push subscriptions
create table if not exists push_subs (
  endpoint text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  sub jsonb not null,
  updated_at timestamptz default now()
);
alter table push_subs enable row level security;
create policy "own subs insert" on push_subs for insert with check (auth.uid() = user_id);
create policy "own subs update" on push_subs for update using (auth.uid() = user_id);
create policy "own subs select" on push_subs for select using (auth.uid() = user_id);

-- 2) Normalized study domain. The Android client writes these records from its
-- durable outbox; generated schedule data remains local/read-only and is not
-- uploaded as user content.
create table if not exists plans (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  start_date date,
  end_date date,
  color text not null default '#D71921',
  priority integer not null default 0,
  status text not null default 'planned',
  source text not null default 'user',
  revision bigint not null default 1,
  deleted_at bigint,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists study_blocks (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text references plans(id) on delete set null,
  title text not null,
  description text not null default '',
  date date not null,
  start_time bigint not null,
  end_time bigint not null,
  duration_minutes integer not null,
  category text not null default 'Study',
  color text not null default '#D71921',
  priority integer not null default 0,
  status text not null default 'planned',
  completion_percentage integer not null default 0,
  notes text not null default '',
  source text not null default 'user',
  schedule_key text,
  linked_focus_session_id text,
  follow_up_enabled boolean not null default true,
  revision bigint not null default 1,
  deleted_at bigint,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists focus_sessions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  start_time bigint not null,
  end_time bigint not null,
  duration integer not null,
  phase text not null,
  status text not null,
  time_left integer not null,
  break_duration integer not null default 10,
  logged integer not null default 0,
  loop boolean not null default true,
  strict_mode boolean not null default false,
  sound_mode text not null default 'off',
  plan_id text references plans(id) on delete set null,
  block_id text references study_blocks(id) on delete set null,
  planned_duration integer not null default 0,
  actual_duration integer not null default 0,
  pause_duration integer not null default 0,
  completion_percentage integer not null default 0,
  revision bigint not null default 1,
  deleted_at bigint,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists in_app_notifications (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  route text not null default 'today',
  plan_id text,
  block_id text,
  focus_session_id text,
  action_label text,
  dedupe_key text not null,
  read_at bigint,
  revision bigint not null default 1,
  deleted_at bigint,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  unique(user_id, dedupe_key)
);

-- Older copies of this setup used timestamptz for domain timestamps while the
-- Android model and outbox use epoch milliseconds. Convert those columns in
-- place so existing rows remain usable and future payloads stay symmetric.
do $$
declare
  timestamp_column record;
begin
  for timestamp_column in
    select * from (values
      ('plans', 'deleted_at', false),
      ('plans', 'created_at', true),
      ('plans', 'updated_at', true),
      ('study_blocks', 'deleted_at', false),
      ('study_blocks', 'created_at', true),
      ('study_blocks', 'updated_at', true),
      ('focus_sessions', 'deleted_at', false),
      ('focus_sessions', 'created_at', true),
      ('focus_sessions', 'updated_at', true),
      ('in_app_notifications', 'read_at', false),
      ('in_app_notifications', 'deleted_at', false),
      ('in_app_notifications', 'created_at', true),
      ('in_app_notifications', 'updated_at', true)
    ) as columns_to_convert(table_name, column_name, needs_default)
  loop
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = timestamp_column.table_name
        and column_name = timestamp_column.column_name
        and data_type = 'timestamp with time zone'
    ) then
      execute format(
        'alter table %I alter column %I drop default',
        timestamp_column.table_name,
        timestamp_column.column_name
      );
      execute format(
        'alter table %I alter column %I type bigint using (extract(epoch from %I) * 1000)::bigint',
        timestamp_column.table_name,
        timestamp_column.column_name,
        timestamp_column.column_name
      );
      if timestamp_column.needs_default then
        execute format(
          'alter table %I alter column %I set default (extract(epoch from now()) * 1000)::bigint',
          timestamp_column.table_name,
          timestamp_column.column_name
        );
      end if;
    end if;
  end loop;
end $$;

create index if not exists plans_user_updated_idx on plans(user_id, updated_at desc);
create index if not exists study_blocks_user_date_idx on study_blocks(user_id, date, start_time);
create index if not exists focus_sessions_user_start_idx on focus_sessions(user_id, start_time desc);
create index if not exists notifications_user_created_idx on in_app_notifications(user_id, created_at desc);

alter table plans enable row level security;
alter table study_blocks enable row level security;
alter table focus_sessions enable row level security;
alter table in_app_notifications enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'plans' and policyname = 'own plans select') then
    create policy "own plans select" on plans for select using (auth.uid() = user_id);
    create policy "own plans insert" on plans for insert with check (auth.uid() = user_id);
    create policy "own plans update" on plans for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'study_blocks' and policyname = 'own blocks select') then
    create policy "own blocks select" on study_blocks for select using (auth.uid() = user_id);
    create policy "own blocks insert" on study_blocks for insert with check (auth.uid() = user_id);
    create policy "own blocks update" on study_blocks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'focus_sessions' and policyname = 'own focus select') then
    create policy "own focus select" on focus_sessions for select using (auth.uid() = user_id);
    create policy "own focus insert" on focus_sessions for insert with check (auth.uid() = user_id);
    create policy "own focus update" on focus_sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'in_app_notifications' and policyname = 'own notifications select') then
    create policy "own notifications select" on in_app_notifications for select using (auth.uid() = user_id);
    create policy "own notifications insert" on in_app_notifications for insert with check (auth.uid() = user_id);
    create policy "own notifications update" on in_app_notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- A stale device must not overwrite a newer revision during an upsert.
create or replace function ese_keep_newest_revision()
returns trigger
language plpgsql
as $$
begin
  if coalesce(new.revision, 0) < coalesce(old.revision, 0) then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists plans_revision_guard on plans;
create trigger plans_revision_guard before update on plans for each row execute function ese_keep_newest_revision();
drop trigger if exists study_blocks_revision_guard on study_blocks;
create trigger study_blocks_revision_guard before update on study_blocks for each row execute function ese_keep_newest_revision();
drop trigger if exists focus_sessions_revision_guard on focus_sessions;
create trigger focus_sessions_revision_guard before update on focus_sessions for each row execute function ese_keep_newest_revision();
drop trigger if exists notifications_revision_guard on in_app_notifications;
create trigger notifications_revision_guard before update on in_app_notifications for each row execute function ese_keep_newest_revision();

-- 3) schedule the Edge Function at each study slot (times in UTC; IST = UTC+5:30)
--    8:30 IST = 03:00 UTC · 11:00 IST = 05:30 UTC · 15:00 IST = 09:30 UTC
--    18:30 IST = 13:00 UTC · 21:30 IST = 16:00 UTC
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- !!! REPLACE <CRON_SECRET> below with the same secret you set on the Edge Function
select cron.schedule('slot1', '0 3 * * *',  $$select net.http_get('https://vfpyymmpenitljeobwot.supabase.co/functions/v1/slot-push?secret=<CRON_SECRET>')$$);
select cron.schedule('slot2', '30 5 * * *', $$select net.http_get('https://vfpyymmpenitljeobwot.supabase.co/functions/v1/slot-push?secret=<CRON_SECRET>')$$);
select cron.schedule('slot3', '30 9 * * *', $$select net.http_get('https://vfpyymmpenitljeobwot.supabase.co/functions/v1/slot-push?secret=<CRON_SECRET>')$$);
select cron.schedule('slot4', '0 13 * * *', $$select net.http_get('https://vfpyymmpenitljeobwot.supabase.co/functions/v1/slot-push?secret=<CRON_SECRET>')$$);
select cron.schedule('slot5', '0 16 * * *', $$select net.http_get('https://vfpyymmpenitljeobwot.supabase.co/functions/v1/slot-push?secret=<CRON_SECRET>')$$);
