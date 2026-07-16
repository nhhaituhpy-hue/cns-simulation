-- VOR is intentionally isolated from the ADS-B scenario schema.
-- The permissive policies are for the current internal MVP only.

create table if not exists public.vor_scenarios (
  id text primary key,
  title text not null,
  description text not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  prompt text not null,
  overrides jsonb not null default '[]'::jsonb,
  expected_checkpoints jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists vor_scenarios_created_at_idx
  on public.vor_scenarios (created_at desc);

create table if not exists public.vor_submissions (
  id text primary key,
  scenario_id text not null references public.vor_scenarios(id) on delete cascade,
  student_name text not null,
  student_code text not null,
  status text not null check (status in ('draft', 'submitted', 'reviewed')),
  started_at timestamptz not null,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  events jsonb not null default '[]'::jsonb,
  answer jsonb not null default '{}'::jsonb,
  score numeric check (score is null or (score >= 0 and score <= 100)),
  examiner_comment text
);

create index if not exists vor_submissions_scenario_idx
  on public.vor_submissions (scenario_id, submitted_at desc);
create index if not exists vor_submissions_status_idx
  on public.vor_submissions (status, submitted_at desc);

alter table public.vor_scenarios enable row level security;
alter table public.vor_submissions enable row level security;

revoke all on table public.vor_scenarios from anon, authenticated;
revoke all on table public.vor_submissions from anon, authenticated;
grant select, insert, update, delete on table public.vor_scenarios to anon, authenticated;
grant select, insert, update, delete on table public.vor_submissions to anon, authenticated;

drop policy if exists "temporary public manage vor scenarios" on public.vor_scenarios;
create policy "temporary public manage vor scenarios"
  on public.vor_scenarios for all to anon, authenticated
  using (true) with check (true);

drop policy if exists "temporary public manage vor submissions" on public.vor_submissions;
create policy "temporary public manage vor submissions"
  on public.vor_submissions for all to anon, authenticated
  using (true) with check (true);
