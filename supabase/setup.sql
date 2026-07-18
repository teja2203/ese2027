-- ESE2027 push setup — run once in Supabase SQL Editor
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

-- 2) schedule the Edge Function at each study slot (times in UTC; IST = UTC+5:30)
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
