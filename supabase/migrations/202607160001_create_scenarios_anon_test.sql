-- Temporary testing policy: anonymous visitors can manage all scenarios.
-- Replace these policies with authenticated/role-based policies before production use.

create table if not exists public.scenarios (
  id text primary key,
  title text not null,
  description text not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  sites_json text not null,
  target_sensor_id text not null,
  target_login_user text not null check (target_login_user in ('sysadmin', 'maintenance')),
  expected_actions_json text not null,
  created_at text not null,
  updated_at text
);

create index if not exists scenarios_created_at_idx
  on public.scenarios (created_at desc);

alter table public.scenarios enable row level security;

revoke all on table public.scenarios from anon, authenticated;
grant select, insert, update, delete on table public.scenarios to anon, authenticated;

drop policy if exists "temporary public read scenarios" on public.scenarios;
create policy "temporary public read scenarios"
  on public.scenarios for select
  to anon, authenticated
  using (true);

drop policy if exists "temporary public create scenarios" on public.scenarios;
create policy "temporary public create scenarios"
  on public.scenarios for insert
  to anon, authenticated
  with check (true);

drop policy if exists "temporary public update scenarios" on public.scenarios;
create policy "temporary public update scenarios"
  on public.scenarios for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "temporary public delete scenarios" on public.scenarios;
create policy "temporary public delete scenarios"
  on public.scenarios for delete
  to anon, authenticated
  using (true);
