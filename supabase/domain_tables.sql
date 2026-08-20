-- ESE2027 Study OS — domain tables for Android outbox sync.
-- Run ONCE in Supabase Dashboard → SQL Editor → paste → Run.
--
-- Creates the 4 normalized domain tables the native client's durable outbox
-- writes to (plans, study_blocks, focus_sessions, in_app_notifications).
-- Without these, SyncWorker retries forever with:
--   "Could not find the table 'public.<name>' in the schema cache"
--
-- user_progress already exists in this project, so it is not recreated here.

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

create index if not exists plans_user_updated_idx on plans(user_id, updated_at desc);
create index if not exists study_blocks_user_date_idx on study_blocks(user_id, date, start_time);
create index if not exists focus_sessions_user_start_idx on focus_sessions(user_id, start_time desc);
create index if not exists notifications_user_created_idx on in_app_notifications(user_id, created_at desc);

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