-- ESE2027 Study OS — heal row-level security policies.
-- Run ONCE in Supabase Dashboard → SQL Editor → paste → Run.
--
-- Fixes the "new row violates row-level security policy for table X" error by
-- dropping and recreating every policy on the 5 sync tables. This works no
-- matter what state the tables are in (policies missing, half-created, or
-- created with a different name/condition).

do $$
declare
  t text;
  p text;
begin
  foreach t in array array['plans','study_blocks','focus_sessions','in_app_notifications','user_progress'] loop
    execute format('alter table %I enable row level security', t);
    foreach p in array array['select','insert','update','delete'] loop
      execute format('drop policy if exists "own %s %s" on %I', t, p, t);
    end loop;
  end loop;
end $$;

create policy "own plans select" on plans for select using (auth.uid() = user_id);
create policy "own plans insert" on plans for insert with check (auth.uid() = user_id);
create policy "own plans update" on plans for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own plans delete" on plans for delete using (auth.uid() = user_id);

create policy "own study_blocks select" on study_blocks for select using (auth.uid() = user_id);
create policy "own study_blocks insert" on study_blocks for insert with check (auth.uid() = user_id);
create policy "own study_blocks update" on study_blocks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own study_blocks delete" on study_blocks for delete using (auth.uid() = user_id);

create policy "own focus_sessions select" on focus_sessions for select using (auth.uid() = user_id);
create policy "own focus_sessions insert" on focus_sessions for insert with check (auth.uid() = user_id);
create policy "own focus_sessions update" on focus_sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own focus_sessions delete" on focus_sessions for delete using (auth.uid() = user_id);

create policy "own in_app_notifications select" on in_app_notifications for select using (auth.uid() = user_id);
create policy "own in_app_notifications insert" on in_app_notifications for insert with check (auth.uid() = user_id);
create policy "own in_app_notifications update" on in_app_notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own in_app_notifications delete" on in_app_notifications for delete using (auth.uid() = user_id);

create policy "own user_progress select" on user_progress for select using (auth.uid() = user_id);
create policy "own user_progress insert" on user_progress for insert with check (auth.uid() = user_id);
create policy "own user_progress update" on user_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own user_progress delete" on user_progress for delete using (auth.uid() = user_id);